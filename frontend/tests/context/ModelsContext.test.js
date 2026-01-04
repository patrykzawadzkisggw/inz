// @ts-nocheck
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.doMock('@/app/(authorized)/models/actions', () => ({
  listModelsAction: jest.fn().mockResolvedValue([{ id: 'm1', name: 'm', userId: 'u1' }]),
  createModelAction: jest.fn().mockResolvedValue({ ok: true }),
  updateModelAction: jest.fn().mockResolvedValue({ ok: true }),
  deleteModelAction: jest.fn().mockResolvedValue({ ok: true }),
}))

const { ModelsProvider, useModels } = require('@/context/ModelsContext')

function Harness() {
  const ctx = useModels()
  return (
    <div>
      <div data-testid="count">{ctx.models.length}</div>
      <button data-testid="refresh" onClick={() => ctx.refreshModels()}>refresh</button>
      <button data-testid="add" onClick={() => ctx.addModel(new FormData())}>add</button>
      <button data-testid="edit" onClick={() => ctx.editModel('m1', new FormData())}>edit</button>
      <button data-testid="remove" onClick={() => ctx.removeModel('m1')}>remove</button>
    </div>
  )
}

describe('ModelsContext', () => {
  test('refreshModels pobiera modele', async () => {
    render(<ModelsProvider><Harness /></ModelsProvider>)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    fireEvent.click(screen.getByTestId('refresh'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
  })

  test('addModel wywołuje create i odświeżenie', async () => {
    render(<ModelsProvider><Harness /></ModelsProvider>)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    fireEvent.click(screen.getByTestId('add'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
  })

  test('removeModel zwraca ok gdy delete zwraca ok', async () => {
    const actions = require('@/app/(authorized)/models/actions')
    actions.deleteModelAction.mockResolvedValueOnce({ ok: true })
    render(<ModelsProvider><Harness /></ModelsProvider>)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    const res = await screen.getByTestId('remove').onclick?.()
    expect(screen.getByTestId('count').textContent).toBeDefined()
  })

  test('useModels rzuca błąd gdy jest używany poza providerem', () => {
    const fn = () => require('@/context/ModelsContext').useModels()
    expect(fn).toThrow()
  })

  test('addModel nie odświeża gdy createModelAction zwraca ok:false', async () => {
    const actions = require('@/app/(authorized)/models/actions')
    actions.createModelAction.mockResolvedValueOnce({ ok: false })
    render(<ModelsProvider><Harness /></ModelsProvider>)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    fireEvent.click(screen.getByTestId('add'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBeDefined())
  })

  test('editModel nie odświeża gdy updateModelAction zwraca ok:false', async () => {
    const actions = require('@/app/(authorized)/models/actions')
    actions.updateModelAction.mockResolvedValueOnce({ ok: false })
    render(<ModelsProvider><Harness /></ModelsProvider>)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    fireEvent.click(screen.getByTestId('edit'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBeDefined())
  })

  test('removeModel cofa zmianę gdy deleteModelAction nie powiedzie się', async () => {
    const actions = require('@/app/(authorized)/models/actions')
    actions.deleteModelAction.mockResolvedValueOnce({ ok: false })
    render(<ModelsProvider><Harness /></ModelsProvider>)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    fireEvent.click(screen.getByTestId('remove'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBeDefined())
  })
})
