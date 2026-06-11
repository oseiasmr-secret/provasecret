import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { user_id, event_name, metadata } = body;

    if (!event_name) {
      return NextResponse.json({ error: "Evento obrigatório" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("analytics_events")
      .insert({
        user_id: user_id || null,
        event_name,
        metadata: metadata || {},
      });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Erro ao registrar evento" },
      { status: 500 }
    );
  }
}