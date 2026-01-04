import { getDataFromApi } from '@/lib/api'
import { API_URL } from '@/lib/constants'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body.code !== 'string') {
      return NextResponse.json({ error: 'Brak pola code' }, { status: 400 })
    }
    const resp = await getDataFromApi(`${API_URL}/transpile`, 'POST', { code: body.code })
    if (!resp.ok) {
      return NextResponse.json({ error: 'Upstream error', status: resp.status }, { status: 502 })
    }
    const data = await resp.json().catch(()=>null)
    if (!data) return NextResponse.json({ error: 'Pusta odpowiedź upstream' }, { status: 502 })
    return NextResponse.json(data)
  } catch (e) {
    const msg = (e as Error)?.message || 'Błąd serwera'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}