import Stripe from "stripe"
import { headers } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase-admin"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  const body = await request.text()
  const signature = (await headers()).get("stripe-signature")

  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error("Webhook signature error:", err)
    return new Response("Invalid signature", { status: 400 })
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session

      const userId = session.metadata?.user_id
      const creditosLiberados = Number(session.metadata?.creditos_liberados ?? "1")

      if (!userId) {
        return new Response("Missing user_id metadata", { status: 400 })
      }

      const sessionId = session.id
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : null

      const { data: existing } = await supabaseAdmin
        .from("pagamentos")
        .select("id")
        .eq("stripe_checkout_session_id", sessionId)
        .maybeSingle()

      if (!existing) {
        const { error: insertPagamentoError } = await supabaseAdmin
          .from("pagamentos")
          .insert({
            user_id: userId,
            stripe_checkout_session_id: sessionId,
            stripe_payment_intent_id: paymentIntentId,
            valor_centavos: session.amount_total ?? 0,
            status: "paid",
            creditos_liberados: creditosLiberados,
            updated_at: new Date().toISOString(),
          })

        if (insertPagamentoError) {
          console.error("Erro ao registrar pagamento:", insertPagamentoError)
          return new Response("Erro ao registrar pagamento", { status: 500 })
        }

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("creditos_prova")
          .eq("id", userId)
          .single()

        const creditosAtuais = profile?.creditos_prova ?? 0

        const { error: updateProfileError } = await supabaseAdmin
          .from("profiles")
          .update({
            creditos_prova: creditosAtuais + creditosLiberados,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId)

        if (updateProfileError) {
          console.error("Erro ao liberar crédito:", updateProfileError)
          return new Response("Erro ao liberar crédito", { status: 500 })
        }
      }
    }

    return new Response("ok", { status: 200 })
  } catch (error) {
    console.error("Erro no webhook:", error)
    return new Response("Webhook handler failed", { status: 500 })
  }
}