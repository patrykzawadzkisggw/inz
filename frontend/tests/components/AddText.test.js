import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddText } from '@/components/AddText'

// eslint-disable-next-line react/display-name
jest.mock('@/components/FormulaBox', () => ({ initialValue, onChangeText }) => (
  <textarea aria-label="formula" defaultValue={initialValue} onChange={(e) => onChangeText(e.target.value)} />
))

jest.mock('@/components/custom/Input2', () =>
  // eslint-disable-next-line react/display-name
  React.forwardRef((props, ref) => <input ref={ref} {...props} />)
)

describe('AddText', () => {
  test('wysyła tekst i tytuł po submit', async () => {
    const onSubmitText = jest.fn().mockResolvedValue(undefined)
    render(<AddText onSubmitText={onSubmitText} initialText=" hi " initialTitle=" t " submitLabel="Wyślij" />)

    fireEvent.change(screen.getByLabelText('formula'), { target: { value: ' nowy ' } })
    fireEvent.change(screen.getByPlaceholderText('Tytuł...'), { target: { value: ' Tytuł ' } })

    fireEvent.click(screen.getByRole('button', { name: /wyślij/i }))

    await waitFor(() => expect(onSubmitText).toHaveBeenCalledWith('nowy', 'Tytuł'))
  })

  test('pokazuje błąd gdy zapis nie powiedzie się', async () => {
    const onSubmitText = jest.fn().mockRejectedValue(new Error('fail'))
    render(<AddText onSubmitText={onSubmitText} />)

    fireEvent.change(screen.getByLabelText('formula'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: /wstaw/i }))

    await waitFor(() => expect(screen.getByText('Błąd zapisu')).toBeInTheDocument())
  })

  test('blokuje przycisk przy pustym tekście i pokazuje spinner w trakcie zapisu', async () => {
    let resolveFn
    const pending = new Promise((res) => { resolveFn = res })
    const onSubmitText = jest.fn().mockReturnValue(pending)

    render(<AddText onSubmitText={onSubmitText} />)

    const button = screen.getByRole('button', { name: /wstaw/i })
    expect(button).toBeDisabled()

    fireEvent.change(screen.getByLabelText('formula'), { target: { value: 'abc' } })
    expect(button).not.toBeDisabled()

    fireEvent.click(button)
    expect(button).toBeDisabled()
    expect(document.querySelector('span.animate-spin')).toBeInTheDocument()

    resolveFn()
    await waitFor(() => expect(button).not.toBeDisabled())
  })
})
