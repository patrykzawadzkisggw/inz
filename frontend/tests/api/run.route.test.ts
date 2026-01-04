// @ts-nocheck
jest.mock('next/server', () => ({ NextResponse: { json: jest.fn((body, init) => ({ body, status: init?.status ?? 200 })) } }))
jest.mock('@/lib/api', () => ({ getDataFromApi: jest.fn() }))

import { POST } from '@/app/api/run/route'
import { getDataFromApi } from '@/lib/api'

describe('POST /api/run  uruchamianie kodu', () => {
  beforeEach(() => {
    ;(getDataFromApi as any).mockReset()
  })

  test('brak pola code zwraca 400', async () => {
    const req = { json: async () => null }
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'Brak pola code' })
  })

  test('gdy upstream zwraca błąd z detalem, zwraca 400 i ten detal', async () => {
    const req = { json: async () => ({ code: 'x' }) }
    ;(getDataFromApi as any).mockResolvedValue({ ok: false, text: async () => JSON.stringify({ detail: 'up detail' }) })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'up detail' })
  })

  test('gdy upstream OK, zwraca output i results', async () => {
    const req = { json: async () => ({ code: 'print(1)' }) }
    const payload = { output: 'ok', results: [1,2] }
    ;(getDataFromApi as any).mockResolvedValue({ ok: true, text: async () => JSON.stringify(payload) })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ output: 'ok', results: [1,2] })
  })

  test('gdy upstream OK, ale schemat nieprawidłowy, zwraca 502', async () => {
    const req = { json: async () => ({ code: 'x' }) }
    ;(getDataFromApi as any).mockResolvedValue({ ok: true, text: async () => JSON.stringify({ something: 1 }) })
    const res = await POST(req as any)
    expect(res.status).toBe(502)
    expect(res.body).toEqual({ error: 'Niepoprawna odpowiedź upstream' })
  })

  test('gdy upstream nie OK i zwraca tekst nie-JSON, zwraca ten tekst jako błąd', async () => {
    const req = { json: async () => ({ code: 'x' }) }
    ;(getDataFromApi as any).mockResolvedValue({ ok: false, text: async () => 'plain upstream error' })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'plain upstream error' })
  })

  test('gdy upstream nie OK i zwraca pusty tekst, zwraca ogólny błąd upstream', async () => {
    const req = { json: async () => ({ code: 'x' }) }
    ;(getDataFromApi as any).mockResolvedValue({ ok: false, text: async () => '' })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'Upstream error' })
  })

  test('OPTIONS zwraca nagłówki CORS', async () => {
    global.Response = class {
      constructor(_body, opts) { this.status = opts.status; this._headers = opts.headers || {} }
      get headers() { return { get: (k) => this._headers[k] } }
    }
    const { OPTIONS } = require('@/app/api/run/route')
    const res = OPTIONS()
    expect(res.status).toBe(204)
    const methods = res.headers.get('Access-Control-Allow-Methods')
    expect(methods).toContain('POST')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  test('nieoczekiwany błąd serwera zwraca 500', async () => {
    const req = { json: async () => ({ code: 'x' }) }
    ;(getDataFromApi as any).mockRejectedValue(new Error('net'))
    const res = await POST(req as any)
    expect(res.status).toBe(500)
    expect(res.body).toHaveProperty('error')
  })
})
