import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ModelsProvider } from '@/context/ModelsContext'
import ModelsListPage from '@/app/(authorized)/models/page'
import NewModelPage from '@/app/(authorized)/models/new/page'
import EditModelPage from '@/app/(authorized)/models/[id]/page'

let store = [
  { id: 'm0', name: 'Base', type: 'chronos', mode: 'pretrained', updatedAt: '2025-01-01' },
]

let fnStore = [
  { id: 'fn0', name: 'foo', description: 'bar', body: 'return 1', userId: 'u1' },
]

const listModelsAction = jest.fn(async () => [...store])
const createModelAction = jest.fn(async (_prev, formData) => {
  const name = formData.get('name') || ''
  const id = `m${store.length}`
  const record = { id, name, type: String(formData.get('type') || '') || 'chronos', mode: 'pretrained', updatedAt: new Date().toISOString() }
  store = [...store, record]
  return { ok: true, modelId: id, record, errors: {} }
})
const updateModelAction = jest.fn(async (_id, formData) => {
  const id = String(formData.get('id') || '')
  const type = String(formData.get('type') || '') || 'chronos'
  store = store.map((m) => (m.id === id ? { ...m, type } : m))
  const record = store.find((m) => m.id === id)
  return { ok: true, record, errors: {} }
})
const deleteModelAction = jest.fn(async (id) => {
  store = store.filter((m) => m.id !== id)
  return { ok: true }
})

jest.mock('@/app/(authorized)/models/actions', () => ({
  __esModule: true,
  listModelsAction: (...args) => listModelsAction(...args),
  createModelAction: (...args) => createModelAction(...args),
  updateModelAction: (...args) => updateModelAction(...args),
  deleteModelAction: (...args) => deleteModelAction(...args),
}))

jest.mock('@/app/(authorized)/functions/actions', () => ({
  __esModule: true,
  listFunctionsAction: jest.fn(async () => [...fnStore]),
  deleteFunctionAction: jest.fn(async (id) => { fnStore = fnStore.filter((f) => f.id !== id); return { ok: true } }),
  createFunctionAction: jest.fn(async (_prev, formData) => {
    const name = String(formData.get('name') || '')
    const id = `fn${fnStore.length}`
    const record = { id, name, description: String(formData.get('description') || ''), body: String(formData.get('body') || ''), userId: 'u1' }
    fnStore = [record, ...fnStore]
    return { ok: true, record, errors: {} }
  }),
  updateFunctionAction: jest.fn(async (id, _prev, formData) => {
    const name = String(formData.get('name') || '')
    fnStore = fnStore.map((f) => (f.id === id ? { ...f, name } : f))
    const record = fnStore.find((f) => f.id === id)
    return { ok: true, record, errors: {} }
  }),
}))

jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), prefetch: jest.fn(), back: jest.fn(), forward: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/models/m0',
  useParams: () => ({ id: 'm0' }),
}))

const Harness = () => (
  <ModelsProvider initialModels={store}>
    <NewModelPage />
    <ModelsListPage />
  </ModelsProvider>
)

describe('Models flow integration', () => {
  beforeEach(() => {
    store = [{ id: 'm0', name: 'Base', type: 'chronos', mode: 'pretrained', updatedAt: '2025-01-01' }]
    fnStore = [{ id: 'fn0', name: 'foo', description: 'bar', body: 'return 1', userId: 'u1' }]
    listModelsAction.mockClear()
    createModelAction.mockClear()
    updateModelAction.mockClear()
    deleteModelAction.mockClear()
  })

  test('tworzy model i pojawia się w tabeli', async () => {
    render(<Harness />)

    fireEvent.change(screen.getByPlaceholderText('np. prognoza_sprzedazy_q1'), { target: { value: 'NewModel' } })
    fireEvent.click(screen.getByRole('button', { name: /chronos/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Utwórz$/i }))

    await waitFor(() => expect(createModelAction).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText('NewModel')).toBeInTheDocument())
  })

  test('pokazuje błędy walidacji z serwera przy tworzeniu', async () => {
    createModelAction.mockResolvedValueOnce({ errors: { name: 'duplikat modelu' } })

    render(<Harness />)

    fireEvent.change(screen.getByPlaceholderText('np. prognoza_sprzedazy_q1'), { target: { value: 'Base' } })
    fireEvent.click(screen.getByRole('button', { name: /chronos/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Utwórz$/i }))

    await waitFor(() => expect(createModelAction).toHaveBeenCalled())
    expect(await screen.findByText('duplikat modelu')).toBeInTheDocument()
    expect(screen.queryByText('Base')).toBeInTheDocument()
  })

  test('edycja modelu zmienia typ w tabeli', async () => {
    render(
      <ModelsProvider initialModels={store}>
        <EditModelPage />
        <ModelsListPage />
      </ModelsProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: /morai/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Zapisz$/i }))

    await waitFor(() => expect(updateModelAction).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText('morai')).toBeInTheDocument())
  })

  test('usuwa model z tabeli', async () => {
    render(<Harness />)

    const deleteButtons = screen.getAllByTitle('Usuń')
    fireEvent.click(deleteButtons[0])
    fireEvent.click(await screen.findByText('Tak'))

    await waitFor(() => expect(deleteModelAction).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByText('Base')).not.toBeInTheDocument())
  })
})
