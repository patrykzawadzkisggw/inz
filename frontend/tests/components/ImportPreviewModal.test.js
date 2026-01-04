import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ImportPreviewModal from '@/components/custom/ImportPreviewModal'

const modalMock = jest.fn(({ children }) => <div data-testid="modal-root">{children}</div>)
const dataTableMock = jest.fn(({ data, columns }) => (
  <div data-testid="data-table">
    <div data-testid="table-columns">{JSON.stringify(columns)}</div>
    <div data-testid="table-data">{JSON.stringify(data)}</div>
  </div>
))

jest.mock('@/components/Modal', () => ({
  __esModule: true,
  Modal: (props) => modalMock(props),
}))

jest.mock('@/components/DataTable', () => ({
  __esModule: true,
  default: (props) => dataTableMock(props),
}))

jest.mock('@/components/custom/Button2', () => ({
  __esModule: true,
  default: ({ children, onClick, type = 'button', ...rest }) => (
    <button type={type} onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}))

describe('ImportPreviewModal', () => {
  beforeEach(() => {
    modalMock.mockClear()
    dataTableMock.mockClear()
  })

  test('pokazuje komunikat gdy brak danych', () => {
    render(
      <ImportPreviewModal isOpen onClose={jest.fn()} data={null} />
    )

    expect(screen.getByText('Brak danych do podglądu')).toBeInTheDocument()
    expect(screen.queryByTestId('data-table')).not.toBeInTheDocument()
  })

  test('pozwala zmieniać kolumny i zwraca zmienione schema', () => {
    const onConfirm = jest.fn()
    render(
      <ImportPreviewModal
        isOpen
        onClose={jest.fn()}
        data={{ columns: ['col1', 'col2'], rows: [{ col1: 'a', col2: 'b' }] }}
        onConfirm={onConfirm}
      />
    )

    const renameInput = screen.getByDisplayValue('col1')
    fireEvent.change(renameInput, { target: { value: 'Nazwa 1' } })

  const typeSelect = screen.getAllByRole('combobox')[0]
  fireEvent.change(typeSelect, { target: { value: 'date' } })

    const secondCheckbox = screen.getAllByRole('checkbox')[1]
    fireEvent.click(secondCheckbox)

    fireEvent.click(screen.getByText('Zatwierdź'))

    expect(onConfirm).toHaveBeenCalledWith([
      { key: 'col1', name: 'Nazwa 1', type: 'date', removed: false },
      { key: 'col2', name: 'col2', type: 'text', removed: true },
    ])

    const tableArgs = dataTableMock.mock.calls.at(-1)[0]
    expect(tableArgs.columns.map((c) => c.header)).toEqual(['Nazwa 1'])
    expect(tableArgs.data[0]).toEqual({ 'Nazwa 1': 'a' })
  })

  test('informuje gdy wszystkie kolumny są ukryte', () => {
    render(
      <ImportPreviewModal
        isOpen
        onClose={jest.fn()}
        data={{ columns: ['a'], rows: [{ a: 1 }] }}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)

    expect(
      screen.getByText('Brak widocznych kolumn (odznaczono wszystkie)')
    ).toBeInTheDocument()
  })
})
