// @ts-nocheck
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

const { DashboardProvider, useDashboard } = require('@/context/DashboardContext')

function Harness() {
  const ctx = useDashboard()
  return (
    <div>
      <div data-testid="edit">{String(ctx.isEditMode)}</div>
      <div data-testid="modal">{String(ctx.isModalOpen)}</div>
      <button data-testid="toggle" onClick={() => ctx.toggleEditMode()}>toggle</button>
      <button data-testid="open" onClick={() => ctx.openModal()}>open</button>
      <button data-testid="close" onClick={() => ctx.closeModal()}>close</button>
    </div>
  )
}

describe('DashboardContext', () => {
  test('toggleEditMode zmienia stan', () => {
    render(<DashboardProvider><Harness /></DashboardProvider>)
    expect(screen.getByTestId('edit').textContent).toBe('false')
    fireEvent.click(screen.getByTestId('toggle'))
    expect(screen.getByTestId('edit').textContent).toBe('true')
  })

  test('open/close modal zmienia isModalOpen', () => {
    render(<DashboardProvider><Harness /></DashboardProvider>)
    expect(screen.getByTestId('modal').textContent).toBe('false')
    fireEvent.click(screen.getByTestId('open'))
    expect(screen.getByTestId('modal').textContent).toBe('true')
    fireEvent.click(screen.getByTestId('close'))
    expect(screen.getByTestId('modal').textContent).toBe('false')
  })
})
