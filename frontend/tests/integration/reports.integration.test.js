import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { ReportsProvider } from '@/context/ReportsContext'
import ReportsPage from '@/app/(authorized)/notifications/page'
import NewReportPage from '@/app/(authorized)/notifications/new/page'
import EditReportPage from '@/app/(authorized)/notifications/[id]/page'

let store = [
  { id: 'r0', name: 'Rap0', enabled: true, frequencyValue: 1, frequencyUnit: 'd', userId: 'u1' },
]

const listReportsAction = jest.fn(async () => [...store])
const createReportAction = jest.fn(async (_prev, formData) => {
  const name = String(formData.get('name') || '')
  const id = `r${store.length}`
  const record = {
    id,
    name,
    enabled: formData.get('enabled') === 'on',
    frequencyValue: Number(formData.get('frequencyValue') || 0),
    frequencyUnit: String(formData.get('frequencyUnit') || ''),
    userId: 'u1',
  }
  store = [record, ...store]
  return { ok: true, record, errors: {} }
})
const updateReportAction = jest.fn(async (id, _prev, formData) => {
  const name = String(formData.get('name') || 'upd')
  store = store.map((r) => (r.id === id ? { ...r, name } : r))
  return { ok: true, record: store.find((r) => r.id === id), errors: {} }
})
const deleteReportAction = jest.fn(async (id) => { store = store.filter((r) => r.id !== id) })

jest.mock('@/app/(authorized)/notifications/actions', () => ({
  __esModule: true,
  listReportsAction: (...args) => listReportsAction(...args),
  createReportAction: (...args) => createReportAction(...args),
  updateReportAction: (...args) => updateReportAction(...args),
  deleteReportAction: (...args) => deleteReportAction(...args),
}))

jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/notifications',
  useSearchParams: () => ({ get: () => null }),
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

const Harness = () => (
  <ReportsProvider initialReports={store}>
    <NewReportPage />
    <ReportsPage />
  </ReportsProvider>
)

describe('Reports flow integration', () => {
  beforeEach(() => {
    store = [{ id: 'r0', name: 'Rap0', enabled: true, frequencyValue: 1, frequencyUnit: 'd', userId: 'u1' }]
    listReportsAction.mockClear()
    createReportAction.mockClear()
    updateReportAction.mockClear()
    deleteReportAction.mockClear()
  })

  test('dodaje raport po ręcznym wypełnieniu pól i widać go na liście', async () => {
    render(<Harness />)

    fireEvent.change(screen.getByLabelText('Nazwa raportu'), { target: { value: 'RapX' } })
    fireEvent.change(screen.getByLabelText('Wykonuj co'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Jednostka'), { target: { value: 'h' } })

    const formulas = screen.getAllByPlaceholderText('Napisz formułę tutaj')
    fireEvent.change(formulas[0], { target: { value: 'return true;' } })
    fireEvent.change(formulas[1], { target: { value: 'Wiadomość' } })

    fireEvent.click(screen.getByText('Dodaj'))

    await waitFor(() => expect(createReportAction).toHaveBeenCalled())
    const fd = createReportAction.mock.calls[0][1]
    expect(fd.get('name')).toBe('RapX')
    expect(fd.get('enabled')).toBe('on')
    expect(fd.get('frequencyValue')).toBe('5')
    expect(fd.get('frequencyUnit')).toBe('h')
    expect(fd.get('conditionFormula')).toBe('return true;')
    expect(fd.get('messageTemplate')).toBe('Wiadomość')

    expect(await screen.findByText('RapX')).toBeInTheDocument()
  })

  test('usuwa raport z tabeli z potwierdzeniem', async () => {
    render(<Harness />)

    const row = screen.getByText('Rap0').closest('tr')
    const buttons = within(row).getAllByRole('button')
    fireEvent.click(buttons[0])

    fireEvent.click(await screen.findByText('Tak'))

    await waitFor(() => expect(deleteReportAction).toHaveBeenCalledWith('r0'))
  })

  test('edytuje raport przez formularz edycji', async () => {
    render(
      <ReportsProvider initialReports={store}>
        <EditReportPage params={{ id: 'r0' }} />
        <ReportsPage />
      </ReportsProvider>
    )

    fireEvent.change(screen.getByLabelText('Nazwa raportu'), { target: { value: 'Rap1' } })
    fireEvent.change(screen.getByLabelText('Wykonuj co'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Jednostka'), { target: { value: 'd' } })
    const formulas = screen.getAllByPlaceholderText('Napisz formułę tutaj')
    fireEvent.change(formulas[0], { target: { value: 'return x > 0;' } })
    fireEvent.change(formulas[1], { target: { value: 'Nowa treść' } })
    fireEvent.click(screen.getByText('Zapisz zmiany'))

    await waitFor(() => expect(updateReportAction).toHaveBeenCalled())
    const fd = updateReportAction.mock.calls[0][2]
    expect(fd.get('name')).toBe('Rap1')
    expect(fd.get('frequencyValue')).toBe('2')
    expect(fd.get('frequencyUnit')).toBe('d')
    expect(fd.get('conditionFormula')).toBe('return x > 0;')
    expect(fd.get('messageTemplate')).toBe('Nowa treść')
    expect(await screen.findByText('Rap1')).toBeInTheDocument()
  })
})
