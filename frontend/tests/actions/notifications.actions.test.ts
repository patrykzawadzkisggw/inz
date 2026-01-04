// @ts-nocheck
jest.mock('@/lib/reports', () => ({
  createReport: jest.fn(),
  updateReport: jest.fn(),
  deleteReport: jest.fn(),
  listReports: jest.fn(),
  getReport: jest.fn(),
  reportInputSchema: { parse: jest.fn() },
}))
jest.mock('@clerk/nextjs/server', () => ({ currentUser: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('@/lib/userFunctions', () => ({
  mapZodToErrors: jest.fn((e) => { if (e && e.issues) return { name: 'err' }; return {} }),
  transpileToPythonRaw: jest.fn(),
  validateOnSentOnly: jest.fn(() => ({ ok: true }))
}))

import { createReportAction, updateReportAction, deleteReportAction, listReportsAction, getReportAction } from '@/app/(authorized)/notifications/actions'
import { createReport, updateReport, deleteReport, listReports, getReport, reportInputSchema } from '@/lib/reports'
import { currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { transpileToPythonRaw, validateOnSentOnly, mapZodToErrors } from '@/lib/userFunctions'

function makeForm(obj: Record<string, unknown>) {
  return { get: (k: string) => (obj as any)[k] }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('akcje powiadomień', () => {
  test('createReportAction zwraca błąd, gdy funkcja onSent jest nieprawidłowa', async () => {
    ;(validateOnSentOnly as any).mockReturnValueOnce({ ok: false, msg: 'bad' })
    const res = await createReportAction({ errors: {} }, makeForm({ conditionFormula: 'x' }) as any)
    expect(res.errors.conditionFormula).toBeDefined()
  })

  test('createReportAction zwraca błąd pola messageTemplate, gdy brakuje transpilacji', async () => {
    ;(validateOnSentOnly as any).mockReturnValueOnce({ ok: true })
    ;(transpileToPythonRaw as any).mockResolvedValueOnce(undefined)
    const res = await createReportAction({ errors: {} }, makeForm({ messageTemplate: 'hi' }) as any)
    expect(res.errors.messageTemplate).toBe('Niepoprawny szablon')
  })

  test('createReportAction po sukcesie wywołuje createReport i odświeża ścieżkę', async () => {
    ;(validateOnSentOnly as any).mockReturnValue({ ok: true })
    ;(transpileToPythonRaw as any).mockResolvedValue('py')
    ;(currentUser as any).mockResolvedValue({ id: 'u1' })
    ;(reportInputSchema as any).parse.mockReturnValueOnce(true)
    ;(createReport as any).mockResolvedValue({ id: 'r1' })

    const res = await createReportAction({ errors: {} }, makeForm({ name: 'n', messageTemplate: 'm', conditionFormula: 'c' }) as any)
    expect(res.ok).toBe(true)
    expect(createReport).toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/notifications')
  })

  test('createReportAction zwraca błędy pól z walidacji Zod', async () => {
    ;(validateOnSentOnly as any).mockReturnValue({ ok: true })
    const err = { issues: [{ path: ['name'], message: 'bad' }] }
    ;(reportInputSchema as any).parse.mockImplementationOnce(() => { throw err })
    ;(mapZodToErrors as any).mockReturnValueOnce({ name: 'bad' })
    const res = await createReportAction({ errors: {} }, makeForm({ name: '' }) as any)
    expect(res.errors).toEqual({ name: 'bad' })
  })

  test('funkcje pomocnicze delete/list/get delegują do warstwy biblioteki', async () => {
    ;(currentUser as any).mockResolvedValue({ id: 'uX' })
    ;(deleteReport as any).mockResolvedValue('del')
    ;(listReports as any).mockResolvedValue('list')
    ;(getReport as any).mockResolvedValue('get')
    expect(await deleteReportAction('id')).toBe('del')
    expect(await listReportsAction()).toBe('list')
    expect(await getReportAction('id')).toBe('get')
  })

  test('updateReportAction zwraca błąd pola conditionFormula, gdy jest nieprawidłowe', async () => {
    ;(validateOnSentOnly as any).mockReturnValueOnce({ ok: false, msg: 'bad' })
    const res = await updateReportAction('id', { errors: {} }, makeForm({ conditionFormula: 'x' }) as any)
    expect(res.errors.conditionFormula).toBeDefined()
  })

  test('updateReportAction zwraca błąd pola messageTemplate, gdy brakuje transpilacji', async () => {
    ;(validateOnSentOnly as any).mockReturnValue({ ok: true })
    ;(transpileToPythonRaw as any).mockResolvedValueOnce(undefined)
    const res = await updateReportAction('id', { errors: {} }, makeForm({ messageTemplate: 'm' }) as any)
    expect(res.errors.messageTemplate).toBe('Niepoprawny szablon')
  })

  test('updateReportAction po sukcesie wywołuje updateReport i odświeża ścieżkę', async () => {
    ;(validateOnSentOnly as any).mockReturnValue({ ok: true })
    ;(transpileToPythonRaw as any).mockResolvedValue('py')
    ;(currentUser as any).mockResolvedValue({ id: 'u2' })
    ;(updateReport as any).mockResolvedValue({ id: 'r2' })
    const res = await updateReportAction('id', { errors: {} }, makeForm({ name: 'n', enabled: 'on', frequencyValue: '5', frequencyUnit: 'h', conditionFormula: 'c', messageTemplate: 'm' }) as any)
    expect(res.ok).toBe(true)
    expect(updateReport).toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/notifications')
  })

  test('updateReportAction zwraca błędy pól z walidacji Zod po wyjątku', async () => {
    const err = { issues: [{ path: ['name'], message: 'bad' }] }
    ;(updateReport as any).mockImplementationOnce(() => { throw err })
    ;(mapZodToErrors as any).mockReturnValueOnce({ name: 'bad' })
    const res = await updateReportAction('id', { errors: {} }, makeForm({ name: '' }) as any)
    expect(res.errors).toEqual({ name: 'bad' })
  })

  test('updateReportAction zwraca błąd ogólny przy wyjątku innym niż Zod', async () => {
    ;(updateReport as any).mockImplementationOnce(() => { throw new Error('boom') })
    const res = await updateReportAction('id', { errors: {} }, makeForm({}) as any)
    expect(res.error).toBeDefined()
  })
})
