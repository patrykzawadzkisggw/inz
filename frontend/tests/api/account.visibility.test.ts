// @ts-nocheck
jest.mock('next/server', () => ({ NextResponse: { json: jest.fn((body, init) => ({ body, status: init?.status ?? 200 })) } }))
jest.mock('@clerk/nextjs/server', () => ({ currentUser: jest.fn() }))
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: { user: { findUnique: jest.fn(), update: jest.fn() } } }))

import { GET, POST } from '@/app/api/account/visibility/route'
import { currentUser } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

describe('endpoint widoczności konta', () => {
  beforeEach(() => {
    ;(currentUser as any).mockReset()
    ;(prisma as any).user.findUnique.mockReset()
    ;(prisma as any).user.update.mockReset()
  })

  test('GET zwraca 401, gdy użytkownik nie jest uwierzytelniony', async () => {
    ;(currentUser as any).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'unauthorized' })
  })

  test('GET zwraca isAccountPrivate z bazy danych', async () => {
    ;(currentUser as any).mockResolvedValue({ id: 'u' })
    ;(prisma as any).user.findUnique.mockResolvedValue({ isAccountPrivate: false })
    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ isAccountPrivate: false })
  })

  test('GET zwraca domyślnie true, gdy rekord w bazie nie istnieje', async () => {
    ;(currentUser as any).mockResolvedValue({ id: 'u' })
    ;(prisma as any).user.findUnique.mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ isAccountPrivate: true })
  })

  test('POST aktualizuje i zwraca nową wartość flagi', async () => {
    ;(currentUser as any).mockResolvedValue({ id: 'u' })
    const req = { json: async () => ({ isAccountPrivate: true }) }
    ;(prisma as any).user.update.mockResolvedValue({ isAccountPrivate: true })
    const res = await POST(req as any)
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u' }, data: { isAccountPrivate: true }, select: { isAccountPrivate: true } })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ isAccountPrivate: true })
  })

  test('POST zwraca 401, gdy użytkownik nie jest uwierzytelniony', async () => {
    ;(currentUser as any).mockResolvedValue(null)
    const req = { json: async () => ({ isAccountPrivate: false }) }
    const res = await POST(req as any)
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'unauthorized' })
  })

  test('POST obsługuje niepoprawny JSON, traktując flagę jako false', async () => {
    ;(currentUser as any).mockResolvedValue({ id: 'u' })
    const req = { json: async () => { throw new Error('bad json') } }
    ;(prisma as any).user.update.mockResolvedValue({ isAccountPrivate: false })
    const res = await POST(req as any)
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u' }, data: { isAccountPrivate: false }, select: { isAccountPrivate: true } })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ isAccountPrivate: false })
  })
})
