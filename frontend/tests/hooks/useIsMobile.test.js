// @ts-nocheck
import React from 'react'
import { render, screen, act } from '@testing-library/react'

const { useIsMobile } = require('@/hooks/use-mobile')

function Harness() {
  const v = useIsMobile()
  return <div data-testid="ismobile">{String(v)}</div>
}

describe('useIsMobile', () => {
  let listeners = []
  const mockMatchMedia = (matches) => ({
    matches,
    addEventListener: (ev, cb) => { listeners.push(cb) },
    removeEventListener: (ev, cb) => { listeners = listeners.filter(f => f !== cb) },
  })

  beforeEach(() => {
    listeners = []
  })

  test('zwraca true gdy window.innerWidth < breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 })
    window.matchMedia = jest.fn().mockReturnValue(mockMatchMedia(true))
    render(<Harness />)
    expect(screen.getByTestId('ismobile').textContent).toBe('true')
  })

  test('reaguje na zmianę matchMedia', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 })
    window.matchMedia = jest.fn().mockReturnValue(mockMatchMedia(true))
    render(<Harness />)
    expect(screen.getByTestId('ismobile').textContent).toBe('true')

    act(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 })
      listeners.forEach(cb => cb({ matches: false }))
    })

    expect(screen.getByTestId('ismobile').textContent).toBe('false')
  })
})
