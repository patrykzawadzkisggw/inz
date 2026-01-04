// @ts-nocheck
jest.mock('next/server', () => ({ Response: global.Response }))
jest.mock('@clerk/nextjs/server', () => ({ currentUser: jest.fn() }))
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: { customFunction: { findMany: jest.fn() } } }))

import { GET } from '@/app/api/user-functions/route'
import { currentUser } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

describe('GET /api/user-functions — pobieranie funkcji użytkownika', () => {
  beforeEach(() => {
    ;(currentUser as any).mockReset()
    ;(prisma as any).customFunction.findMany.mockReset()
    global.Response = class {
      _body: any
      status: number
      headers: any
      constructor(body: any, opts: any) { this._body = body; this.status = opts?.status ?? 200; this.headers = opts?.headers }
      async text() { return this._body }
      async json() { return JSON.parse(this._body) }
    } as any
  })

  test('niezalogowany użytkownik otrzymuje pustą tablicę', async () => {
    ;(currentUser as any).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(200)
    const txt = await res.text()
    expect(txt).toBe('[]')
  })

  test('zwraca zmapowane funkcje z przykładowymi parametrami', async () => {
    ;(currentUser as any).mockResolvedValue({ id: 'u1' })
    ;(prisma as any).customFunction.findMany.mockResolvedValue([
      { name: 'fn', description: null, body: 'function fn(a,b){ return 1 }' },
      { name: 'noargs', description: 'd', body: 'function noargs(){}' }
    ])
    const res = await GET()
    expect(res.status).toBe(200)
    const txt = await res.text()
    const parsed = JSON.parse(txt)
    expect(parsed).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'fn', example: 'fn(<a>, <b>)' }),
      expect.objectContaining({ name: 'noargs', example: 'noargs()' })
    ]))
  })

  test('przy błędzie Prisma zwraca pustą tablicę i loguje błąd', async () => {
    const orig = console.error
    const spy = jest.fn()
    console.error = spy
    ;(currentUser as any).mockResolvedValue({ id: 'u1' })
    ;(prisma as any).customFunction.findMany.mockRejectedValue(new Error('db'))
    const res = await GET()
    expect(res.status).toBe(200)
    const txt = await res.text()
    expect(txt).toBe('[]')
    expect(spy).toHaveBeenCalled()
    console.error = orig
  })
})
