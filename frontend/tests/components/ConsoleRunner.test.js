import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConsoleRunner } from '@/app/(authorized)/console/ConsoleRunner'

const formulaBoxMock = jest.fn(({ initialValue, onChangeText }) => (
  <textarea aria-label="formula" defaultValue={initialValue} onChange={(e) => onChangeText(e.target.value)} />
))

const chartMock = jest.fn(() => <div data-testid="chart" />)
const tableMock = jest.fn(() => <div data-testid="table" />)

const pushMock = jest.fn()
let searchParamsGetter = jest.fn(() => null)

jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: searchParamsGetter }),
}))

jest.mock('@/components/FormulaBox', () => ({
  __esModule: true,
  default: (props) => formulaBoxMock(props),
}))

jest.mock('@/components/custom/Chart2', () => ({
  __esModule: true,
  Chart2: (props) => chartMock(props),
}))

jest.mock('@/components/DataTable', () => ({
  __esModule: true,
  SimpleObjectTable: (props) => tableMock(props),
}))

describe('ConsoleRunner', () => {
  beforeEach(() => {
    pushMock.mockClear()
    searchParamsGetter = jest.fn(() => null)
    global.fetch = jest.fn()
    formulaBoxMock.mockClear()
    chartMock.mockClear()
    tableMock.mockClear()
  })

  test('pokazuje błąd gdy wysyłana jest pusta formuła', async () => {
    render(<ConsoleRunner />)

    fireEvent.click(screen.getByText('Wyczyść'))
    fireEvent.click(screen.getByText('Wyślij'))

    expect(await screen.findByText('Formuła jest pusta')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('wysyła kod, pokazuje stdout oraz strukturalne wyniki', async () => {
    const apiResponse = {
      output: 'OK wynik',
      results: [
        { type: 'text', text: 'tekst' },
        { type: 'table', columns: ['c1'], rows: [{ c1: 1 }] },
        { type: 'chart', chartType: 'bar', data: { series: { s1: [1, 2] } } },
      ],
    }
    global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(apiResponse) })

    render(<ConsoleRunner />)

    fireEvent.change(screen.getByLabelText('formula'), { target: { value: 'return 1;' } })
    fireEvent.click(screen.getByText('Wyślij'))

    expect(global.fetch).toHaveBeenCalledWith('/api/run', expect.objectContaining({ method: 'POST' }))

    await waitFor(() => expect(screen.getByText('Stdout')).toBeInTheDocument())
    expect(screen.getByText('OK wynik')).toBeInTheDocument()
    expect(screen.getByText('tekst')).toBeInTheDocument()
    expect(tableMock).toHaveBeenCalledWith(expect.objectContaining({ data: [{ c1: 1 }], columns: ['c1'] }))
    expect(chartMock).toHaveBeenCalledWith(expect.objectContaining({ result: expect.objectContaining({ chartType: 'bar' }) }))
  })

  test('auto wysyła kod z parametru query tylko raz', async () => {
    const encoded = encodeURIComponent('Auto run')
    searchParamsGetter = jest.fn((key) => (key === 'code' ? encoded : null))
    global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ output: 'z param', results: [] }) })

    render(<ConsoleRunner />)

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
    expect(pushMock).toHaveBeenCalled()
    expect(await screen.findByText('Stdout')).toBeInTheDocument()
    expect(screen.getByText('z param')).toBeInTheDocument()
  })
})
