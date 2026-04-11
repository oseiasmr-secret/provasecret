import { NextResponse } from "next/server"
import Stripe from "stripe"
import { supabaseServer } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY não configurada.")
}

const stripe = new Stripe(stripeSecretKey)

const VALOR_PROVA_CENTAVOS = 490 // R$ 4,90

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  try {
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
      console.error("Erro ao validar usuário:", userError)
      return NextResponse.json(
        { error: "Sessão inválida." },
        { status: 401 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()

    if (!appUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_APP_URL não configurada." },
        { status: 500 }
      )
    }

    if (!isValidHttpUrl(appUrl)) {
      console.error("NEXT_PUBLIC_APP_URL inválida:", appUrl)
      return NextResponse.json(
        { error: "NEXT_PUBLIC_APP_URL inválida." },
        { status: 500 }
      )
    }

    const successUrl = `${appUrl}/?pagamento=sucesso`
    const cancelUrl = `${appUrl}/?pagamento=cancelado`

    if (!isValidHttpUrl(successUrl) || !isValidHttpUrl(cancelUrl)) {
      console.error("URLs de retorno inválidas:", { successUrl, cancelUrl })
      return NextResponse.json(
        { error: "As URLs de retorno do checkout estão inválidas." },
        { status: 500 }
      )
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      console.error("Erro ao buscar profile:", profileError)
      return NextResponse.json(
        { error: "Erro ao buscar o perfil do usuário." },
        { status: 500 }
      )
    }

    let customerId: string | null = profile?.stripe_customer_id ?? null

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          user_id: user.id,
        },
      })

      customerId = customer.id

      const { error: upsertProfileError } = await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: user.id,
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )

      if (upsertProfileError) {
        console.error("Erro ao salvar stripe_customer_id no profile:", upsertProfileError)
        return NextResponse.json(
          { error: "Erro ao atualizar o perfil do usuário." },
          { status: 500 }
        )
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: "1 prova extra - Prova Secreta",
              description: "Libera 1 nova geração de prova após o limite gratuito diário.",
            },
            unit_amount: VALOR_PROVA_CENTAVOS,
          },
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        creditos_liberados: "1",
      },
    })

    if (!session.url || typeof session.url !== "string") {
      return NextResponse.json(
        { error: "O Stripe não retornou a URL do checkout." },
        { status: 502 }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        url: session.url,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Erro ao criar checkout:", error)

    return NextResponse.json(
      {
        error: "Erro interno ao criar checkout.",
      },
      { status: 500 }
    )
  }
}