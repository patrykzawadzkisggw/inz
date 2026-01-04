import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConsoleRunner } from '@/app/(authorized)/console/ConsoleRunner'

const pushMock = jest.fn()
let searchParamsGetter = jest.fn(() => null)

jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => ({ get: searchParamsGetter }),
}))

const emptyModels = []
jest.mock('@/context/ModelsContext', () => ({
  __esModule: true,
  useModels: () => ({ models: emptyModels }),
}))

const emptyFunctions = []
jest.mock('@/context/UserFunctionsContext', () => ({
  __esModule: true,
  useUserFunctions: () => ({ functions: emptyFunctions }),
}))

jest.mock('@/components/custom/Chart2', () => ({ __esModule: true, Chart2: () => <div data-testid="chart" /> }))
jest.mock('@/components/DataTable', () => ({ __esModule: true, SimpleObjectTable: () => <div data-testid="table" /> }))

describe('ConsoleRunner flow', () => {
  beforeEach(() => {
    pushMock.mockClear()
    searchParamsGetter = jest.fn(() => null)
    global.fetch = jest.fn()
  })

  test('wykonuje kod i pokazuje stdout oraz struktury', async () => {
    const apiResponse = {
      output: 'OK wynik',
      results: [
        { type: 'text', text: 'tekst' },
        { type: 'table', columns: ['c1'], rows: [{ c1: 1 }] },
        { type: 'chart', chartType: 'bar', data: { series: { s1: [1] } } },
      ],
    }
    global.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(apiResponse) })

    render(<ConsoleRunner />)

    fireEvent.change(screen.getByPlaceholderText('Napisz formułę tutaj'), { target: { value: 'return 1;' } })
    fireEvent.click(screen.getByText('Wyślij'))

    await waitFor(() => expect(screen.getByText('Stdout')).toBeInTheDocument())
    expect(screen.getByText('OK wynik')).toBeInTheDocument()
    expect(screen.getByText('tekst')).toBeInTheDocument()
  })

  test('pokazuje błąd API', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({ error: 'fail' }) })

    render(<ConsoleRunner />)

    fireEvent.change(screen.getByPlaceholderText('Napisz formułę tutaj'), { target: { value: 'return 1;' } })
    fireEvent.click(screen.getByText('Wyślij'))

    await waitFor(() => expect(screen.getByText('fail')).toBeInTheDocument())
  })
})
