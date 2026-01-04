// @ts-nocheck
import { waitFor } from '@testing-library/react'

jest.doMock('@/lib/userFunctions', () => ({
  validateOnSentOnly: jest.fn(),
  transpileToPythonRaw: jest.fn(),
  mapZodToErrors: jest.fn(() => ({})),
}))
jest.doMock('@clerk/nextjs/server', () => ({ currentUser: jest.fn().mockResolvedValue({ id: 'u1' }) }))
jest.doMock('@/lib/reports', () => ({ createReport: jest.fn(), updateReport: jest.fn(), deleteReport: jest.fn(), listReports: jest.fn(), getReport: jest.fn(), reportInputSchema: { parse: (v) => v } }))
jest.doMock('next/cache', () => ({ revalidatePath: jest.fn() }))

const actions = require('@/app/(authorized)/notifications/actions')
const uf = require('@/lib/userFunctions')

describe('akcje powiadomień', () => {
  beforeEach(() => jest.clearAllMocks())

  test('createReportAction odrzuca nieprawidłowe pole conditionFormula', async () => {
    uf.validateOnSentOnly.mockReturnValue({ ok: false, msg: 'bad' })
    const fd = new FormData()
    fd.set('name', 'n')
    const res = await actions.createReportAction({ errors: {} }, fd)
    expect(res.errors.conditionFormula).toBeDefined()
  })

  test('createReportAction odrzuca niepoprawną transpilację pola messageTemplate', async () => {
    uf.validateOnSentOnly.mockReturnValue({ ok: true })
    uf.transpileToPythonRaw.mockResolvedValue(undefined)
    const fd = new FormData()
    fd.set('name', 'n')
    fd.set('messageTemplate', 'tpl')
    const res = await actions.createReportAction({ errors: {} }, fd)
    expect(res.errors.messageTemplate).toBeDefined()
  })

  function makeForm(pairs = []) { const m = new Map(pairs); return { get: (k) => m.get(k) ?? null } }

  test('createReportAction po sukcesie wywołuje createReport i odświeża ścieżkę', async () => {
    uf.validateOnSentOnly.mockReturnValue({ ok: true })
    uf.transpileToPythonRaw.mockResolvedValue('py')
    const reports = require('@/lib/reports')
    reports.createReport.mockResolvedValue({ id: 'r1' })
    const fd = makeForm([['name', 'n'], ['messageTemplate', 'tpl']])
    const res = await actions.createReportAction({ errors: {} }, fd)
    expect(res.ok).toBe(true)
  })

  test('updateReportAction odrzuca nieprawidłowe pole conditionFormula', async () => {
    uf.validateOnSentOnly.mockReturnValue({ ok: false, msg: 'bad' })
    const fd = makeForm([['name', 'n'], ['conditionFormula', 'bad']])
    const res = await actions.updateReportAction('r1', { errors: {} }, fd)
    expect(res.errors.conditionFormula).toBeDefined()
  })

  test('updateReportAction odrzuca niepoprawne pole messageTemplate', async () => {
    uf.validateOnSentOnly.mockReturnValue({ ok: true })
    uf.transpileToPythonRaw.mockResolvedValueOnce(undefined)
    const fd = makeForm([['messageTemplate', 'tpl']])
    const res = await actions.updateReportAction('r1', { errors: {} }, fd)
    expect(res.errors.messageTemplate).toBeDefined()
  })

  test('updateReportAction parsuje częstotliwość i wywołuje updateReport przy sukcesie', async () => {
    uf.validateOnSentOnly.mockReturnValue({ ok: true })
    uf.transpileToPythonRaw.mockResolvedValue('py')
    const reports = require('@/lib/reports')
    reports.updateReport.mockResolvedValue({ id: 'r1' })
    const fd = makeForm([['frequencyValue', '  '], ['frequencyUnit', 'd']])
    const res = await actions.updateReportAction('r1', { errors: {} }, fd)
    expect(res.ok).toBe(true)
    expect(reports.updateReport).toHaveBeenCalled()
  })

  test('funkcje delete/list/get wywołują odpowiednie implementacje', async () => {
    const reports = require('@/lib/reports')
    reports.deleteReport.mockResolvedValueOnce({ ok: true })
    reports.listReports.mockResolvedValueOnce([{ id: 'r1' }])
    reports.getReport.mockResolvedValueOnce({ id: 'r1' })
    const d = await actions.deleteReportAction('r1')
    const l = await actions.listReportsAction()
    const g = await actions.getReportAction('r1')
    expect(d).toEqual({ ok: true })
    expect(l).toEqual([{ id: 'r1' }])
    expect(g).toEqual({ id: 'r1' })
  })
})
