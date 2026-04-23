"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase-browser"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [loadingLogin, setLoadingLogin] = useState(false)
  const [loadingCadastro, setLoadingCadastro] = useState(false)
  const [erro, setErro] = useState("")
  const [mensagem, setMensagem] = useState("")

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro("")
    setMensagem("")
    setLoadingLogin(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      })

      if (error) {
        throw new Error(error.message)
      }

      router.push("/")
      router.refresh()
    } catch (error) {
      console.error(error)
      setErro(error instanceof Error ? error.message : "Não foi possível fazer login.")
    } finally {
      setLoadingLogin(false)
    }
  }

  async function handleCadastro() {
    setErro("")
    setMensagem("")
    setLoadingCadastro(true)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          emailRedirectTo: "https://provasecret.vercel.app",
        },
      })

      if (error) {
        throw new Error(error.message)
      }

      setMensagem(
        "Conta criada com sucesso. Verifique seu e-mail para confirmar o cadastro, se necessário."
      )
    } catch (error) {
      console.error(error)
      setErro(error instanceof Error ? error.message : "Não foi possível criar a conta.")
    } finally {
      setLoadingCadastro(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090909] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]">
        <div className="h-full w-full bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.22),transparent_28%),linear-gradient(to_bottom,transparent,rgba(255,255,255,0.02))]" />
      </div>

      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative mx-auto flex min-h-screen max-w-md items-center px-6 py-10">
        <div className="w-full overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/85 p-6 shadow-2xl backdrop-blur-sm">
          <div className="mb-6">
            <div className="mb-4 inline-block rotate-[-4deg] rounded-sm border-4 border-red-700 px-4 py-2">
              <span className="text-2xl font-black uppercase tracking-[0.16em] text-red-600">
                Confidencial
              </span>
            </div>

            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
              acesso restrito
            </p>

            <h1 className="mt-3 text-3xl font-black uppercase tracking-tight text-white">
              Entrar no
              <span className="block text-red-500">Prova Secreta</span>
            </h1>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Faça login para acessar sua área restrita, gerar simulações e consultar
              seu histórico.
            </p>

            <p className="mt-3 text-xs uppercase tracking-[0.28em] text-red-500">
              não compartilhe. apenas use.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                E-mail
              </label>
              <input
                type="email"
                placeholder="seuemail@exemplo.com"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Senha
              </label>
              <input
                type="password"
                placeholder="Digite sua senha"
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loadingLogin}
              className="w-full rounded-2xl border border-red-700 bg-red-700 px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-red-600 disabled:opacity-50"
            >
              {loadingLogin ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleCadastro}
            disabled={loadingCadastro}
            className="mt-3 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-red-500/50 hover:bg-red-500/10 disabled:opacity-50"
          >
            {loadingCadastro ? "Criando conta..." : "Criar conta"}
          </button>

          {erro && (
            <div className="mt-4 rounded-2xl border border-red-700/40 bg-red-950/40 p-4 text-sm text-red-200">
              {erro}
            </div>
          )}

          {mensagem && (
            <div className="mt-4 rounded-2xl border border-emerald-700/30 bg-emerald-950/30 p-4 text-sm text-emerald-200">
              {mensagem}
            </div>
          )}

          <div className="mt-6 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-sm uppercase tracking-[0.14em] text-zinc-400 transition hover:text-red-400"
            >
              ← Voltar para a página inicial
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}