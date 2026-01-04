// @ts-nocheck
jest.mock('next/server', () => ({ NextResponse: { json: jest.fn((body, init) => ({ body, status: init?.status ?? 200 })) } }))

import { GET } from '@/app/api/fetch-proxy/route'

describe('ścieżka proxy dla fetch', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
    global.Response = class {
      status: number
      _body: any
      headers: any
      constructor(body: any, opts: any) {
        this._body = body
        this.status = opts?.status ?? 200
        this.headers = opts?.headers ?? {}
      }
      async text() { return this._body }
    } as any
  })

  test('brak parametru url zwraca 400', async () => {
    const res = await GET({ url: 'http://localhost/' } as any)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'Missing url' })
  })

  test('nieprawidłowy URL zwraca 400', async () => {
    const res = await GET({ url: 'http://localhost/?url=not a url' } as any)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'Invalid url' })
  })

  test('nieobsługiwany protokół zwraca 400', async () => {
    const res = await GET({ url: 'http://localhost/?url=ftp://example.com' } as any)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'Unsupported protocol' })
  })

  test('udany proxied fetch zwraca obiekt podobny do Response', async () => {
    ;(global.fetch as any).mockResolvedValue({ status: 201, text: async () => 'ok', headers: { get: () => 'text/plain; charset=utf-8' } })
    const res = await GET({ url: 'http://localhost/?url=https://example.com' } as any)
    expect(res).toBeDefined()
    expect(res.status).toBe(201)
    const txt = await res.text()
    expect(txt).toBe('ok')
  })
})
