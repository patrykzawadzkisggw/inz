// @ts-nocheck
import { waitFor } from '@testing-library/react'


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
jest.doMock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.doMock('@/lib/modelUtils', () => ({ buildForecastConfigFromForm: jest.fn(() => ({})), buildIntervalSpecFromForm: jest.fn(() => null), rowsToCsv: jest.fn(() => ({ csv: '', headers: [], delimiter: ',' })), parseImportForm: jest.fn(() => ({ rows: null, schemaJson: null, options: null })) }))

const actions = require('@/app/(authorized)/models/actions')
const prisma = require('@/lib/prisma')
const pred = require('@/lib/predictions')

describe('akcje modeli', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('deleteModelAction zwraca błąd, gdy brakuje identyfikatora', async () => {
    const res = await actions.deleteModelAction('')
    expect(res.error).toBeDefined()
  })

  test('deleteModelAction zwraca błąd, gdy model nie należy do użytkownika', async () => {
    const auth = require('@clerk/nextjs/server')
    auth.auth.mockResolvedValue({ userId: 'u1' })
    prisma.model.findFirst.mockResolvedValue(null)
    const res = await actions.deleteModelAction('mid')
    expect(res.error).toBeDefined()
  })

  test('deleteModelAction po sukcesie wykonuje transakcję i usuwa zadania predykcji', async () => {
    const auth = require('@clerk/nextjs/server')
    auth.auth.mockResolvedValue({ userId: 'u1' })
    prisma.model.findFirst.mockResolvedValue({ id: 'mid' })
    prisma.$transaction.mockResolvedValue([])
    const res = await actions.deleteModelAction('mid')
    expect(prisma.$transaction).toHaveBeenCalled()
    expect(pred.deletePredictionJobs).toHaveBeenCalledWith('mid')
    expect(res.ok).toBe(true)
  })

  test('createModelAction zwraca błąd, gdy brak uwierzytelnienia', async () => {
    const auth = require('@clerk/nextjs/server')
    auth.auth.mockResolvedValue({ userId: null })
    const res = await actions.createModelAction({ errors: {} }, new FormData())
    expect(res.error).toBeDefined()
  })

  test('createModelAction obsługuje błąd unikalności P2002', async () => {
    const auth = require('@clerk/nextjs/server')
    auth.auth.mockResolvedValue({ userId: 'u1' })
    const models = require('@/lib/models')
    models.createModel.mockRejectedValueOnce({ code: 'P2002' })
    const fd = new FormData()
    fd.set('name', 'n')
    fd.set('type', 'chronos')
    const res = await actions.createModelAction({ errors: {} }, fd)
    expect(res.errors.name).toBeDefined()
  })

  test('createModelAction po sukcesie uruchamia predykcje', async () => {
    const auth = require('@clerk/nextjs/server')
    auth.auth.mockResolvedValue({ userId: 'u1' })
    const models = require('@/lib/models')
    models.createModel.mockResolvedValue({ id: 'm1' })
    pred.triggerPredictionJobs.mockResolvedValue({ predictions: [] })
    const fd = new FormData()
    fd.set('name', 'n')
    fd.set('type', 'chronos')
    const res = await actions.createModelAction({ errors: {} }, fd)
    expect(res.ok).toBe(true)
    expect(pred.triggerPredictionJobs).toHaveBeenCalledWith('m1')
    expect(pred.savePredictionPayload).toHaveBeenCalledWith('m1', { predictions: [] })
  })

  test('listModelsAction zwraca błąd przy braku uwierzytelnienia', async () => {
    const auth = require('@clerk/nextjs/server')
    auth.auth.mockResolvedValue({ userId: null })
    const res = await actions.listModelsAction()
    expect(res.error).toBeDefined()
  })

  function makeForm(pairs = []) { const m = new Map(pairs); return { get: (k) => m.get(k) ?? null } }

  test('updateModelAction zwraca błąd, gdy brak identyfikatora', async () => {
    const auth = require('@clerk/nextjs/server')
    auth.auth.mockResolvedValue({ userId: 'u1' })
    const res = await actions.updateModelAction({ errors: {} }, makeForm([]))
    expect(res.error).toBeDefined()
  })

  test('updateModelAction stosuje konfigurację prognozy i obsługuje tworzenie lub aktualizację specyfikacji interwału oraz błąd synchronizacji', async () => {
    const auth = require('@clerk/nextjs/server')
    auth.auth.mockResolvedValue({ userId: 'u1' })
    const mu = require('@/lib/modelUtils')
    mu.buildForecastConfigFromForm.mockReturnValueOnce({ prediction_length: 20 })
    mu.buildIntervalSpecFromForm.mockReturnValueOnce({ spec: 'x' })

    prisma.model.findFirst.mockResolvedValueOnce({ configJson: { prediction_length: 5 } })
    prisma.model.findFirst.mockResolvedValueOnce({ id: 'm1' })

    prisma.dataFeed.findFirst.mockResolvedValueOnce({ id: 'f1' })
    const res1 = await actions.updateModelAction({ errors: {} }, makeForm([['id', 'm1']]))
    expect(prisma.dataFeed.update).toHaveBeenCalled()
    expect(res1.ok).toBe(true)

    prisma.dataFeed.findFirst.mockResolvedValueOnce(null)
    const predMod = require('@/lib/predictions')
    predMod.syncPredictionJobs.mockRejectedValueOnce(new Error('sync fail'))
    prisma.model.findFirst.mockResolvedValueOnce({ id: 'm1' })
    mu.buildIntervalSpecFromForm.mockReturnValueOnce({ spec: 'x' })
    const res2 = await actions.updateModelAction({ errors: {} }, makeForm([['id', 'm1']]))
    expect(prisma.dataFeed.create).toHaveBeenCalled()
    expect(res2.ok).toBe(true)
  })

  test('createModelAction tworzy źródło danych i import przy podanym interwale oraz wierszach, a następnie uruchamia predykcje', async () => {
    const auth = require('@clerk/nextjs/server')
    auth.auth.mockResolvedValue({ userId: 'u1' })
    const mu = require('@/lib/modelUtils')
    mu.buildIntervalSpecFromForm.mockReturnValueOnce({ spec: 'x' })
    mu.parseImportForm.mockReturnValueOnce({ rows: [{ a: 1 }], schemaJson: null, options: { sourceType: 'file', fileName: 'f.csv' } })
    mu.rowsToCsv.mockReturnValueOnce({ csv: 'a', headers: ['a'], delimiter: ',' })

    const models = require('@/lib/models')
    models.createModel.mockResolvedValueOnce({ id: 'm2' })
    const predMod = require('@/lib/predictions')
    predMod.triggerPredictionJobs.mockResolvedValueOnce({ predictions: [{ date: 'd', mean: 1 }] })

    const fd = makeForm([['name', 'n'], ['type', 'chronos']])
    const res = await actions.createModelAction({ errors: {} }, fd)
    expect(prisma.dataFeed.create).toHaveBeenCalled()
    expect(prisma.dataImport.create).toHaveBeenCalled()
    expect(predMod.triggerPredictionJobs).toHaveBeenCalled()
    expect(predMod.savePredictionPayload).toHaveBeenCalled()
    expect(res.ok).toBe(true)
  })

  test('addManualImportAction obsługuje brak uwierzytelnienia, identyfikatora lub modelu oraz ścieżkę sukcesu', async () => {
    const auth = require('@clerk/nextjs/server')
    auth.auth.mockResolvedValueOnce({ userId: null })
    const res0 = await actions.addManualImportAction({ errors: {} }, makeForm([['id', 'x']]))
    expect(res0.error).toBeDefined()

    auth.auth.mockResolvedValueOnce({ userId: 'u1' })
    const res1 = await actions.addManualImportAction({ errors: {} }, makeForm([]))
    expect(res1.error).toBeDefined()

    auth.auth.mockResolvedValueOnce({ userId: 'u1' })
    prisma.model.findFirst.mockResolvedValueOnce(null)
    const res2 = await actions.addManualImportAction({ errors: {} }, makeForm([['id', 'm3']]))
    expect(res2.error).toBeDefined()

    auth.auth.mockResolvedValueOnce({ userId: 'u1' })
    prisma.model.findFirst.mockResolvedValueOnce({ id: 'm3' })
    const mu = require('@/lib/modelUtils')
    mu.parseImportForm.mockReturnValueOnce({ rows: [{ a: 1 }], schemaJson: null, options: { sourceType: 'file', fileName: 'f.csv' } })
    mu.rowsToCsv.mockReturnValueOnce({ csv: 'a', headers: ['a'], delimiter: ',' })
    const predMod = require('@/lib/predictions')
    predMod.triggerPredictionJobs.mockResolvedValueOnce({ predictions: [] })

    const res3 = await actions.addManualImportAction({ errors: {} }, makeForm([['id', 'm3']]))
    expect(prisma.dataImport.create).toHaveBeenCalled()
    expect(predMod.triggerPredictionJobs).toHaveBeenCalledWith('m3')
    expect(predMod.savePredictionPayload).toHaveBeenCalled()
    expect(res3.ok).toBe(true)
  })

  test('listModelsAction zwraca modele, gdy uwierzytelnienie jest poprawne', async () => {
    const auth = require('@clerk/nextjs/server')
    auth.auth.mockResolvedValue({ userId: 'u1' })
    prisma.model.findMany.mockResolvedValueOnce([{ id: 'm1' }])
    const res = await actions.listModelsAction()
    expect(res).toEqual([{ id: 'm1' }])
  })
})
