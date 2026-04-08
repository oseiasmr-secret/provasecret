import { NextResponse } from "next/server"
import Stripe from "stripe"
import { supabaseServer } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const VALOR_PROVA_CENTAVOS = 490 // R$ 4,90

export async function POST(request: Request) {
  try {
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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, stripe_customer_id")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile não encontrado." }, { status: 404 })
    }

    let customerId = profile.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          user_id: user.id,
        },
      })

      customerId = customer.id

      const { error: updateProfileError } = await supabaseAdmin
        .from("profiles")
        .update({
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (updateProfileError) {
        return NextResponse.json({ error: "Erro ao atualizar profile." }, { status: 500 })
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      success_url: `${appUrl}/?pagamento=sucesso`,
      cancel_url: `${appUrl}/?pagamento=cancelado`,
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

    return NextResponse.json({
      ok: true,
      url: session.url,
    })
  } catch (error) {
    console.error("Erro ao criar checkout:", error)
    return NextResponse.json({ error: "Erro ao criar checkout." }, { status: 500 })
  }
}