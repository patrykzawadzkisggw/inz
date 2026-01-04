// @ts-nocheck
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'

const { useRecordNavigator } = require('@/hooks/useRecordNavigator')

function Harness({ initial } = {}) {
  const h = useRecordNavigator({ initial })

  return (
    <div>
      <div data-testid="index">{h.index}</div>
      <div data-testid="records-length">{h.records.length}</div>
      <div data-testid="current-name">{h.current?.name}</div>
      <div data-testid="current-value">{h.current?.value}</div>
      <div data-testid="saved-length">{h.savedRecords.length}</div>
      <div data-testid="displayIndex">{h.displayIndex}</div>
      <div data-testid="displayTotal">{h.displayTotal}</div>

      <button data-testid="new" onClick={() => h.handleNew()}>new</button>
      <button data-testid="delete" onClick={() => h.handleDelete()}>delete</button>
      <button data-testid="prev" onClick={() => h.goPrev()}>prev</button>
      <button data-testid="next" onClick={() => h.goNext()}>next</button>
      <button data-testid="change-name" onClick={() => h.handleChange('name', 'n')}>chgName</button>
      <button data-testid="change-value" onClick={() => h.handleChange('value', 'v')}>chgVal</button>
    </div>
  )
}

describe('useRecordNavigator', () => {
  test('początkowy stan i dodawanie nowego rekordu po wypełnieniu', () => {
    render(<Harness />)
    expect(screen.getByTestId('records-length').textContent).toBe('1')
    fireEvent.click(screen.getByTestId('new'))
    expect(screen.getByTestId('records-length').textContent).toBe('1')

    fireEvent.click(screen.getByTestId('change-name'))
    fireEvent.click(screen.getByTestId('change-value'))
    fireEvent.click(screen.getByTestId('new'))
    expect(Number(screen.getByTestId('records-length').textContent)).toBeGreaterThan(1)
    expect(Number(screen.getByTestId('index').textContent)).toBeGreaterThanOrEqual(1)
  })

  test('goNext dodaje draft na końcu gdy current kompletne', () => {
    render(<Harness />)
    fireEvent.click(screen.getByTestId('change-name'))
    fireEvent.click(screen.getByTestId('change-value'))
    const prevLen = Number(screen.getByTestId('records-length').textContent)
    fireEvent.click(screen.getByTestId('next'))
    expect(Number(screen.getByTestId('records-length').textContent)).toBe(prevLen + 1)
  })

  test('handleDelete usuwa rekord i przywraca pusty gdy ostatni', () => {
    render(<Harness />)
    fireEvent.click(screen.getByTestId('delete'))
    expect(screen.getByTestId('records-length').textContent).toBe('1')
    fireEvent.click(screen.getByTestId('change-name'))
    fireEvent.click(screen.getByTestId('change-value'))
    fireEvent.click(screen.getByTestId('new'))
    expect(Number(screen.getByTestId('records-length').textContent)).toBeGreaterThan(1)
    fireEvent.click(screen.getByTestId('delete'))
    expect(Number(screen.getByTestId('records-length').textContent)).toBeGreaterThanOrEqual(1)
  })
})
