import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DashboardGrid from '@/components/DashboardGrid'

// eslint-disable-next-line react/display-name
jest.mock('react-grid-layout', () => (props) => (
  <div data-testid="grid">
    <button onClick={() => props.onLayoutChange?.([{ i: props.layout[0].i, x: 1, y: 1, w: props.layout[0].w, h: props.layout[0].h }])}>
      layout-change
    </button>
    {props.children}
  </div>
))

jest.mock('@/components/Card', () => ({ __esModule: true, default: ({ title, type, onRequestDelete, onRequestEdit }) => (
  <div data-testid="card">
    <span>{title || type}</span>
    <button onClick={onRequestDelete} aria-label={`del-${title || type}`}>del</button>
    <button onClick={onRequestEdit} aria-label={`edit-${title || type}`}>edit</button>
  </div>
)}))

jest.mock('@/components/notify/DeleteModal', () => ({ __esModule: true, default: ({ isOpen, onClose, onConfirm, itemName }) => (
  isOpen ? (
    <div data-testid="delete-modal">
      <span>{itemName}</span>
      <button onClick={onConfirm}>confirm</button>
      <button onClick={onClose}>cancel</button>
    </div>
  ) : null
)}))

jest.mock('@/components/AddWidgetModal', () => ({ __esModule: true, AddWidgetModal: ({ isOpen, addItem, onClose, mode, onUpdated }) => (
  isOpen ? (
    <div data-testid={mode === 'edit' ? 'edit-modal' : 'add-modal'}>
      {mode === 'edit' ? (
        <button onClick={() => onUpdated?.({ id: '1', title: 'Updated', cacheJson: [] })}>update-existing</button>
      ) : (
        <button onClick={() => { addItem?.({ id: '2', x: 0, y: 0, w: 1, h: 1, type: 'TEXT', content: 'new', title: 'New widget' }); onClose?.() }}>add-new</button>
      )}
    </div>
  ) : null
)}))

jest.mock('@/context/DashboardContext', () => ({ useDashboard: jest.fn() }))
jest.mock('@/app/(authorized)/actions', () => ({
  bulkUpdateWidgetPositionsAction: jest.fn(),
  deleteWidgetAction: jest.fn().mockResolvedValue(undefined),
}))

const useDashboard = require('@/context/DashboardContext').useDashboard
const { bulkUpdateWidgetPositionsAction, deleteWidgetAction } = require('@/app/(authorized)/actions')

describe('DashboardGrid', () => {
  let dashboardState
  const baseItems = [{ i: '1', x: 0, y: 0, w: 2, h: 2, type: 'tekst', content: 'hi', cacheJson: [{ type: 'text', text: 'hello' }] }]

  beforeEach(() => {
    dashboardState = { isEditMode: false, isModalOpen: false, closeModal: jest.fn() }
    useDashboard.mockImplementation(() => dashboardState)
    bulkUpdateWidgetPositionsAction.mockResolvedValue(undefined)
    jest.clearAllMocks()
  })

  test('dodaje nowy widget gdy modal jest otwarty', () => {
    dashboardState.isModalOpen = true
    render(<DashboardGrid initialItems={baseItems} />)

    fireEvent.click(screen.getByText('add-new'))

    expect(screen.getAllByTestId('card').length).toBe(2)
    expect(screen.getByText('New widget')).toBeInTheDocument()
    expect(dashboardState.closeModal).toHaveBeenCalled()
  })

  test('usuwa widget po potwierdzeniu w DeleteModal', async () => {
    render(<DashboardGrid initialItems={baseItems} />)

    fireEvent.click(screen.getByLabelText('del-tekst'))
    expect(screen.getByTestId('delete-modal')).toBeInTheDocument()
    fireEvent.click(screen.getByText('confirm'))

    await waitFor(() => expect(deleteWidgetAction).toHaveBeenCalledWith('1'))
    expect(screen.queryAllByTestId('card').length).toBe(0)
  })

  test('persistuje layout gdy isEditMode=false i layout się zmienił', async () => {
    render(<DashboardGrid initialItems={baseItems} />)

    fireEvent.click(screen.getByText('layout-change'))

    await waitFor(() => expect(bulkUpdateWidgetPositionsAction).toHaveBeenCalledTimes(1))
  })

  test('tryb edycji pozwala zaktualizować widget przez modal edycji', async () => {
    render(<DashboardGrid initialItems={baseItems} />)

    fireEvent.click(screen.getByLabelText('edit-tekst'))
    expect(screen.getByTestId('edit-modal')).toBeInTheDocument()

    fireEvent.click(screen.getByText('update-existing'))

    await waitFor(() => expect(screen.getByText('Updated')).toBeInTheDocument())
  })
})
