// @ts-nocheck
jest.mock('next/server', () => ({ NextResponse: { json: jest.fn((body, init) => ({ body, status: init?.status ?? 200 })) } }))
jest.mock('@/lib/api', () => ({ getDataFromApi: jest.fn() }))

import { POST, OPTIONS } from '@/app/api/transpile/route'
import { getDataFromApi } from '@/lib/api'

describe('POST /api/transpile  transpilacja kodu', () => {
  beforeAll(() => {
    global.Response = class {
      status: number
      headers: any
      constructor(_body: any, opts: any) {
        this.status = opts?.status ?? 200
        const h = opts?.headers || {}
        this.headers = { ...h, get: (k: string) => h[k] }
      }
    } as any
  })

  beforeEach(() => {
    ;(getDataFromApi as any).mockReset()
  })

  test('brak pola code zwraca 400', async () => {
    const req = { json: async () => null }
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'Brak pola code' })
  })

  test('gdy upstream nie OK, zwraca 502', async () => {
    const req = { json: async () => ({ code: 'x' }) }
    ;(getDataFromApi as any).mockResolvedValue({ ok: false, status: 500 })
    const res = await POST(req as any)
    expect(res.status).toBe(502)
    expect(res.body).toHaveProperty('error')
  })

  test('gdy upstream OK, ale puste JSON, zwraca 502', async () => {
    const req = { json: async () => ({ code: 'x' }) }
    ;(getDataFromApi as any).mockResolvedValue({ ok: true, json: async () => null })
    const res = await POST(req as any)
    expect(res.status).toBe(502)
    expect(res.body).toEqual({ error: 'Pusta odpowiedź upstream' })
  })

  test('gdy upstream odpowiada poprawnie, endpoint zwraca dane', async () => {
    const req = { json: async () => ({ code: 'x' }) }
    const data = { transpiled: true }
    ;(getDataFromApi as any).mockResolvedValue({ ok: true, json: async () => data })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    expect(res.body).toEqual(data)
  })

  test('nieoczekiwany błąd serwera zwraca 500 gdy getDataFromApi rzuca', async () => {
    const req = { json: async () => ({ code: 'x' }) }
    ;(getDataFromApi as any).mockRejectedValue(new Error('netfail'))
    const res = await POST(req as any)
    expect(res.status).toBe(500)
    expect(res.body).toHaveProperty('error')
  })

  test('OPTIONS zwraca 204 z nagłówkami CORS', () => {
    const res = OPTIONS()
    expect(res.status).toBe(204)
    const headers = (res as any).headers || (res as any).headers
    const allow = (headers && (headers['Access-Control-Allow-Origin'] || headers.get?.('Access-Control-Allow-Origin')))
    expect(allow).toBeDefined()
  })
})

jest.mock('next/server', () => ({ NextResponse: { json: jest.fn((body, init) => ({ body, status: init?.status ?? 200 })) } }))
jest.mock('@/lib/api', () => ({ getDataFromApi: jest.fn() }))

import { POST } from '@/app/api/transpile/route'
import { getDataFromApi } from '@/lib/api'

describe('POST /api/transpile', () => {
  beforeEach(() => {
    ;(getDataFromApi as any).mockReset()
  })

  test('brak pola code zwraca 400', async () => {
    const req = { json: async () => null }
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'Brak pola code' })
  })

  test('gdy upstream nie OK, zwraca 502', async () => {
    const req = { json: async () => ({ code: 'x' }) }
    ;(getDataFromApi as any).mockResolvedValue({ ok: false, status: 500 })
    const res = await POST(req as any)
    expect(res.status).toBe(502)
    expect(res.body).toHaveProperty('error')
  })

  test('gdy upstream OK, ale puste JSON, zwraca 502', async () => {
    const req = { json: async () => ({ code: 'x' }) }
    ;(getDataFromApi as any).mockResolvedValue({ ok: true, json: async () => null })
    const res = await POST(req as any)
    expect(res.status).toBe(502)
    expect(res.body).toEqual({ error: 'Pusta odpowiedź upstream' })
  })

  test('gdy upstream odpowiada poprawnie, endpoint zwraca dane', async () => {
    const req = { json: async () => ({ code: 'x' }) }
    const data = { transpiled: true }
    ;(getDataFromApi as any).mockResolvedValue({ ok: true, json: async () => data })
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    expect(res.body).toEqual(data)
  })
})
