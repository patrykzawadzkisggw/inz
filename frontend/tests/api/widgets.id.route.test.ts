// @ts-nocheck
jest.resetModules()

jest.mock('next/server', () => ({ NextResponse: { json: jest.fn((body, init) => ({ body, status: init?.status ?? 200 })) } }))
jest.doMock('@clerk/nextjs/server', () => ({ currentUser: jest.fn() }))
jest.doMock('@/lib/prisma', () => ({ widget: { findFirst: jest.fn(), update: jest.fn() } }))
jest.doMock('@/lib/userFunctions', () => ({ transpileToPythonRaw: jest.fn(), runPython: jest.fn() }))

const { PATCH } = require('@/app/api/widgets/[id]/route')
const auth = require('@clerk/nextjs/server')
const prisma = require('@/lib/prisma')
const uf = require('@/lib/userFunctions')

describe('PATCH /api/widgets/[id] — aktualizacja widgetu', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('zwraca 401 gdy użytkownik nie jest uwierzytelniony', async () => {
    auth.currentUser.mockResolvedValue(null)
    const res = await PATCH({ json: async () => ({}) } as any, { params: Promise.resolve({ id: 'w1' }) })
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'unauthorized' })
  })

  test('zwraca 400 gdy brakuje id', async () => {
    auth.currentUser.mockResolvedValue({ id: 'u1' })
    const res = await PATCH({ json: async () => ({}) } as any, { params: Promise.resolve({ id: '' }) })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'missing id' })
  })

  test('gdy JSON jest nieprawidłowy, zwraca 400', async () => {
    auth.currentUser.mockResolvedValue({ id: 'u1' })
    const badReq = { json: async () => { throw new Error('bad') } }
    const res = await PATCH(badReq as any, { params: Promise.resolve({ id: 'w1' }) })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'invalid json' })
  })

  test('zwraca 404 gdy widget nie istnieje', async () => {
    auth.currentUser.mockResolvedValue({ id: 'u1' })
    prisma.widget.findFirst.mockResolvedValue(null)
    const res = await PATCH({ json: async () => ({}) } as any, { params: Promise.resolve({ id: 'w1' }) })
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'not found' })
  })

  test('dla typu TEXT z pustą treścią zwraca 400', async () => {
    auth.currentUser.mockResolvedValue({ id: 'u1' })
    prisma.widget.findFirst.mockResolvedValue({ id: 'w1', type: 'TEXT' })
    const res = await PATCH({ json: async () => ({ content: '   ' }) } as any, { params: Promise.resolve({ id: 'w1' }) })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'empty text' })
  })

  test('dla typu TABLE z pustymi wierszami zwraca 400', async () => {
    auth.currentUser.mockResolvedValue({ id: 'u1' })
    prisma.widget.findFirst.mockResolvedValue({ id: 'w2', type: 'TABLE' })
    const res = await PATCH({ json: async () => ({ configJson: { rows: [] } }) } as any, { params: Promise.resolve({ id: 'w2' }) })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'empty table' })
  })

  test('dla typu CHART z pustymi rekordami zwraca 400', async () => {
    auth.currentUser.mockResolvedValue({ id: 'u1' })
    prisma.widget.findFirst.mockResolvedValue({ id: 'w3', type: 'CHART' })
    const res = await PATCH({ json: async () => ({ configJson: { records: [] } }) } as any, { params: Promise.resolve({ id: 'w3' }) })
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'empty chart' })
  })

  test('przy udanej aktualizacji przycina treść, wywołuje transpilację i uruchomienie oraz aktualizuje cacheJson', async () => {
    auth.currentUser.mockResolvedValue({ id: 'u1' })
    prisma.widget.findFirst.mockResolvedValue({ id: 'w4', type: 'TEXT' })

    prisma.widget.update.mockResolvedValueOnce({ id: 'w4', content2: 'pycode', cacheJson: null })

    uf.runPython.mockResolvedValueOnce({ result: 42 })
    uf.transpileToPythonRaw.mockResolvedValueOnce('pycode')

    const res = await PATCH({ json: async () => ({ content: ' print(1) ' }) } as any, { params: Promise.resolve({ id: 'w4' }) })

    expect(uf.transpileToPythonRaw).toHaveBeenCalledWith('print(1)')
    expect(prisma.widget.update).toHaveBeenCalled()
    expect(prisma.widget.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'w4' }, data: { cacheJson: { result: 42 } } }))
    expect(res.status).toBe(200)
    expect(res.body.widget).toBeDefined()
    expect(res.body.widget.cacheJson).toEqual({ result: 42 })
  })

  test('dla typu TABLE dodaje DisplayTable i transpiluje rozszerzoną treść', async () => {
    auth.currentUser.mockResolvedValue({ id: 'u1' })
    prisma.widget.findFirst.mockResolvedValue({ id: 'w5', type: 'TABLE' })
    prisma.widget.update.mockResolvedValueOnce({ id: 'w5', content2: 'py', cacheJson: null })
    uf.transpileToPythonRaw.mockResolvedValueOnce('py')
    uf.runPython.mockResolvedValueOnce(null)

    const cfg = { rows: [{ id: 'r1', name: 'N', value: 'v1' }] }
    const res = await PATCH({ json: async () => ({ content: 'base', configJson: cfg }) } as any, { params: Promise.resolve({ id: 'w5' }) })
    expect(uf.transpileToPythonRaw).toHaveBeenCalled()
    expect(res.status).toBe(200)
  })
})
