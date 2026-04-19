import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

// In-memory fallback
let suppliers: any[] = []

export async function GET() {
  if (supabase) {
    const { data, error } = await supabase.from('suppliers').select('*')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }
  return NextResponse.json(suppliers)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const supplier = { id: Date.now().toString(), ...body }
  if (supabase) {
    const { data, error } = await supabase.from('suppliers').insert(supplier).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data[0])
  }
  suppliers.push(supplier)
  return NextResponse.json(supplier)
}