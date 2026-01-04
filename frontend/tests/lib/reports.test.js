const mockPrisma = {
  report: {
    create: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  }
}

jest.mock('@/lib/prisma', () => mockPrisma)
const mockAuth = { getToken: jest.fn().mockResolvedValue('tok') }
jest.mock('@clerk/nextjs/server', () => ({ auth: jest.fn(() => mockAuth) }))
const { auth } = require('@clerk/nextjs/server')

describe('raporty (reports)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    mockAuth.getToken.mockResolvedValue('tok')
  })

  test('createReport waliduje i tworzy oraz wywołuje schedulera', async () => {
    const { createReport } = require('@/lib/reports')
    mockPrisma.report.create.mockResolvedValueOnce({ id: 'r1' })
    global.fetch.mockResolvedValueOnce({ ok: true })

    const data = {
      name: 'Test',
      enabled: true,
      frequencyValue: 1,
      frequencyUnit: 'minutes',
      messageTemplate: 'msg'
    }

    const created = await createReport('u1', data)
    expect(mockPrisma.report.create).toHaveBeenCalled()
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/jobs/r1'), expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }))
    expect(created).toEqual({ id: 'r1' })
  })

  test('deleteReport usuwa i wywołuje scheduler DELETE', async () => {
    const { deleteReport } = require('@/lib/reports')
    mockPrisma.report.delete.mockResolvedValueOnce({ id: 'r1' })
    global.fetch.mockResolvedValueOnce({ ok: true })

    const res = await deleteReport('r1', 'u1')
    expect(mockPrisma.report.delete).toHaveBeenCalledWith({ where: { id: 'r1', userId: 'u1' } })
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/jobs/r1'), expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }))
    expect(res).toEqual({ id: 'r1' })
  })

  test('getReport i listReports delegują do prisma', async () => {
    const { getReport, listReports } = require('@/lib/reports')
    mockPrisma.report.findUnique.mockResolvedValueOnce({ id: 'r1' })
    mockPrisma.report.findMany.mockResolvedValueOnce([{ id: 'r1' }])

    const g = await getReport('r1', 'u1')
    const l = await listReports('u1')

    expect(mockPrisma.report.findUnique).toHaveBeenCalledWith({ where: { id: 'r1', userId: 'u1' } })
    expect(mockPrisma.report.findMany).toHaveBeenCalledWith({ where: { userId: 'u1' } })
    expect(g).toEqual({ id: 'r1' })
    expect(l).toEqual([{ id: 'r1' }])
  })

  test('updateReport waliduje i wywołuje scheduler', async () => {
    const { updateReport } = require('@/lib/reports')
    mockPrisma.report.update.mockResolvedValueOnce({ id: 'r1' })
    global.fetch.mockResolvedValueOnce({ ok: true })

    const res = await updateReport('r1', { name: 'X' }, 'u1')
    expect(mockPrisma.report.update).toHaveBeenCalled()
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/jobs/r1'), expect.objectContaining({ headers: { Authorization: 'Bearer tok' } }))
    expect(res).toEqual({ id: 'r1' })
  })

  test('tworzy log gdy scheduler POST nie powiedzie się', async () => {
    const { createReport } = require('@/lib/reports')
    mockPrisma.report.create.mockResolvedValueOnce({ id: 'r2' })
    global.fetch.mockRejectedValueOnce(new Error('net'))
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockAuth.getToken.mockResolvedValueOnce('tok')

    const data = { name: 'T2', enabled: true, frequencyValue: 2, frequencyUnit: 'H', messageTemplate: 'm' }
    const created = await createReport('u2', data)
    expect(created).toEqual({ id: 'r2' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  test('usuwa raport i tworzy log gdy scheduler DELETE nie powiedzie się', async () => {
    const { deleteReport } = require('@/lib/reports')
    mockPrisma.report.delete.mockResolvedValueOnce({ id: 'r3' })
    global.fetch.mockRejectedValueOnce(new Error('netdel'))
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockAuth.getToken.mockResolvedValueOnce('tok')

    const res = await deleteReport('r3', 'u3')
    expect(res).toEqual({ id: 'r3' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  test('aktualizuje raport i tworzy log gdy scheduler POST nie powiedzie się i nextRunAt ustawione gdy freqs obecne', async () => {
    const { updateReport } = require('@/lib/reports')
    mockPrisma.report.update.mockResolvedValueOnce({ id: 'r4' })
    global.fetch.mockRejectedValueOnce(new Error('netupd'))
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockAuth.getToken.mockResolvedValueOnce('tok')

    const res = await updateReport('r4', { frequencyValue: 5, frequencyUnit: 'D' }, 'u4')
    expect(res).toEqual({ id: 'r4' })
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
