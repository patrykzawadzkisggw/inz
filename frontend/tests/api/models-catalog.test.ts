// @ts-nocheck
jest.mock('next/server', () => ({ NextResponse: { json: jest.fn((body, init) => ({ body, status: init?.status ?? 200, headers: init?.headers })) } }))
jest.mock('@clerk/nextjs/server', () => ({ auth: jest.fn() }))
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: { model: { findMany: jest.fn() }, dataImport: { findMany: jest.fn() } } }))

import { GET } from '@/app/api/models-catalog/route'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

describe('endpoint katalogu modeli', () => {
  beforeEach(() => {
    ;(auth as any).mockReset()
    ;(prisma as any).model.findMany.mockReset()
    ;(prisma as any).dataImport.findMany.mockReset()
  })

  test('brak użytkownika zwraca pustą tablicę', async () => {
    ;(auth as any).mockResolvedValue({ userId: null })
    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  test('brak modeli zwraca pustą tablicę', async () => {
    ;(auth as any).mockResolvedValue({ userId: 'u1' })
    ;(prisma as any).model.findMany.mockResolvedValue([])
    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  test('zwraca modele z kolumnami obliczonymi z najnowszego schematu importu', async () => {
    ;(auth as any).mockResolvedValue({ userId: 'u1' })
    const models = [{ id: 'm1', name: 'Model1', description: null }]
    ;(prisma as any).model.findMany.mockResolvedValue(models)
    ;(prisma as any).dataImport.findMany.mockResolvedValue([
      { modelId: 'm1', processedSchemaJson: [{ name: 'A' }, { key: 'b' }, { removed: true, name: 'X' }] }
    ])

    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.body).toEqual([{ name: 'Model1', description: '', columns: ['A', 'b'] }])
  })
})
