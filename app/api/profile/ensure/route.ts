import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function GET() {
  return NextResponse.json({ ok: true, route: "profile/ensure" })
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization")

  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Usuário não autenticado." }, { status: 401 })
  }

  const token = authHeader.replace("Bearer ", "").trim()

  const {
    data: { user },
    error: userError,
  } = await supabaseServer.auth.getUser(token)

  if (userError || !user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 })
  }

  const { data: existing, error: selectError } = await supabaseAdmin
    .from("profiles")
    .select("id, creditos_prova")
    .eq("id", user.id)
    .maybeSingle()

  if (selectError) {
    return NextResponse.json({ error: "Erro ao verificar profile." }, { status: 500 })
  }

  if (!existing) {
    const { error: insertError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: user.id,
        creditos_prova: 0,
      })

    if (insertError) {
      return NextResponse.json({ error: "Erro ao criar profile." }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}