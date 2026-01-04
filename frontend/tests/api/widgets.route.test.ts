// @ts-nocheck
jest.mock('next/server', () => ({ NextResponse: { json: jest.fn((body, init) => ({ body, status: init?.status ?? 200 })) } }))
jest.mock('@clerk/nextjs/server', () => ({ currentUser: jest.fn() }))
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: { widget: { create: jest.fn(), update: jest.fn() } } }))
jest.mock('@/lib/userFunctions', () => ({ transpileToPythonRaw: jest.fn(), runPython: jest.fn() }))

import { POST } from '@/app/api/widgets/route'
import { currentUser } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'
import { transpileToPythonRaw, runPython } from '@/lib/userFunctions'

describe('POST /api/widgets — tworzenie widgetu', () => {
  beforeEach(() => {
    ;(currentUser as any).mockReset()
    ;(prisma as any).widget.create.mockReset()
    ;(prisma as any).widget.update.mockReset()
    ;(transpileToPythonRaw as any).mockReset()
    ;(runPython as any).mockReset()
  })

  test('gdy brak użytkownika, zwraca 401', async () => {
    ;(currentUser as any).mockResolvedValue(null)
    const res = await POST({} as any)
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'unauthorized' })
  })

  test('gdy JSON nieprawidłowy, zwraca 400', async () => {
    ;(currentUser as any).mockResolvedValue({ id: 'u' })
    const req = { json: async () => { throw new Error('bad') } }
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'invalid json' })
  })

  test('gdy typ nieprawidłowy, zwraca 400', async () => {
    ;(currentUser as any).mockResolvedValue({ id: 'u' })
    const req = { json: async () => ({ type: 'bad' }) }
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'invalid type' })
  })

  test('dla typu tekst z pustą zawartością zwraca 400', async () => {
    ;(currentUser as any).mockResolvedValue({ id: 'u' })
    const req = { json: async () => ({ type: 'tekst', content: '   ' }) }
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'empty text' })
  })

  test('dla typu tabela z pustymi wierszami zwraca 400', async () => {
    ;(currentUser as any).mockResolvedValue({ id: 'u' })
    const req = { json: async () => ({ type: 'tabela', configJson: { rows: [] } }) }
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'empty table' })
  })

  test('dla typu wykres z pustymi rekordami zwraca 400', async () => {
    ;(currentUser as any).mockResolvedValue({ id: 'u' })
    const req = { json: async () => ({ type: 'wykres', configJson: { records: [] } }) }
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'empty chart' })
  })

  test('gdy utworzenie przebiega bez transpilacji i uruchomienia, zwraca 201 i cache null', async () => {
    ;(currentUser as any).mockResolvedValue({ id: 'u' })
    const widgetObj = { id: 'w1', content2: null, content: 'hi', title: null }
    ;(prisma as any).widget.create.mockResolvedValue(widgetObj)
    const req = { json: async () => ({ type: 'tekst', content: 'hi' }) }
    const res = await POST(req as any)
    expect(prisma.widget.create).toHaveBeenCalled()
    expect(res.status).toBe(201)
    expect(res.body.widget.cacheJson).toBeNull()
  })

  test('gdy utworzenie obejmuje transpilację i uruchomienie, aktualizuje cache', async () => {
    ;(currentUser as any).mockResolvedValue({ id: 'u' })
    ;(transpileToPythonRaw as any).mockResolvedValue('pycode')
    const created = { id: 'w2', content2: 'pycode', content: '', title: null }
    ;(prisma as any).widget.create.mockResolvedValue(created)
    ;(runPython as any).mockResolvedValue({ ok: true })
    ;(prisma as any).widget.update.mockResolvedValue({})
    const req = { json: async () => ({ type: 'tekst', content: 'x', transpileSource: 'x' }) }
    const res = await POST(req as any)
    expect(transpileToPythonRaw).toHaveBeenCalled()
    expect(runPython).toHaveBeenCalledWith('pycode')
    expect(prisma.widget.update).toHaveBeenCalledWith({ where: { id: 'w2' }, data: { cacheJson: { ok: true } } })
    expect(res.status).toBe(201)
    expect(res.body.widget.cacheJson).toEqual({ ok: true })
  })
})
