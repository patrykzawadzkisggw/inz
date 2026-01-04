import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({ push: pushMock }),
}))

const useModelsMock = jest.fn()
jest.mock('@/context/ModelsContext', () => ({
  __esModule: true,
  useModels: () => useModelsMock(),
}))

const modelTypeSelectorMock = jest.fn(({ value, onChange }) => (
  <div data-testid="model-type-selector">
    <span data-testid="current-type">{value}</span>
    <button type="button" onClick={() => onChange('chronos')}>
      Wybierz chronos
    </button>
  </div>
))

jest.mock('@/components/model/ModelTypeSelector', () => ({
  __esModule: true,
  ModelTypeSelector: (props) => modelTypeSelectorMock(props),
}))

const apiConfigMock = jest.fn((props) => (
  <div data-testid="api-config">
    <span data-testid="interval-val">{props.initialIntervalValue}</span>
    <span data-testid="interval-unit">{props.initialIntervalUnit}</span>
    <input name="interval_value" defaultValue={props.initialIntervalValue ?? ''} />
    <input name="interval_unit" defaultValue={props.initialIntervalUnit ?? ''} />
  </div>
))

jest.mock('@/components/model/ApiConfig', () => ({
  __esModule: true,
  ApiConfig: (props) => apiConfigMock(props),
}))

jest.mock('@/components/custom/Button2', () => ({
  __esModule: true,
  default: ({ children, onClick, type = 'button', disabled }) => (
    <button type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}))

import EditModelForm from '@/components/model/EditModelForm'

describe('EditModelForm', () => {
  beforeEach(() => {
    pushMock.mockClear()
    useModelsMock.mockReset()
    modelTypeSelectorMock.mockClear()
    apiConfigMock.mockClear()
    global.history.back = jest.fn()
  })

  test('wysyła formularz i przekierowuje po sukcesie', async () => {
    const editModel = jest.fn(async () => ({ ok: true, errors: {} }))
    useModelsMock.mockReturnValue({ editModel, isMutating: false })

    render(
      <EditModelForm id="m1" name="Model" description="Opis" enableUpdates intervalSpec="5m" />
    )

    const form = document.querySelector('form')
    fireEvent.submit(form)

    await waitFor(() => expect(editModel).toHaveBeenCalled())
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/models'))

    const formData = editModel.mock.calls[0][1]
    const entries = Object.fromEntries(formData.entries())
    expect(entries.id).toBe('m1')
    expect(entries.enableUpdates).toBe('on')
  })

  test('pokazuje błędy i obsługuje konfigurację prognozy', async () => {
    const editModel = jest.fn(async () => ({ errors: { description: 'Błąd opisu' } }))
    useModelsMock.mockReturnValue({ editModel, isMutating: false })

    render(
      <EditModelForm
        id="m2"
        name="Prognoza"
        description=""
        enableUpdates
        intervalSpec="10h"
        lastImportIsApi
        modelType="morai"
        forecastConfig={{
          prediction_length: 6,
          holiday_enabled: true,
          holiday_country: 'PL',
          holiday_dates: ['2024-01-01'],
          holiday_treatment: 'neutralize',
        }}
      />
    )

    expect(apiConfigMock).toHaveBeenCalledWith(expect.objectContaining({
      initialIntervalValue: 10,
      initialIntervalUnit: 'h',
    }))

    fireEvent.click(screen.getByLabelText('Dynamiczne pobieranie danych'))
    const enableUpdatesInput = document.querySelector('input[name="enableUpdates"]')
    expect(enableUpdatesInput?.value).toBe('off')

    fireEvent.click(screen.getByText('Wybierz chronos'))
    const typeHidden = document.querySelector('input[name="type"]')
    expect(typeHidden?.value).toBe('chronos')

    const dateInput = document.querySelector('input[type="date"]')
    fireEvent.change(dateInput, { target: { value: '2024-12-24' } })
    fireEvent.click(screen.getByText('Dodaj'))
    expect(screen.getByText('2024-12-24')).toBeInTheDocument()

    const form = document.querySelector('form')
    fireEvent.submit(form)

    await waitFor(() => expect(editModel).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText('Błąd opisu')).toBeInTheDocument())
    expect(pushMock).not.toHaveBeenCalled()
  })
})
