// @ts-nocheck
jest.resetModules()

jest.doMock('@clerk/nextjs/server', () => ({ auth: jest.fn() }))
jest.doMock('@/lib/prisma', () => ({
  model: { findFirst: jest.fn(), findMany: jest.fn(), delete: jest.fn() },
  $transaction: jest.fn(),
  dataFeed: { deleteMany: jest.fn(), create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
  dataImport: { deleteMany: jest.fn(), create: jest.fn() },
  prediction: { deleteMany: jest.fn() },
  widget: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() }
}))
jest.doMock('@/lib/predictions', () => ({ triggerPredictionJobs: jest.fn(), savePredictionPayload: jest.fn(), deletePredictionJobs: jest.fn(), syncPredictionJobs: jest.fn() }))
jest.doMock('@/lib/models', () => ({ createModel: jest.fn(), updateModel: jest.fn(), modelInputSchema: { parse: (v) => v } }))
jest.doMock('@/lib/userFunctions', () => ({ mapZodToErrors: jest.fn(), normalizeDescription: (d) => d }))
jest.doMock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.doMock('@/lib/modelUtils', () => ({ buildForecastConfigFromForm: jest.fn(() => ({})), buildIntervalSpecFromForm: jest.fn(() => null), rowsToCsv: jest.fn(() => ({ csv: '', headers: [], delimiter: ',' })), parseImportForm: jest.fn(() => ({ rows: null, schemaJson: null, options: null })) }))

const actions = require('@/app/(authorized)/models/actions')
const prisma = require('@/lib/prisma')
const pred = require('@/lib/predictions')
const authMod = require('@clerk/nextjs/server')

function makeForm(pairs = []) { const m = new Map(pairs); return { get: (k) => m.get(k) ?? null } }

describe('dodatkowe testy akcji modeli', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('deleteModelAction zwraca błąd, gdy transakcja się nie powiedzie', async () => {
    authMod.auth.mockResolvedValue({ userId: 'u1' })
    prisma.model.findFirst.mockResolvedValue({ id: 'm1' })
    prisma.$transaction.mockRejectedValueOnce(new Error('tx fail'))
    const res = await actions.deleteModelAction('m1')
    expect(res.error).toBeDefined()
    expect(pred.deletePredictionJobs).not.toHaveBeenCalled()
  })

  test('updateModelAction zwraca błędy pól, gdy updateModel rzuca błąd Zod', async () => {
    authMod.auth.mockResolvedValue({ userId: 'u1' })
    prisma.model.findFirst.mockResolvedValue({ id: 'm1' })
    const models = require('@/lib/models')
    models.updateModel.mockRejectedValueOnce(new Error('zod-like'))
    const uf = require('@/lib/userFunctions')
    uf.mapZodToErrors.mockReturnValueOnce({ name: 'too short' })

    const res = await actions.updateModelAction({ errors: {} }, makeForm([['id', 'm1']]))
    expect(res.errors).toBeDefined()
    expect(res.errors.name).toBe('too short')
  })

  test('createModelAction zwraca ok mimo wyjątku podczas uruchamiania zadań predykcji', async () => {
    authMod.auth.mockResolvedValue({ userId: 'u2' })
    const models = require('@/lib/models')
    models.createModel.mockResolvedValueOnce({ id: 'mX' })
    const predMod = require('@/lib/predictions')
    predMod.triggerPredictionJobs.mockRejectedValueOnce(new Error('boom'))

    const fd = makeForm([['name','n'],['type','chronos']])
    const res = await actions.createModelAction({ errors: {} }, fd)
    expect(res.ok).toBe(true)
    expect(predMod.savePredictionPayload).not.toHaveBeenCalled()
  })
})
