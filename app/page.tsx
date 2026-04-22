"use client"

import { gerarProvaPDF } from "@/lib/pdf/gerarProvaPDF"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { carregarHistorico, limparHistorico, salvarNoHistorico } from "@/lib/history"
import type { SimuladoGerado } from "@/types/simulado"
import { supabase } from "@/lib/supabase-browser"

type FormData = {
  professor: string
  escolaFaculdade: string
  disciplina: string
  serie: string
  conteudo: string
  quantidadeQuestoes: number
  nivel: string
}

const initialForm: FormData = {
  professor: "",
  escolaFaculdade: "",
  disciplina: "",
  serie: "",
  conteudo: "",
  quantidadeQuestoes: 10,
  nivel: "medio",
}

export default function Page() {
  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [comprando, setComprando] = useState(false)
  const [erroHistorico, setErroHistorico] = useState("")
  const [erroGeracao, setErroGeracao] = useState("")
  const [historico, setHistorico] = useState<SimuladoGerado[]>([])
  const [form, setForm] = useState<FormData>(initialForm)
  const [simuladoGerado, setSimuladoGerado] = useState<string>("")
  const [usuario, setUsuario] = useState<{
    id: string
    email: string | null
  } | null>(null)

  useEffect(() => {
    setMounted(true)

    async function init() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          setUsuario({
            id: session.user.id,
            email: session.user.email ?? null,
          })
        } else {
          setUsuario(null)
        }

        const data = carregarHistorico()
        setHistorico(data)
        setErroHistorico("")
      } catch (error) {
        console.error(error)
        setErroHistorico("Erro ao carregar histórico.")
      }
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUsuario({
          id: session.user.id,
          email: session.user.email ?? null,
        })
      } else {
        setUsuario(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  function updateField<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUsuario(null)
    router.push("/login")
  }

  async function handleGerarSimulado(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErroGeracao("")

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setErroGeracao("Você precisa estar logado para gerar um simulado.")
        setLoading(false)
        return
      }

      const response = await fetch("/api/gerar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(form),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "Erro ao gerar simulado.")
      }

      setSimuladoGerado(data.simulado || "")

      const novoRegistro: SimuladoGerado = {
        id: crypto.randomUUID(),
        professor: data.meta.professor,
        escolaFaculdade: data.meta.escolaFaculdade,
        disciplina: data.meta.disciplina,
        serie: data.meta.serie,
        conteudo: data.meta.conteudo,
        quantidadeQuestoes: data.meta.quantidadeQuestoes,
        nivel: data.meta.nivel,
        criadoEm: data.meta.criadoEm,
      }

      salvarNoHistorico(novoRegistro)

      const atualizado = carregarHistorico()
      setHistorico(atualizado)
      setErroHistorico("")
    } catch (error) {
      console.error(error)
      setErroGeracao(
        error instanceof Error ? error.message : "Ocorreu um erro ao gerar o simulado."
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleComprarProvaExtra() {
    try {
      setComprando(true)
      setErroGeracao("")

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setErroGeracao("Você precisa estar logado para comprar uma prova extra.")
        return
      }

      const ensureResponse = await fetch("/api/profile/ensure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const ensureData = await ensureResponse.json().catch(() => ({}))
      console.log("ensureResponse ok:", ensureResponse.ok)
      console.log("ensureResponse data:", ensureData)

      if (!ensureResponse.ok) {
        throw new Error(
          ensureData?.error || "Não foi possível verificar o perfil do usuário."
        )
      }

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json().catch(() => ({}))

      console.log("checkout response ok:", response.ok)
      console.log("checkout response status:", response.status)
      console.log("checkout response data:", data)

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível iniciar o pagamento.")
      }

      if (!data || typeof data !== "object") {
        throw new Error("A resposta do checkout veio em formato inválido.")
      }

      if (!("url" in data)) {
        throw new Error("A resposta do checkout não trouxe o campo url.")
      }

      if (typeof data.url !== "string" || !data.url.trim()) {
        throw new Error(`URL do checkout inválida: ${String(data.url)}`)
      }

      console.log("Redirecionando para:", data.url)
      window.location.href = data.url
    } catch (error) {
      console.error("Erro ao iniciar checkout:", error)

      setErroGeracao(
        error instanceof Error ? error.message : "Erro ao iniciar pagamento."
      )
    } finally {
      setComprando(false)
    }
  }

  function handleLimparHistorico() {
    limparHistorico()
    setHistorico([])
  }

  const totalCarregado = useMemo(() => historico.length, [historico])

  return (
    <main className="min-h-screen bg-[#090909] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 opacity-[0.08]">
        <div className="h-full w-full bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.22),transparent_28%),linear-gradient(to_bottom,transparent,rgba(255,255,255,0.02))]" />
      </div>

      <div className="pointer-events-none fixed inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative mx-auto max-w-7xl px-6 py-10">
        <header className="mb-8 overflow-hidden rounded-3xl border border-white/10 bg-black/50 p-6 shadow-2xl backdrop-blur-sm">
          <div className="mb-4 inline-block rotate-[-4deg] rounded-sm border-4 border-red-700 px-4 py-2">
            <span className="text-3xl font-black uppercase tracking-[0.16em] text-red-600 sm:text-4xl">
              Confidencial
            </span>
          </div>

          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
              acesso restrito
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">
              Prova Secreta
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
              Simulações baseadas no padrão do professor. Interface restrita para quem
              quer estudar com mais estratégia, antecedência e vantagem.
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.28em] text-red-500">
              não compartilhe. apenas use.
            </p>
          </div>
        </header>

        <div className="mb-6 rounded-3xl border border-red-900/40 bg-zinc-950/80 p-4 shadow-xl backdrop-blur-sm">
          {usuario ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                  sessão ativa
                </p>
                <p className="mt-1 text-sm font-semibold text-white">Usuário autorizado</p>
                <p className="text-sm text-zinc-400">{usuario.email}</p>
                <p className="text-xs text-zinc-600">ID: {usuario.id}</p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition hover:border-red-500/50 hover:bg-red-500/10"
                >
                  Sair
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                  acesso bloqueado
                </p>
                <p className="mt-1 text-sm font-semibold text-white">Você não está logado</p>
                <p className="text-sm text-zinc-400">
                  Entre na sua conta para localizar simulações e salvar seu histórico.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="rounded-xl border border-red-700 bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                >
                  Entrar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-2xl backdrop-blur-sm">
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                rastreamento
              </p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">
                Buscar avaliação
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Preencha os dados abaixo para localizar uma simulação compatível.
              </p>
            </div>

            <form onSubmit={handleGerarSimulado} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Professor
                </label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  value={form.professor}
                  onChange={(e) => updateField("professor", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Escola / Faculdade
                </label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  value={form.escolaFaculdade}
                  onChange={(e) => updateField("escolaFaculdade", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Disciplina
                </label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  value={form.disciplina}
                  onChange={(e) => updateField("disciplina", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Série / Turma
                </label>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  value={form.serie}
                  onChange={(e) => updateField("serie", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Conteúdo
                </label>
                <textarea
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  rows={4}
                  value={form.conteudo}
                  onChange={(e) => updateField("conteudo", e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Quantidade de questões
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    value={form.quantidadeQuestoes}
                    onChange={(e) =>
                      updateField("quantidadeQuestoes", Number(e.target.value))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Nível
                  </label>
                  <select
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    value={form.nivel}
                    onChange={(e) => updateField("nivel", e.target.value)}
                  >
                    <option value="facil">Fácil</option>
                    <option value="medio">Médio</option>
                    <option value="dificil">Difícil</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !usuario}
                className="w-full rounded-2xl border border-red-700 bg-red-700 px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Rastreando prova..."
                  : usuario
                  ? "Buscar provas"
                  : "Faça login para continuar"}
              </button>
            </form>

            {erroGeracao && (
              <div className="mt-4 rounded-2xl border border-red-700/40 bg-red-950/40 p-4 text-sm text-red-200">
                <p>{erroGeracao}</p>

                {erroGeracao.includes("logado") && (
                  <button
                    type="button"
                    onClick={() => router.push("/login")}
                    className="mt-3 rounded-xl border border-red-700 bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                  >
                    Ir para login
                  </button>
                )}

                {erroGeracao.includes("prova gratuita de hoje") && (
                  <button
                    type="button"
                    onClick={handleComprarProvaExtra}
                    disabled={comprando}
                    className="mt-3 rounded-xl border border-red-700 bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                  >
                    {comprando ? "Redirecionando..." : "Comprar 1 prova extra"}
                  </button>
                )}
              </div>
            )}

            {simuladoGerado && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                      resultado localizado
                    </p>
                    <h3 className="mt-1 text-lg font-black uppercase text-white">
                      Simulação gerada
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      gerarProvaPDF({
                        titulo: "Prova Secreta",
                        simuladoTexto: simuladoGerado,
                        nomeArquivo: `prova-${form.disciplina || "simulado"}.pdf`,
                      })
                    }
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-500/50 hover:bg-red-500/10"
                  >
                    Baixar PDF
                  </button>
                </div>

                <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-zinc-950 p-4 text-sm leading-6 text-zinc-200">
                  {simuladoGerado}
                </pre>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-white/10 bg-zinc-950/80 p-6 shadow-2xl backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                  histórico recente
                </p>
                <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">
                  Últimas provas
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Total carregado: {mounted ? totalCarregado : 0}
                </p>
              </div>

              <button
                type="button"
                onClick={handleLimparHistorico}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-zinc-200 transition hover:border-red-500/50 hover:bg-red-500/10"
              >
                Limpar
              </button>
            </div>

            {!mounted ? (
              <p className="text-sm text-zinc-500">Carregando histórico...</p>
            ) : erroHistorico ? (
              <p className="text-sm text-red-400">{erroHistorico}</p>
            ) : historico.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/30 p-5 text-sm text-zinc-500">
                Nenhuma prova localizada ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {historico.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-black/30 p-4 transition hover:border-red-500/30"
                  >
                    <h3 className="font-bold text-white">
                      {item.disciplina} — {item.serie}
                    </h3>
                    <p className="mt-2 text-sm text-zinc-300">
                      <strong className="text-zinc-100">Professor:</strong> {item.professor}
                    </p>
                    <p className="text-sm text-zinc-300">
                      <strong className="text-zinc-100">Escola/Faculdade:</strong>{" "}
                      {item.escolaFaculdade}
                    </p>
                    <p className="text-sm text-zinc-300">
                      <strong className="text-zinc-100">Conteúdo:</strong> {item.conteudo}
                    </p>
                    <p className="text-sm text-zinc-300">
                      <strong className="text-zinc-100">Questões:</strong>{" "}
                      {item.quantidadeQuestoes}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.12em] text-zinc-500">
                      Gerado em: {new Date(item.criadoEm).toLocaleString("pt-BR")}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}