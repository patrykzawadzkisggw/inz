import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { AddTable } from '@/components/AddTable'

jest.mock('@/components/ui/separator', () => ({ __esModule: true, Separator: () => <hr /> }))
jest.mock('@/components/ui/simple-tabs', () => ({ __esModule: true, default: ({ tabs }) => <div>{tabs.map((t) => <div key={t.id}>{t.content}</div>)}</div> }))
jest.mock('@/components/FormulaBox', () => ({ __esModule: true, default: ({ initialValue, onChangeText }) => (
  <textarea aria-label="formula" defaultValue={initialValue} onChange={(e) => onChangeText(e.target.value)} />
)}))
// eslint-disable-next-line react/display-name
jest.mock('@/components/custom/Input2', () => ({ __esModule: true, default: React.forwardRef((props, ref) => <input ref={ref} {...props} />) }))
jest.mock('@/components/custom/Button2', () => ({ __esModule: true, default: (props) => <button {...props}>{props.children}</button> }))

describe('AddTable', () => {
  test('po wypełnieniu pól dodaje nowy wiersz i aktualizuje licznik', () => {
    render(<AddTable />)

    fireEvent.change(screen.getByPlaceholderText('Nazwa...'), { target: { value: 'A' } })
    fireEvent.change(screen.getByPlaceholderText('Wartość...'), { target: { value: '1' } })

    fireEvent.click(screen.getByRole('button', { name: 'Nowy' }))

    expect(screen.getByText('2 / 2')).toBeInTheDocument()
  })

  test('wywołuje onAdd z wierszami, skryptem i tytułem', () => {
    const onAdd = jest.fn()
    render(<AddTable onAdd={onAdd} />)

    fireEvent.change(screen.getByPlaceholderText('Nazwa...'), { target: { value: 'kol' } })
    fireEvent.change(screen.getByPlaceholderText('Wartość...'), { target: { value: '5' } })
    fireEvent.change(screen.getByLabelText('formula'), { target: { value: 'print(1)' } })
    fireEvent.change(screen.getByPlaceholderText('Tytuł...'), { target: { value: 'T' } })

    fireEvent.click(screen.getByRole('button', { name: 'Dodaj' }))

    expect(onAdd).toHaveBeenCalledWith({
      rows: expect.arrayContaining([expect.objectContaining({ name: 'kol', value: '5' })]),
      content: 'print(1)',
      title: 'T',
    })
  })
})
