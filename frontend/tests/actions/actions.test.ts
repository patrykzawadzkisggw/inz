// @ts-nocheck
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: { widget: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() } } }))
jest.mock('@/lib/userFunctions', () => ({ __esModule: true, runPython: jest.fn() }))
jest.mock('@/lib/widgets', () => ({ __esModule: true, bulkUpdateWidgetPositions: jest.fn(), deleteWidget: jest.fn() }))
jest.mock('@clerk/nextjs/server', () => ({ __esModule: true, currentUser: jest.fn() }))

import prisma from '@/lib/prisma'
import { runPython } from '@/lib/userFunctions'
import { bulkUpdateWidgetPositions, deleteWidget } from '@/lib/widgets'
import { currentUser } from '@clerk/nextjs/server'

import {
  deleteWidgetAction,
  bulkUpdateWidgetPositionsAction,
  listWidgetsAction,
  getWidgetCacheAction,
  refreshWidgetAction,
} from '@/app/(authorized)/actions'

beforeEach(() => {
  ;(prisma as any).widget.findMany.mockReset()
  ;(prisma as any).widget.findUnique.mockReset()
  ;(prisma as any).widget.update.mockReset()
  ;(runPython as any).mockReset()
  ;(bulkUpdateWidgetPositions as any).mockReset()
  ;(deleteWidget as any).mockReset()
  ;(currentUser as any).mockReset()
})

describe('akcje widżetów', () => {
  test('deleteWidgetAction zwraca ok:false, gdy brakuje identyfikatora', async () => {
    const res = await deleteWidgetAction('')
    expect(res).toEqual({ ok: false })
  })

  test('deleteWidgetAction wywołuje deleteWidget i zwraca ok:true', async () => {
    ;(currentUser as any).mockResolvedValue({ id: 'u1' })
    ;(deleteWidget as any).mockResolvedValue(true)

    const res = await deleteWidgetAction('wid')

    expect(deleteWidget).toHaveBeenCalledWith('wid', 'u1')
    expect(res).toEqual({ ok: true })
  })

  test('bulkUpdateWidgetPositionsAction przekazuje żądanie do biblioteki i zwraca wynik', async () => {
    ;(currentUser as any).mockResolvedValue({ id: 'userX' })
    ;(bulkUpdateWidgetPositions as any).mockResolvedValue({ updated: true })

    const items = [{ id: 'a', x: 1, y: 2 }]
    const res = await bulkUpdateWidgetPositionsAction(items)

    expect(bulkUpdateWidgetPositions).toHaveBeenCalledWith(items, 'userX')
    expect(res).toEqual({ updated: true })
  })

  test('listWidgetsAction zwraca widżety bieżącego użytkownika', async () => {
    ;(currentUser as any).mockResolvedValue({ id: 'me' })
    ;(prisma as any).widget.findMany.mockResolvedValue([{ id: 'w1' }])

    const res = await listWidgetsAction()
    expect(prisma.widget.findMany).toHaveBeenCalledWith({ where: { userId: 'me' }, orderBy: { createdAt: 'asc' } })
    expect(res).toEqual([{ id: 'w1' }])
  })

  test('getWidgetCacheAction zwraca null, gdy brakuje identyfikatora', async () => {
    const res = await getWidgetCacheAction('')
    expect(res).toBeNull()
  })

  test('getWidgetCacheAction zwraca dane cacheJson, gdy widżet istnieje', async () => {
    ;(prisma as any).widget.findUnique.mockResolvedValue({ id: 'w1', cacheJson: { foo: 'bar' } })
    const res = await getWidgetCacheAction('w1')
    expect(prisma.widget.findUnique).toHaveBeenCalledWith({ where: { id: 'w1' } })
    expect(res).toEqual({ foo: 'bar' })
  })

  test('getWidgetCacheAction obsługuje błąd Prisma i zwraca null', async () => {
    ;(prisma as any).widget.findUnique.mockRejectedValue(new Error('db'))
    const res = await getWidgetCacheAction('w2')
    expect(res).toBeNull()
  })

  test('refreshWidgetAction obsługuje brak identyfikatora i brak widżetu', async () => {
    const r1 = await refreshWidgetAction('')
    expect(r1).toEqual({ ok: false, error: 'missing id' })

    ;(prisma as any).widget.findUnique.mockResolvedValue(null)
    const r2 = await refreshWidgetAction('nope')
    expect(r2).toEqual({ ok: false, error: 'not found' })
  })

  test('refreshWidgetAction uruchamia Pythona i aktualizuje pamięć podręczną, gdy istnieje content2', async () => {
    ;(prisma as any).widget.findUnique.mockResolvedValue({ id: 'w', content2: 'print(1)' })
    ;(runPython as any).mockResolvedValue({ result: 42 })
    ;(prisma as any).widget.update.mockResolvedValue({})

    const res = await refreshWidgetAction('w')

    expect(runPython).toHaveBeenCalledWith('print(1)')
    expect(prisma.widget.update).toHaveBeenCalledWith({ where: { id: 'w' }, data: { cacheJson: { result: 42 } } })
    expect(res).toEqual({ ok: true, cache: { result: 42 } })
  })

  test('refreshWidgetAction obsługuje błąd runPython i ustawia pamięć podręczną na null', async () => {
    ;(prisma as any).widget.findUnique.mockResolvedValue({ id: 'w', content2: 'bad code' })
    ;(runPython as any).mockRejectedValue(new Error('pyfail'))
    ;(prisma as any).widget.update.mockResolvedValue({})

    const res = await refreshWidgetAction('w')

    expect(runPython).toHaveBeenCalledWith('bad code')
    expect(prisma.widget.update).toHaveBeenCalledWith({ where: { id: 'w' }, data: { cacheJson: undefined } })
    expect(res).toEqual({ ok: true, cache: null })
  })

  test('refreshWidgetAction obsługuje widżet bez content2 (pamięć podręczna null)', async () => {
    ;(prisma as any).widget.findUnique.mockResolvedValue({ id: 'w2', content2: null })
    ;(prisma as any).widget.update.mockResolvedValue({})

    const res = await refreshWidgetAction('w2')
    expect(runPython).not.toHaveBeenCalled()
    expect(prisma.widget.update).toHaveBeenCalledWith({ where: { id: 'w2' }, data: { cacheJson: undefined } })
    expect(res).toEqual({ ok: true, cache: null })
  })
})
