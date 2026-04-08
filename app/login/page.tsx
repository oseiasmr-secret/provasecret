"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase-browser"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) {
      setErro(error.message)
    } else {
      router.push("/")
    }

    setLoading(false)
  }

  async function handleRegister() {
    setLoading(true)
    setErro("")

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
    })

    if (error) {
      setErro(error.message)
    } else {
      alert("Conta criada! Faça login.")
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleLogin} className="space-y-4 p-6 border rounded-xl">
        <h1 className="text-xl font-bold">Login</h1>

        <input
          type="email"
          placeholder="Email"
          className="border px-3 py-2 w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          className="border px-3 py-2 w-full"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        <button className="bg-black text-white px-4 py-2 w-full">
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <button
          type="button"
          onClick={handleRegister}
          className="border px-4 py-2 w-full"
        >
          Criar conta
        </button>

        {erro && <p className="text-red-600 text-sm">{erro}</p>}
      </form>
    </main>
  )
}