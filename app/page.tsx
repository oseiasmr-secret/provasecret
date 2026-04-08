"use client"
import { supabase } from "@/lib/supabase-browser"
import { useEffect, useMemo, useState } from "react"
import { carregarHistorico, limparHistorico, salvarNoHistorico } from "@/lib/history"
import type { SimuladoGerado } from "@/types/simulado"

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
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erroHistorico, setErroHistorico] = useState("")
  const [erroGeracao, setErroGeracao] = useState("")
  const [historico, setHistorico] = useState<SimuladoGerado[]>([])
  const [form, setForm] = useState<FormData>(initialForm)
  const [simuladoGerado, setSimuladoGerado] = useState<string>("")

  useEffect(() => {
    setMounted(true)

    try {
      const data = carregarHistorico()
      setHistorico(data)
      setErroHistorico("")
    } catch (error) {
      console.error(error)
      setErroHistorico("Erro ao carregar histórico.")
    }
  }, [])

  function updateField<K extends keyof FormData>(field: K, value: FormData[K]) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
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

      setSimuladoGerado(data.simulado)

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

  function handleLimparHistorico() {
    limparHistorico()
    setHistorico([])
  }

  const totalCarregado = useMemo(() => historico.length, [historico])

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Prova Secreta</h1>
          <p className="mt-2 text-sm text-neutral-600">
            MVP para geração de simulados com histórico recente.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Gerar novo simulado</h2>

            <form onSubmit={handleGerarSimulado} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Professor</label>
                <input
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none"
                  value={form.professor}
                  onChange={(e) => updateField("professor", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Escola/Faculdade</label>
                <input
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none"
                  value={form.escolaFaculdade}
                  onChange={(e) => updateField("escolaFaculdade", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Disciplina</label>
                <input
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none"
                  value={form.disciplina}
                  onChange={(e) => updateField("disciplina", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Série/Turma</label>
                <input
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none"
                  value={form.serie}
                  onChange={(e) => updateField("serie", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Conteúdo</label>
                <textarea
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none"
                  rows={4}
                  value={form.conteudo}
                  onChange={(e) => updateField("conteudo", e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Quantidade de questões</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none"
                  value={form.quantidadeQuestoes}
                  onChange={(e) => updateField("quantidadeQuestoes", Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Nível</label>
                <select
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none"
                  value={form.nivel}
                  onChange={(e) => updateField("nivel", e.target.value)}
                >
                  <option value="facil">Fácil</option>
                  <option value="medio">Médio</option>
                  <option value="dificil">Difícil</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
              >
                {loading ? "Gerando..." : "Gerar simulado"}
              </button>
            </form>

            {erroGeracao && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {erroGeracao}
              </div>
            )}

            {simuladoGerado && (
              <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <h3 className="mb-2 font-semibold">Resultado</h3>
                <pre className="whitespace-pre-wrap text-sm">{simuladoGerado}</pre>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Histórico recente
                </p>
                <h2 className="text-xl font-semibold">Últimos simulados gerados</h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Total carregado: {mounted ? totalCarregado : 0}
                </p>
              </div>

              <button
                type="button"
                onClick={handleLimparHistorico}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                Limpar
              </button>
            </div>

            {!mounted ? (
              <p className="text-sm text-neutral-500">Carregando histórico...</p>
            ) : erroHistorico ? (
              <p className="text-sm text-red-600">{erroHistorico}</p>
            ) : historico.length === 0 ? (
              <p className="text-sm text-neutral-500">Nenhum simulado gerado ainda.</p>
            ) : (
              <div className="space-y-3">
                {historico.map((item) => (
                  <article key={item.id} className="rounded-xl border border-neutral-200 p-4">
                    <h3 className="font-semibold">
                      {item.disciplina} — {item.serie}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-700">
                      <strong>Professor:</strong> {item.professor}
                    </p>
                    <p className="text-sm text-neutral-700">
                      <strong>Escola/Faculdade:</strong> {item.escolaFaculdade}
                    </p>
                    <p className="text-sm text-neutral-700">
                      <strong>Conteúdo:</strong> {item.conteudo}
                    </p>
                    <p className="text-sm text-neutral-700">
                      <strong>Questões:</strong> {item.quantidadeQuestoes}
                    </p>
                    <p className="mt-2 text-xs text-neutral-500">
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