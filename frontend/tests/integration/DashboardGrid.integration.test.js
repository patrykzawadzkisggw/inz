import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DashboardGrid from '@/components/DashboardGrid'

const bulkUpdateWidgetPositionsAction = jest.fn().mockResolvedValue(undefined)
const deleteWidgetAction = jest.fn().mockResolvedValue(undefined)

jest.mock('@/app/(authorized)/actions', () => ({
  __esModule: true,
  bulkUpdateWidgetPositionsAction: (...args) => bulkUpdateWidgetPositionsAction(...args),
  deleteWidgetAction: (...args) => deleteWidgetAction(...args),
}))

let isEditMode = false
let isModalOpen = false
const closeModal = jest.fn()

jest.mock('@/context/DashboardContext', () => ({
  __esModule: true,
  useDashboard: () => ({ isEditMode, isModalOpen, closeModal, openModal: jest.fn() }),
}))

jest.mock('react-grid-layout', () => {
  const GridLayout = ({ children, layout, onLayoutChange, className }) => (
    <div data-testid="grid" className={className}>
      <button data-testid="trigger-layout" onClick={() => onLayoutChange?.(layout.map((l) => ({ ...l, x: l.x + 1 })))}>
        change
      </button>
      {children}
    </div>
  )
  return { __esModule: true, default: GridLayout }
})

jest.mock('@/components/Card', () => ({
  __esModule: true,
  default: ({ children, widgetId, onRequestDelete, onRequestEdit }) => (
    <div data-testid={`card-${widgetId}`}>
      <button onClick={onRequestDelete} aria-label={`delete-${widgetId}`}>
        delete
      </button>
      <button onClick={onRequestEdit} aria-label={`edit-${widgetId}`}>
        edit
      </button>
      {children}
    </div>
  ),
}))

jest.mock('@/components/DataTable', () => ({
  __esModule: true,
  SimpleObjectTable: () => <div data-testid="table">table</div>,
}))

jest.mock('@/components/notify/DeleteModal', () => ({
  __esModule: true,
  default: ({ isOpen, onConfirm, onClose }) =>
    isOpen ? (
      <div data-testid="delete-modal">
        <button onClick={onConfirm}>confirm-delete</button>
        <button onClick={onClose}>close</button>
      </div>
    ) : null,
}))

jest.mock('@/components/AddWidgetModal', () => ({
  __esModule: true,
  AddWidgetModal: ({ isOpen, addItem, mode = 'add', existing, onUpdated }) =>
    isOpen ? (
      <div data-testid={`${mode}-modal`}>
        <button onClick={() => addItem({ id: 'new', x: 0, y: 0, w: 2, h: 2, type: 'TEXT', content: 'demo' })}>add</button>
        {mode === 'edit' && (
          <button
            onClick={() =>
              onUpdated?.({ id: existing?.id || 'e', title: 'Zmieniony', content: 'Nowa treść', cacheJson: [], configJson: {} })
            }
          >
            update
          </button>
        )}
      </div>
    ) : null,
}))

jest.mock('react', () => ({
  __esModule: true,
  ...jest.requireActual('react'),
  default: jest.requireActual('react'),
  useTransition: () => [false, (cb) => cb()],
}))

describe('DashboardGrid integration', () => {
  beforeEach(() => {
    isEditMode = false
    isModalOpen = false
    closeModal.mockClear()
    bulkUpdateWidgetPositionsAction.mockClear()
    deleteWidgetAction.mockClear()
  })

  const initialItems = [
    { i: '1', x: 0, y: 0, w: 2, h: 2, type: 'tekst', content: 'Hello' },
  ]

  test('aktualizuje layout i wysyła zapisaną pozycję', async () => {
    render(<DashboardGrid initialItems={initialItems} />)

    fireEvent.click(screen.getByTestId('trigger-layout'))

    await waitFor(() => expect(bulkUpdateWidgetPositionsAction).toHaveBeenCalled())
    expect(bulkUpdateWidgetPositionsAction).toHaveBeenCalledWith([
      { id: '1', x: 1, y: 0, w: 2, h: 2 },
    ])
  })

  test('usuwa kafelek po potwierdzeniu', async () => {
    render(<DashboardGrid initialItems={initialItems} />)

    fireEvent.click(screen.getByLabelText('delete-1'))
    expect(screen.getByTestId('delete-modal')).toBeInTheDocument()

    fireEvent.click(screen.getByText('confirm-delete'))

    await waitFor(() => expect(deleteWidgetAction).toHaveBeenCalledWith('1'))
    expect(screen.queryByTestId('card-1')).not.toBeInTheDocument()
  })

  test('dodaje nowy widget z modala', () => {
    isModalOpen = true

    render(<DashboardGrid initialItems={initialItems} />)

    fireEvent.click(screen.getByText('add'))

    expect(screen.getByTestId('card-new')).toBeInTheDocument()
    expect(closeModal).toHaveBeenCalled()
  })

  test('aktualizuje istniejący widget po edycji', () => {
    render(<DashboardGrid initialItems={initialItems} />)

    fireEvent.click(screen.getByLabelText('edit-1'))
    fireEvent.click(screen.getByText('update'))

    expect(screen.getByTestId('card-1')).toHaveTextContent('Nowa treść')
  })
})
