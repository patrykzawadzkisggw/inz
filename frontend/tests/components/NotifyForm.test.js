import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const actualReact = jest.requireActual('react')
const mockedUseActionState = jest.fn((reducer, initial) => {
  const [state, setState] = actualReact.useState(initial)
  const formAction = async (formData) => {
    const res = await reducer(state, formData)
    setState(res)
    return res
  }
  return [state, formAction, false]
})

jest.mock('react', () => ({
  __esModule: true,
  ...jest.requireActual('react'),
  default: jest.requireActual('react'),
  useActionState: (reducer, initial) => mockedUseActionState(reducer, initial),
}))

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({ push: pushMock }),
}))

jest.mock('@/components/FormulaBox', () => ({
  __esModule: true,
  default: ({ initialValue, onChangeText }) => (
    <textarea aria-label="formula" defaultValue={initialValue} onChange={(e) => onChangeText(e.target.value)} />
  ),
}))

import NotifyForm from '@/components/notify/NotifyForm'

describe('NotifyForm', () => {
  beforeEach(() => {
    pushMock.mockClear()
    mockedUseActionState.mockClear()
  })

  test('przesyła dane kliencko i przekierowuje po sukcesie', async () => {
    let resolveSubmit
    const onSubmitClient = jest.fn(
      () =>
        new Promise((res) => {
          resolveSubmit = res
        })
    )

    const { container } = render(
      <NotifyForm
        userId="user-1"
        onSubmitClient={onSubmitClient}
        initialName="Raport"
        initialContent="Treść"
      />
    )

    fireEvent.change(screen.getByLabelText('Nazwa raportu'), { target: { value: 'Nowy' } })
    fireEvent.change(screen.getByLabelText('Wykonuj co'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('Jednostka'), { target: { value: 'h' } })
    fireEvent.change(screen.getAllByLabelText('formula')[0], { target: { value: 'function onSent(){return False;}' } })
    fireEvent.change(screen.getAllByLabelText('formula')[1], { target: { value: 'Msg' } })

    const form = container.querySelector('form')
    if (!form) throw new Error('Form element not found')
    fireEvent.submit(form)

    resolveSubmit({ ok: true, errors: {} })

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/notifications'))
    expect(onSubmitClient).toHaveBeenCalled()
  })

  test('pokazuje błędy walidacji i nie przekierowuje', async () => {
    const onSubmitClient = jest.fn(async () => ({
      errors: {
        name: 'Błąd nazwy',
        frequencyUnit: 'Błąd jednostki',
        conditionFormula: 'Błąd warunku',
        messageTemplate: 'Błąd treści',
      },
      error: 'Ogólny błąd',
    }))

    const { container } = render(<NotifyForm isEditMode initialName="Edycja" onSubmitClient={onSubmitClient} />)

    const form = container.querySelector('form')
    if (!form) throw new Error('Form element not found')
    fireEvent.submit(form)

    await waitFor(() => expect(onSubmitClient).toHaveBeenCalled())
    expect(screen.getByText('Błąd nazwy')).toBeInTheDocument()
    expect(screen.getByText('Błąd jednostki')).toBeInTheDocument()
    expect(screen.getByText('Błąd warunku')).toBeInTheDocument()
    expect(screen.getByText('Błąd treści')).toBeInTheDocument()
    expect(screen.getByText('Ogólny błąd')).toBeInTheDocument()
    expect(pushMock).not.toHaveBeenCalled()
  })
})
