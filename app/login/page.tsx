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
          emailRedirectTo: "https://provasecret.vercel.app/auth/callback",
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
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6 py-10">
        <div className="w-full rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Entrar no Prova Secreta</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Faça login para gerar provas, salvar seu histórico e comprar provas extras.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">E-mail</label>
              <input
                type="email"
                placeholder="seuemail@exemplo.com"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Senha</label>
              <input
                type="password"
                placeholder="Digite sua senha"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loadingLogin}
              className="w-full rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
            >
              {loadingLogin ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleCadastro}
            disabled={loadingCadastro}
            className="mt-3 w-full rounded-xl border border-neutral-300 px-4 py-2 disabled:opacity-50"
          >
            {loadingCadastro ? "Criando conta..." : "Criar conta"}
          </button>

          {erro && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {erro}
            </div>
          )}

          {mensagem && (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              {mensagem}
            </div>
          )}

          <div className="mt-6 border-t border-neutral-200 pt-4">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-sm text-neutral-600 underline"
            >
              Voltar para a página inicial
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}