import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Card from '@/components/Card'

jest.mock('@/app/(authorized)/actions', () => ({
  getWidgetCacheAction: jest.fn(),
  refreshWidgetAction: jest.fn(),
}))

jest.mock('@/components/custom/Chart2', () => ({ Chart2: ({ result, loading, error }) => (
  <div data-testid="chart" data-loading={loading} data-error={error}>{result ? JSON.stringify(result) : 'nochart'}</div>
)}))

jest.mock('@/components/DataTable', () => ({ SimpleObjectTable: ({ data, columns }) => (
  <div data-testid="table">{(columns || []).join(',')}|{JSON.stringify(data)}</div>
)}))

jest.mock('@/lib/cardHelpers', () => ({
  extractChartFromCache: jest.fn(),
  extractTableFromCache: jest.fn(),
  extractTextFromCache: jest.fn(),
}))

const { getWidgetCacheAction, refreshWidgetAction } = require('@/app/(authorized)/actions')
const { extractChartFromCache, extractTableFromCache, extractTextFromCache } = require('@/lib/cardHelpers')

describe('Card', () => {
  beforeAll(() => {
    global.ResizeObserver = class {
      constructor(cb) { this.cb = cb }
      observe() {}
      disconnect() {}
    }
    Object.defineProperty(global.navigator, 'clipboard', {
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('odświeża tekst i pokazuje zaktualizowaną treść', async () => {
    extractTextFromCache.mockReturnValue('fresh text')
    getWidgetCacheAction.mockResolvedValue([{ type: 'text', text: 'fresh text' }])
    refreshWidgetAction.mockResolvedValue(undefined)

    render(<Card widgetId="w1" type="tekst" cacheJason={[{ type: 'text', text: 'old' }]} />)

    fireEvent.click(screen.getByRole('button', { name: /open dropdown/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Odśwież' }))

    await waitFor(() => expect(getWidgetCacheAction).toHaveBeenCalledWith('w1'))
    expect(screen.getByText('fresh text')).toBeInTheDocument()
  })

  test('ładuje wykres i przekazuje wynik do Chart2', async () => {
    extractChartFromCache.mockReturnValue({ series: [1] })
    getWidgetCacheAction.mockResolvedValue([{ type: 'chart' }])

    render(<Card widgetId="c1" type="wykres" />)

    await waitFor(() => expect(screen.getByTestId('chart').textContent).toContain('series'))
  })

  test('odświeżenie tabeli ustawia SimpleObjectTable', async () => {
    extractTableFromCache.mockReturnValue({ columns: ['c'], rows: [{ c: 1 }] })
    getWidgetCacheAction.mockResolvedValue([{ type: 'table' }])
    refreshWidgetAction.mockResolvedValue(undefined)

    render(<Card widgetId="t1" type="tabela" />)

    fireEvent.click(screen.getByRole('button', { name: /open dropdown/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Odśwież' }))

    await waitFor(() => expect(screen.getByTestId('table').textContent).toContain('c|'))
    expect(screen.getByTestId('table').textContent).toContain('1')
  })

  test('menu akcji wywołuje edycję, kopiowanie i usuwanie', async () => {
    const onRequestEdit = jest.fn()
    const onRequestDelete = jest.fn()
    render(<Card widgetId="idx" type="tekst" onRequestEdit={onRequestEdit} onRequestDelete={onRequestDelete} />)

    // edycja
    fireEvent.click(screen.getByRole('button', { name: /open dropdown/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Edytuj' }))
    expect(onRequestEdit).toHaveBeenCalled()

    // kopiuj
    fireEvent.click(screen.getByRole('button', { name: /open dropdown/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Kopiuj ID' }))
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('idx'))

    // usuń
    fireEvent.click(screen.getByRole('button', { name: /open dropdown/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Usuń' }))
    expect(onRequestDelete).toHaveBeenCalled()
  })
})
