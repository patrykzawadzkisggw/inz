import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { AddSheet } from '@/components/AddSheet'

jest.mock('@/components/ui/separator', () => ({ __esModule: true, Separator: () => <hr /> }))
jest.mock('@/components/ui/simple-tabs', () => ({ __esModule: true, default: ({ tabs }) => <div>{tabs.map((t) => <div key={t.id}>{t.content}</div>)}</div> }))
jest.mock('@/components/FormulaBox', () => ({ __esModule: true, default: ({ initialValue, onChangeText }) => (
  <textarea aria-label="formula" defaultValue={initialValue} onChange={(e) => onChangeText(e.target.value)} />
)}))
jest.mock('@/components/custom/Input2', () => ({ __esModule: true, default: React.forwardRef((props, ref) => <input ref={ref} {...props} />) }))
jest.mock('@/components/custom/Select2', () => ({ __esModule: true, default: (props) => <select {...props}>{props.children}</select> }))
jest.mock('@/components/custom/Button2', () => ({ __esModule: true, default: (props) => <button {...props}>{props.children}</button> }))

describe('AddSheet', () => {
  test('przycisk jest nieaktywny bez rekordów i aktywuje się po wprowadzeniu danych', () => {
    render(<AddSheet />)
    const submitBtn = screen.getByRole('button', { name: 'Dodaj' })
    expect(submitBtn).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText('Nazwa...'), { target: { value: 'N' } })
    fireEvent.change(screen.getByPlaceholderText('Wartość...'), { target: { value: '10' } })

    expect(submitBtn).not.toBeDisabled()
  })

  test('wywołuje onAdd z rekordami, typem wykresu, skryptem i tytułem', () => {
    const onAdd = jest.fn()
    render(<AddSheet onAdd={onAdd} initialChartType="linear" />)

    fireEvent.change(screen.getByPlaceholderText('Nazwa...'), { target: { value: 'seria' } })
    fireEvent.change(screen.getByPlaceholderText('Wartość...'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('formula'), { target: { value: 'code' } })
    fireEvent.change(screen.getByPlaceholderText('Tytuł...'), { target: { value: 'T' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'bar' } })

    fireEvent.click(screen.getByRole('button', { name: 'Dodaj' }))

    expect(onAdd).toHaveBeenCalledWith({
      records: expect.arrayContaining([expect.objectContaining({ name: 'seria', value: '3' })]),
      chartType: 'bar',
      content: 'code',
      title: 'T',
    })
  })
})
