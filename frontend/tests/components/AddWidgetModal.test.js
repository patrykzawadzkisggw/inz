import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddWidgetModal } from '@/components/AddWidgetModal'

jest.mock('@/components/Modal', () => ({ __esModule: true, Modal: ({ isOpen, onClose, children }) => isOpen ? <div><button aria-label="close" onClick={onClose}>close</button>{children}</div> : null }))

jest.mock('@/components/AddText', () => ({ __esModule: true, AddText: ({ onSubmitText, submitLabel }) => (
  <button onClick={() => onSubmitText?.('body', 'title')} aria-label="tekst-btn">{submitLabel || 'Wstaw'}</button>
)}))

jest.mock('@/components/AddSheet', () => ({ __esModule: true, AddSheet: ({ onAdd, submitLabel }) => (
  <button onClick={() => onAdd?.({ records: [{ name: 'n', value: '1' }], chartType: 'bar', content: 'c', title: 't' })} aria-label="wykres-btn">{submitLabel || 'Dodaj'}</button>
)}))

jest.mock('@/components/AddTable', () => ({ __esModule: true, AddTable: ({ onAdd, submitLabel }) => (
  <button onClick={() => onAdd?.({ rows: [{ name: 'r', value: '2' }], content: 'ct', title: 'tt' })} aria-label="tabela-btn">{submitLabel || 'Dodaj'}</button>
)}))

describe('AddWidgetModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  test('tworzy widget tekstowy i zamyka modal po sukcesie', async () => {
    const addItem = jest.fn()
    const onClose = jest.fn()
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ widget: { id: 'w1' } }) })

    render(<AddWidgetModal isOpen addItem={addItem} onClose={onClose} />)

    fireEvent.click(screen.getByLabelText('Tekst'))
    fireEvent.click(screen.getByLabelText('tekst-btn'))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/widgets', expect.objectContaining({ method: 'POST' })))
    expect(addItem).toHaveBeenCalledWith({ id: 'w1' })
    expect(onClose).toHaveBeenCalled()
  })

  test('edytuje widget typu wykres i wywołuje onUpdated', async () => {
    const onUpdated = jest.fn()
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ widget: { id: 'w2', content: 'c2' } }) })

    render(
      <AddWidgetModal
        isOpen
        addItem={jest.fn()}
        onClose={jest.fn()}
        mode="edit"
        existing={{ id: 'w2', type: 'CHART', content: 'c', title: 't', configJson: { chartType: 'bar', records: [] } }}
        onUpdated={onUpdated}
      />
    )

    fireEvent.click(screen.getByLabelText('wykres-btn'))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/widgets/w2', expect.objectContaining({ method: 'PATCH' })))
    expect(onUpdated).toHaveBeenCalledWith({ id: 'w2', content: 'c2' })
  })

  test('gdy API zwróci błąd, fetch jest wywołany, ale element nie zostaje dodany ani zamknięty', async () => {
    const addItem = jest.fn()
    const onClose = jest.fn()
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'err' }) })

    render(<AddWidgetModal isOpen addItem={addItem} onClose={onClose} />)

    fireEvent.click(screen.getByLabelText('Tabela'))
    fireEvent.click(screen.getByLabelText('tabela-btn'))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/widgets', expect.objectContaining({ method: 'POST' })))
    expect(addItem).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})
