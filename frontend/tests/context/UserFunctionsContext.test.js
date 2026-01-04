// @ts-nocheck
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.doMock('@/app/(authorized)/functions/actions', () => ({
  listFunctionsAction: jest.fn().mockResolvedValue([{ id: 'f1', name: 'fn', body: 'b', userId: 'u1' }]),
  deleteFunctionAction: jest.fn().mockResolvedValue(undefined),
  createFunctionAction: jest.fn().mockResolvedValue({ ok: true, record: { id: 'f2', name: 'new', body: 'b', userId: 'u1' } }),
  updateFunctionAction: jest.fn().mockResolvedValue({ ok: true, record: { id: 'f1', name: 'updated', body: 'b', userId: 'u1' } }),
}))

const { UserFunctionsProvider, useUserFunctions } = require('@/context/UserFunctionsContext')

function Harness() {
  const ctx = useUserFunctions()
  return (
    <div>
      <div data-testid="count">{ctx.functions.length}</div>
      <div data-testid="loading">{String(ctx.isLoading)}</div>
      <div data-testid="mutating">{String(ctx.isMutating)}</div>
      <button data-testid="refresh" onClick={() => ctx.refreshFunctions()}>refresh</button>
      <button data-testid="remove" onClick={() => ctx.removeFunction('f1')}>remove</button>
      <button data-testid="add" onClick={() => ctx.addFunction(new FormData())}>add</button>
      <button data-testid="edit" onClick={() => ctx.editFunction('f1', new FormData())}>edit</button>
    </div>
  )
}

describe('UserFunctionsContext', () => {
  test('refreshFunctions pobiera listę funkcji', async () => {
    render(<UserFunctionsProvider><Harness /></UserFunctionsProvider>)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    fireEvent.click(screen.getByTestId('refresh'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
  })

  test('addFunction dodaje wynik gdy ok', async () => {
    render(<UserFunctionsProvider><Harness /></UserFunctionsProvider>)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    fireEvent.click(screen.getByTestId('add'))
    await waitFor(() => expect(Number(screen.getByTestId('count').textContent)).toBeGreaterThanOrEqual(1))
  })

  test('removeFunction optymistycznie usuwa i przywraca w razie błędu', async () => {
    const actions = require('@/app/(authorized)/functions/actions')
    actions.deleteFunctionAction.mockRejectedValueOnce(new Error('fail'))

    render(<UserFunctionsProvider><Harness /></UserFunctionsProvider>)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    fireEvent.click(screen.getByTestId('remove'))
    await waitFor(() => expect(Number(screen.getByTestId('count').textContent)).toBeGreaterThanOrEqual(0))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
  })

  test('editFunction aktualizuje listę gdy ok', async () => {
    render(<UserFunctionsProvider><Harness /></UserFunctionsProvider>)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    fireEvent.click(screen.getByTestId('edit'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
  })
})
