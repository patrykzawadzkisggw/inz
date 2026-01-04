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
    <textarea
      aria-label="formula"
      defaultValue={initialValue}
      onChange={(e) => onChangeText?.(e.target.value)}
    />
  ),
}))

import FunctionForm from '@/components/function/FunctionForm'

describe('FunctionForm', () => {
  beforeEach(() => {
    pushMock.mockClear()
    mockedUseActionState.mockClear()
  })

  test('kapitalizuje nazwę i przekierowuje po sukcesie submitu klienckiego', async () => {
    let resolveSubmit
    const onSubmitClient = jest.fn(
      () =>
        new Promise((res) => {
          resolveSubmit = res
        })
    )

    render(
      <FunctionForm
        userId="u1"
        onSubmitClient={onSubmitClient}
        initialName="example"
        initialBody="function demo() {}"
      />
    )

    const nameInput = screen.getByLabelText('Nazwa funkcji')
    fireEvent.change(nameInput, { target: { value: 'demo' } })
    expect(nameInput).toHaveValue('Demo')

    const form = nameInput.closest('form')
    fireEvent.submit(form)

    expect(screen.getByText('Zapisywanie...')).toBeInTheDocument()

    resolveSubmit({ ok: true, errors: {} })

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/functions'))
    expect(onSubmitClient).toHaveBeenCalled()
  })

  test('w trybie edycji pole jest tylko do odczytu i pokazuje błędy', async () => {
    const onSubmitClient = jest.fn(async () => ({
      errors: { name: 'Błąd nazwy', body: 'Błąd treści' },
      error: 'Ogólny błąd',
    }))

    render(
      <FunctionForm
        isEditMode
        initialId="func-1"
        initialName="Gotowa"
        onSubmitClient={onSubmitClient}
      />
    )

    const nameInput = screen.getByLabelText('Nazwa funkcji')
    expect(nameInput).toHaveAttribute('readOnly')
    expect(nameInput).toHaveValue('Gotowa')

    const form = nameInput.closest('form')
    fireEvent.submit(form)

    await waitFor(() => expect(onSubmitClient).toHaveBeenCalled())
    expect(screen.getByText('Błąd nazwy')).toBeInTheDocument()
    expect(screen.getByText('Błąd treści')).toBeInTheDocument()
    expect(pushMock).not.toHaveBeenCalled()
  })
})
