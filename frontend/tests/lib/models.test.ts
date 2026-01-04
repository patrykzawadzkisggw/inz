// @ts-nocheck
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: { model: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() } } }))
jest.mock('@clerk/nextjs/server', () => ({ auth: jest.fn() }))

import prisma from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { forecastConfigSchema, modelInputSchema, createModel, getModel, updateModel } from '@/lib/models'

describe('lib/models — dodatkowe testy', () => {
  beforeEach(() => {
    ;(prisma as any).model.create.mockReset()
    ;(prisma as any).model.findUnique.mockReset()
    ;(prisma as any).model.update.mockReset()
    ;(auth as any).mockReset()
  })

  test('forecastConfigSchema ustawia wartości domyślne i normalizuje konfigurację', () => {
    const parsed = forecastConfigSchema.parse({})
    expect(parsed.prediction_length).toBe(12)
    expect(parsed.missing_strategy).toBe('interpolate')
    expect(parsed.holiday_treatment).toBe('none')
    expect(parsed.holiday_enabled).toBe(false)
  })

  test('modelInputSchema — walidacja nie przejdzie, gdy brakuje nazwy', () => {
    expect(() => modelInputSchema.parse({ type: 'chronos', mode: 'pretrained' } as any)).toThrow()
  })

  test('createModel przekazuje przetworzoną konfigurację forecastConfig do Prisma', async () => {
    const cfg = { prediction_length: 5, missing_strategy: 'zero', holiday_enabled: true }
    const created = { id: 'm1' }
    ;(prisma as any).model.create.mockResolvedValue(created)
    const res = await createModel('u1', { name: 'X', type: 'chronos', mode: 'pretrained', forecastConfig: cfg as any })
    expect(prisma.model.create).toHaveBeenCalled()
    const call = (prisma as any).model.create.mock.calls[0][0]
    expect(call.data.configJson).toBeDefined()
    expect(res).toEqual(created)
  })

  test('getModel wywołuje auth i pobiera model z powiązaniami', async () => {
    ;(auth as any).mockResolvedValue({ userId: 'uX' })
    ;(prisma as any).model.findUnique.mockResolvedValue({ id: 'm2' })
    const r = await getModel('m2')
    expect(prisma.model.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'm2', ownerId: 'uX' }, include: expect.any(Object) }))
    expect(r).toEqual({ id: 'm2' })
  })

  test('updateModel obsługuje pusty opis i zapisuje configJson gdy jest dostarczony', async () => {
    ;(auth as any).mockResolvedValue({ userId: 'uA' })
    ;(prisma as any).model.update.mockResolvedValue({ id: 'm3' })

    await updateModel('m3', { description: '' })
    const call1 = (prisma as any).model.update.mock.calls[0][0]
    expect(call1.where).toEqual({ id: 'm3', ownerId: 'uA' })
    expect(call1.data.description).toBeUndefined()

    ;(prisma as any).model.update.mockClear()
    const cfg = { prediction_length: 3 }
    await updateModel('m3', { forecastConfig: cfg as any })
    const call2 = (prisma as any).model.update.mock.calls[0][0]
    expect(call2.data.configJson).toBeDefined()
  })

  test('createModel z null userId — ownerId będzie undefined, configJson domyślnie pusty', async () => {
    const created = { id: 'mNull' }
    ;(prisma as any).model.create.mockResolvedValueOnce(created)
    const res = await createModel(null, { name: 'NullOwner', type: 'chronos', mode: 'pretrained' } as any)
    expect(prisma.model.create).toHaveBeenCalled()
    const call = (prisma as any).model.create.mock.calls.pop()[0]
    expect(call.data.ownerId).toBeUndefined()
    expect(call.data.configJson).toEqual({})
    expect(res).toEqual(created)
  })

  test('createModel rzuca błąd przy niepoprawnych danych wejściowych', async () => {
    await expect(createModel('u1', { name: '', type: 'invalid' } as any)).rejects.toThrow()
  })

  test('updateModel zapisuje przekazane pola: name, type i enableUpdates', async () => {
    ;(auth as any).mockResolvedValue({ userId: 'uZ' })
    ;(prisma as any).model.update.mockResolvedValueOnce({ id: 'mZ' })
    await updateModel('mZ', { name: 'NewName', type: 'morai', enableUpdates: false } as any)
    const call = (prisma as any).model.update.mock.calls[0][0]
    expect(call.where).toEqual({ id: 'mZ', ownerId: 'uZ' })
    expect(call.data.name).toBe('NewName')
    expect(call.data.type).toBe('morai')
    expect(call.data.enableUpdates).toBe(false)
  })
})
