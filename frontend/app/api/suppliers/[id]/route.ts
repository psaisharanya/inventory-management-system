import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

// In-memory fallback
let suppliers: any[] = []

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const body = await request.json()
  if (supabase) {
    const { data, error } = await supabase.from('suppliers').update(body).eq('id', id).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data[0])
  }
  const index = suppliers.findIndex(s => s.id === id)
  if (index === -1) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
  suppliers[index] = { ...suppliers[index], ...body }
  return NextResponse.json(suppliers[index])
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  if (supabase) {
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ message: 'Supplier deleted' })
  }
  suppliers = suppliers.filter(s => s.id !== id)
  return NextResponse.json({ message: 'Supplier deleted' })
}