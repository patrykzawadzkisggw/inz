// @ts-nocheck
import { waitFor } from '@testing-library/react'

jest.doMock('@/lib/widgets', () => ({ bulkUpdateWidgetPositions: jest.fn(), deleteWidget: jest.fn() }))
jest.doMock('@/lib/prisma', () => ({ widget: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() } }))
jest.doMock('@clerk/nextjs/server', () => ({ currentUser: jest.fn().mockResolvedValue({ id: 'u1' }) }))
jest.doMock('@/lib/userFunctions', () => ({ runPython: jest.fn() }))

const actions = require('@/app/(authorized)/actions')
const widgets = require('@/lib/widgets')
const prisma = require('@/lib/prisma')
const uf = require('@/lib/userFunctions')

describe('akcje aplikacji', () => {
  beforeEach(() => jest.clearAllMocks())

  test('deleteWidgetAction zwraca ok false, gdy brak identyfikatora', async () => {
    const res = await actions.deleteWidgetAction('')
    expect(res.ok).toBe(false)
  })

  test('deleteWidgetAction wywołuje deleteWidget, gdy podano identyfikator', async () => {
    const res = await actions.deleteWidgetAction('w1')
    expect(widgets.deleteWidget).toHaveBeenCalled()
    expect(res.ok).toBe(true)
  })

  test('listWidgetsAction zwraca widżety użytkownika', async () => {
    prisma.widget.findMany.mockResolvedValueOnce([{ id: 'w1' }])
    const res = await actions.listWidgetsAction()
    expect(res).toEqual([{ id: 'w1' }])
  })

  test('getWidgetCacheAction zwraca null, gdy brak identyfikatora', async () => {
    const res = await actions.getWidgetCacheAction('')
    expect(res).toBeNull()
  })

  test('refreshWidgetAction zwraca błąd not found, gdy widżet nie istnieje', async () => {
    prisma.widget.findUnique.mockResolvedValueOnce(null)
    const res = await actions.refreshWidgetAction('w1')
    expect(res.ok).toBe(false)
  })

  test('refreshWidgetAction uruchamia Pythona i aktualizuje pamięć podręczną', async () => {
    prisma.widget.findUnique.mockResolvedValueOnce({ id: 'w1', content2: 'code' })
    uf.runPython.mockResolvedValueOnce({ some: 'cache' })
    prisma.widget.update.mockResolvedValueOnce({})
    const res = await actions.refreshWidgetAction('w1')
    expect(res.ok).toBe(true)
    expect(uf.runPython).toHaveBeenCalled()
    expect(prisma.widget.update).toHaveBeenCalled()
  })
})
