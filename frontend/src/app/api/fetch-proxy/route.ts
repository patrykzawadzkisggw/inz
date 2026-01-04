import { NextResponse } from 'next/server'

//endpoint uzywany przy imporcie do pobrania danych z zewnętrznego URL-a
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const url = searchParams.get('url')
    if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 })

    let target: URL
    try { target = new URL(url) } catch { return NextResponse.json({ error: 'Invalid url' }, { status: 400 }) }
    if (!['http:', 'https:'].includes(target.protocol)) {
      return NextResponse.json({ error: 'Unsupported protocol' }, { status: 400 })
    }

    const resp = await fetch(target.toString(), { cache: 'no-store' })
    const text = await resp.text()
    const ct = resp.headers.get('content-type') ?? 'text/plain; charset=utf-8'
    return new Response(text, {
      status: resp.status,
      headers: { 'content-type': ct },
    })
  } catch {
    return NextResponse.json({ error: 'Proxy fetch failed' }, { status: 500 })
  }
}
