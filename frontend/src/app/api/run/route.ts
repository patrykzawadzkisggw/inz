import { API_URL } from '@/lib/constants'
import { NextResponse } from 'next/server'
import { getDataFromApi } from '@/lib/api'
import { z } from 'zod'

    const RunRequestSchema = z.object({ code: z.string().min(1) }).loose()
    const UpstreamOkSchema = z.object({
      output: z.string(),
      results: z.array(z.unknown()).optional(),
    }).loose()
    const UpstreamErrorSchema = z.object({
      detail: z.string().optional(),
    }).loose()
export async function POST(req: Request) {
  try {

    const bodyUnknown = await req.json().catch(() => null)
    const bodyParsed = RunRequestSchema.safeParse(bodyUnknown)
    if (!bodyParsed.success) {
      return NextResponse.json({ error: 'Brak pola code' }, { status: 400 })
    }

    const resp = await getDataFromApi(`${API_URL}/transpile`, 'POST', { code: bodyParsed.data.code, run: true })
    const text = await resp.text()
    let data: unknown = null
    try { data = JSON.parse(text) } catch {}
    

    if (!resp.ok) {
      const errParsed = UpstreamErrorSchema.safeParse(data)
      const detail = errParsed.success
        ? (errParsed.data.detail ?? 'Upstream error')
        : (text || 'Upstream error')
      return NextResponse.json({ error: detail }, { status: 400 })
    }

    const okParsed = UpstreamOkSchema.safeParse(data)
    if (okParsed.success) {
      const { output, results } = okParsed.data
      return NextResponse.json({ output, results })
    }
    return NextResponse.json({ error: 'Niepoprawna odpowiedź upstream' }, { status: 502 })
  } catch (e) {
    const msg = (e as Error)?.message || 'Błąd serwera'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } })
}