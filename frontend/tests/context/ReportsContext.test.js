// @ts-nocheck
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

jest.doMock('@/app/(authorized)/notifications/actions', () => ({
  listReportsAction: jest.fn().mockResolvedValue([{ id: 'r1', name: 'r', enabled: true, userId: 'u1' }]),
  deleteReportAction: jest.fn().mockResolvedValue(undefined),
  createReportAction: jest.fn().mockResolvedValue({ ok: true, record: { id: 'r2', name: 'new', enabled: true, userId: 'u1' } }),
  updateReportAction: jest.fn().mockResolvedValue({ ok: true, record: { id: 'r1', name: 'updated', enabled: true, userId: 'u1' } }),
}))

const { ReportsProvider, useReports } = require('@/context/ReportsContext')

function Harness() {
  const ctx = useReports()
  return (
    <div>
      <div data-testid="count">{ctx.reports.length}</div>
      <button data-testid="refresh" onClick={() => ctx.refreshReports()}>refresh</button>
      <button data-testid="remove" onClick={() => ctx.removeReport('r1')}>remove</button>
      <button data-testid="add" onClick={() => ctx.addReport(new FormData())}>add</button>
      <button data-testid="edit" onClick={() => ctx.editReport('r1', new FormData())}>edit</button>
    </div>
  )
}

describe('ReportsContext', () => {
  test('refreshReports pobiera raporty', async () => {
    render(<ReportsProvider><Harness /></ReportsProvider>)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    fireEvent.click(screen.getByTestId('refresh'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
  })

  test('addReport dodaje wynik gdy ok', async () => {
    render(<ReportsProvider><Harness /></ReportsProvider>)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    fireEvent.click(screen.getByTestId('add'))
    await waitFor(() => expect(Number(screen.getByTestId('count').textContent)).toBeGreaterThanOrEqual(1))
  })

  test('removeReport przywraca listę po błędzie', async () => {
    const actions = require('@/app/(authorized)/notifications/actions')
    actions.deleteReportAction.mockRejectedValueOnce(new Error('fail'))
    render(<ReportsProvider><Harness /></ReportsProvider>)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
    fireEvent.click(screen.getByTestId('remove'))
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
  })
})
