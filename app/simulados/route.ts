import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('simulados')
      .select('*')
      .order('id', { ascending: false })
      .limit(10)

    if (error) {
      console.error('ERRO AO BUSCAR SIMULADOS:')
      console.error(error)

      return NextResponse.json(
        {
          ok: false,
          erro: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      simulados: data ?? [],
    })
  } catch (error: any) {
    console.error('ERRO GERAL EM /api/simulados:')
    console.error(error)

    return NextResponse.json(
      {
        ok: false,
        erro: error?.message || 'Erro ao buscar simulados',
      },
      { status: 500 }
    )
  }
}