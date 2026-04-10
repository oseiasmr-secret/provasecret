import OpenAI from "openai"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { supabaseServer } from "@/lib/supabase-server"

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

type Payload = {
  professor: string
  escolaFaculdade: string
  disciplina: string
  serie: string
  conteudo: string
  quantidadeQuestoes: number
  nivel?: string
}

function validarPayload(data: Partial<Payload>) {
  if (!data.professor?.trim()) return "Professor é obrigatório."
  if (!data.escolaFaculdade?.trim()) return "Escola/Faculdade é obrigatória."
  if (!data.disciplina?.trim()) return "Disciplina é obrigatória."
  if (!data.serie?.trim()) return "Série/Turma é obrigatória."
  if (!data.conteudo?.trim()) return "Conteúdo é obrigatório."

  const qtd = Number(data.quantidadeQuestoes)
  if (!Number.isFinite(qtd) || qtd < 1 || qtd > 20) {
    return "Quantidade de questões deve estar entre 1 e 20."
  }

  return null
}

function montarPrompt(body: Payload) {
  return `
Você é um elaborador especializado em avaliações educacionais.

Gere um simulado completo em português do Brasil com estas informações:

Professor: ${body.professor}
Escola/Faculdade: ${body.escolaFaculdade}
Disciplina: ${body.disciplina}
Série/Turma: ${body.serie}
Conteúdo: ${body.conteudo}
Quantidade de questões: ${body.quantidadeQuestoes}
Nível: ${body.nivel ?? "medio"}

Requisitos obrigatórios:
- Produza exatamente ${body.quantidadeQuestoes} questões.
- Gere questões inéditas e coerentes com o conteúdo informado.
- Apresente enunciado completo para cada questão.
- Cada questão deve ter 5 alternativas: A, B, C, D e E.
- Não coloque o gabarito logo abaixo da questão.
- Ao final do documento, crie uma seção separada chamada GABARITO.
- Na seção GABARITO, liste apenas:
  1) X
  2) Y
- Não inclua comentários nem explicações.
- Entregue apenas a prova final.

Estrutura desejada:

SIMULADO
Professor: ...
Escola/Faculdade: ...
Disciplina: ...
Série/Turma: ...
Conteúdo: ...
Nível: ...

1) Enunciado...
A) ...
B) ...
C) ...
D) ...
E) ...

2) Enunciado...
A) ...
B) ...
C) ...
D) ...
E) ...

GABARITO
1) X
2) Y
  `.trim()
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não configurada no .env.local." },
        { status: 500 }
      )
    }

    const body = (await request.json()) as Partial<Payload>

    const erro = validarPayload(body)
    if (erro) {
      return NextResponse.json({ error: erro }, { status: 400 })
    }

    const authHeader = request.headers.get("authorization")

        if (!authHeader?.startsWith("Bearer ")) {
          return NextResponse.json(
           { error: "Usuário não autenticado." },
          { status: 401 }
           )
        }

    const token = authHeader.replace("Bearer ", "").trim()

    const {
       data: { user },
       error: userError,
     } = await supabaseServer.auth.getUser(token)

       if (userError || !user) {
         return NextResponse.json(
         { error: "Sessão inválida ou expirada." },
         { status: 401 }
          )
       }
let { data: profile, error: profileError } = await supabaseAdmin
  .from("profiles")
  .select("id, creditos_prova")
  .eq("id", user.id)
  .maybeSingle()

if (profileError) {
  console.error("Erro ao buscar profile:", profileError)
  return NextResponse.json(
    { error: "Não foi possível verificar o perfil do usuário." },
    { status: 500 }
  )
}

if (!profile) {
  const { data: createdProfile, error: createProfileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: user.id,
      creditos_prova: 0,
    })
    .select("id, creditos_prova")
    .single()

  if (createProfileError || !createdProfile) {
    console.error("Erro ao criar profile:", createProfileError)
    return NextResponse.json(
      { error: "Não foi possível criar o perfil do usuário." },
      { status: 500 }
    )
  }

  profile = createdProfile
}

const inicioHoje = new Date()
inicioHoje.setHours(0, 0, 0, 0)

const fimHoje = new Date()
fimHoje.setHours(23, 59, 59, 999)

const { count, error: countError } = await supabaseAdmin
  .from("simulados")
  .select("id", { count: "exact", head: true })
  .eq("user_id", user.id)
  .gte("created_at", inicioHoje.toISOString())
  .lte("created_at", fimHoje.toISOString())

if (countError) {
  console.error("Erro ao verificar limite diário:", countError)

  return NextResponse.json(
    { error: "Não foi possível verificar o limite diário." },
    { status: 500 }
  )
}

const provasHoje = count ?? 0
let consumiuCredito = false

if (provasHoje >= 1) {
  if ((profile.creditos_prova ?? 0) <= 0) {
    return NextResponse.json(
      {
        error: "Você já utilizou sua prova gratuita de hoje. Compre 1 prova extra para continuar.",
      },
      { status: 403 }
    )
  }

  const { error: debitError } = await supabaseAdmin
    .from("profiles")
    .update({
      creditos_prova: profile.creditos_prova - 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (debitError) {
    console.error("Erro ao consumir crédito:", debitError)
    return NextResponse.json(
      { error: "Não foi possível consumir o crédito." },
      { status: 500 }
    )
  }

  consumiuCredito = true
}
    const payload: Payload = {
      professor: body.professor!,
      escolaFaculdade: body.escolaFaculdade!,
      disciplina: body.disciplina!,
      serie: body.serie!,
      conteudo: body.conteudo!,
      quantidadeQuestoes: Number(body.quantidadeQuestoes),
      nivel: body.nivel ?? "medio",
    }

    const response = await client.responses.create({
      model: "gpt-5.4",
      input: montarPrompt(payload),
    })

    const simuladoTexto = response.output_text?.trim()

    if (!simuladoTexto) {
      return NextResponse.json(
        { error: "A OpenAI não retornou texto para o simulado." },
        { status: 502 }
      )
    }

    const { data: registro, error: insertError } = await supabaseAdmin
      .from("simulados")
      .insert({
        user_id: user.id,
        professor: payload.professor,
        escola_faculdade: payload.escolaFaculdade,
        disciplina: payload.disciplina,
        serie: payload.serie,
        conteudo: payload.conteudo,
        quantidade_questoes: payload.quantidadeQuestoes,
        nivel: payload.nivel,
        texto_simulado: simuladoTexto,
      })
      .select("id, created_at")
      .single()

    if (insertError) {
      console.error("Erro ao salvar no Supabase:", insertError)

      return NextResponse.json(
        { error: "Simulado gerado, mas não foi possível salvar no banco." },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        simulado: simuladoTexto,
        registroId: registro.id,
        createdAt: registro.created_at,
        meta: {
          professor: payload.professor,
          escolaFaculdade: payload.escolaFaculdade,
          disciplina: payload.disciplina,
          serie: payload.serie,
          conteudo: payload.conteudo,
          quantidadeQuestoes: payload.quantidadeQuestoes,
          nivel: payload.nivel,
          criadoEm: registro.created_at,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Erro na rota /api/gerar:", error)

    return NextResponse.json(
      {
        error: "Não foi possível gerar o simulado com a OpenAI.",
      },
      { status: 500 }
    )
  }
}