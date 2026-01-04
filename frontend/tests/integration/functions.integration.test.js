import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { UserFunctionsProvider } from '@/context/UserFunctionsContext'
import FunctionsPage from '@/app/(authorized)/functions/page'
import NewFunctionPage from '@/app/(authorized)/functions/new/page'
import EditFunctionPage from '@/app/(authorized)/functions/[id]/page'

let store = [
  { id: 'f0', name: 'Fn0', description: 'desc', body: 'return 1;', userId: 'u1' },
]

const listFunctionsAction = jest.fn(async () => [...store])
const createFunctionAction = jest.fn(async (_prev, formData) => {
  const name = String(formData.get('name') || '')
  const id = `f${store.length}`
  const record = { id, name, description: String(formData.get('description') || ''), body: String(formData.get('body') || ''), userId: 'u1' }
  store = [record, ...store]
  return { ok: true, record, errors: {} }
})
const updateFunctionAction = jest.fn(async (id, _prev, formData) => {
  const desc = String(formData.get('description') || '')
  store = store.map((f) => (f.id === id ? { ...f, description: desc } : f))
  return { ok: true, record: store.find((f) => f.id === id), errors: {} }
})
const deleteFunctionAction = jest.fn(async (id) => { store = store.filter((f) => f.id !== id) })

jest.mock('@/app/(authorized)/functions/actions', () => ({
  __esModule: true,
  listFunctionsAction: (...args) => listFunctionsAction(...args),
  createFunctionAction: (...args) => createFunctionAction(...args),
  updateFunctionAction: (...args) => updateFunctionAction(...args),
  deleteFunctionAction: (...args) => deleteFunctionAction(...args),
}))

jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/functions',
  useSearchParams: () => ({ get: () => null }),
}))

const emptyModels = []
jest.mock('@/context/ModelsContext', () => ({
  __esModule: true,
  useModels: () => ({ models: emptyModels }),
}))

const Harness = () => (
  <UserFunctionsProvider initialFunctions={store}>
    <NewFunctionPage />
    <FunctionsPage />
  </UserFunctionsProvider>
)

describe('Functions flow integration', () => {
  beforeEach(() => {
    store = [{ id: 'f0', name: 'Fn0', description: 'desc', body: 'return 1;', userId: 'u1' }]
    listFunctionsAction.mockClear()
    createFunctionAction.mockClear()
    updateFunctionAction.mockClear()
    deleteFunctionAction.mockClear()
  })

  test('dodaje funkcję po ręcznym wypełnieniu pól i widać ją na liście', async () => {
    render(<Harness />)

    fireEvent.change(screen.getByLabelText('Nazwa funkcji'), { target: { value: 'NowaFn' } })
    fireEvent.change(screen.getByLabelText('Opis (opcjonalnie)'), { target: { value: 'Opis nowej funkcji' } })
    fireEvent.change(screen.getByPlaceholderText('Napisz formułę tutaj'), { target: { value: 'return 7;' } })

    fireEvent.click(screen.getByText('Dodaj'))

    await waitFor(() => expect(createFunctionAction).toHaveBeenCalled())
    const fd = createFunctionAction.mock.calls[0][1]
    expect(fd.get('name')).toBe('NowaFn')
    expect(fd.get('description')).toBe('Opis nowej funkcji')
    expect(fd.get('body')).toBe('return 7;')
    expect(await screen.findByText('NowaFn')).toBeInTheDocument()
  })

  test('usuwa funkcję z tabeli z potwierdzeniem', async () => {
    render(<Harness />)

    const row = screen.getByText('Fn0').closest('tr')
    const buttons = within(row).getAllByRole('button')
    fireEvent.click(buttons[0])

    fireEvent.click(await screen.findByText('Tak'))

    await waitFor(() => expect(deleteFunctionAction).toHaveBeenCalledWith('f0'))
  })

  test('edytuje funkcję przez formularz edycji', async () => {
    render(
      <UserFunctionsProvider initialFunctions={store}>
        <EditFunctionPage params={{ id: 'f0' }} />
        <FunctionsPage />
      </UserFunctionsProvider>
    )

    fireEvent.change(screen.getByLabelText('Opis (opcjonalnie)'), { target: { value: 'Nowy opis' } })
    fireEvent.change(screen.getByPlaceholderText('Napisz formułę tutaj'), { target: { value: 'return 99;' } })
    fireEvent.click(screen.getByText('Zapisz zmiany'))

    await waitFor(() => expect(updateFunctionAction).toHaveBeenCalled())
    const fd = updateFunctionAction.mock.calls[0][2]
    expect(fd.get('description')).toBe('Nowy opis')
    expect(fd.get('body')).toBe('return 99;')
    expect(screen.getByText('Nowy opis')).toBeInTheDocument()
  })
})
