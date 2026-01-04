import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ImportLayout from '@/components/custom/ImportLayout'
import { parseCSVText, gridFromJsonText, isJsonPreferred, buildKeyBaseUrl, buildKeyBaseFile, normalizeSeparator } from '@/lib/importHelpers'
import { useParams } from 'next/navigation'

jest.mock('next/navigation', () => ({
  __esModule: true,
  useParams: jest.fn(),
}))

const modalMock = jest.fn((props) => {
  if (!props.isOpen) return null
  return (
    <div data-testid="preview-modal">
      <span data-testid="modal-data">{JSON.stringify(props.data)}</span>
      <button
        type="button"
        data-testid="confirm-preview"
        onClick={() => {
          props.onConfirm?.([
            { key: 'a', name: 'Kolumna A', type: 'text', removed: false },
            { key: 'b', name: 'Kolumna B', type: 'text', removed: true },
          ])
          props.onClose?.()
        }}
      >
        Potwierdź
      </button>
    </div>
  )
})

jest.mock('@/components/custom/ImportPreviewModal', () => ({
  __esModule: true,
  default: (props) => modalMock(props),
}))

const fileImportMock = jest.fn((props) => (
  <button
    type="button"
    data-testid="mock-file-import"
    onClick={() => {
      const chosen = nextSelectedFile || new File(['plik'], 'dane.tsv', { type: 'text/tab-separated-values' })
      if (!chosen.text) chosen.text = () => Promise.resolve('a\tb')
      props.onFileSelected?.(chosen)
    }}
  >
    Wybierz plik
  </button>
))

jest.mock('@/components/custom/FileImport', () => ({
  __esModule: true,
  FileImport: (props) => fileImportMock(props),
}))

jest.mock('@/components/custom/TypeSelector', () => {
  const React = require('react')
  return {
    __esModule: true,
    TypeSelector: ({ value, onChange }) => (
      <div>
        <button type="button" onClick={() => onChange('url')} data-testid="source-url">
          URL ({value})
        </button>
        <button type="button" onClick={() => onChange('file')} data-testid="source-file">
          FILE ({value})
        </button>
      </div>
    ),
  }
})

jest.mock('@/components/custom/Input2', () => ({
  __esModule: true,
  default: (props) => <input {...props} />,
}))

jest.mock('@/components/custom/Button2', () => ({
  __esModule: true,
  default: ({ children, ...rest }) => <button {...rest}>{children}</button>,
}))

jest.mock('@/lib/importHelpers', () => {
  const actual = jest.requireActual('@/lib/importHelpers')
  return {
    __esModule: true,
    ...actual,
    parseCSVText: jest.fn(),
    gridFromJsonText: jest.fn(),
    isJsonPreferred: jest.fn(),
    buildKeyBaseUrl: jest.fn(),
    buildKeyBaseFile: jest.fn(),
    normalizeSeparator: jest.fn(),
  }
})

const mockedParseCsv = parseCSVText
const mockedGridFromJson = gridFromJsonText
const mockedIsJsonPreferred = isJsonPreferred
const mockedBuildKeyBaseUrl = buildKeyBaseUrl
const mockedBuildKeyBaseFile = buildKeyBaseFile
const mockedNormalizeSeparator = normalizeSeparator

const mockedUseParams = useParams

let nextSelectedFile
let consoleErrorSpy

describe('ImportLayout', () => {
  beforeEach(() => {
    mockedUseParams.mockReturnValue({ id: 'model-123' })
    modalMock.mockClear()
    fileImportMock.mockClear()
    mockedParseCsv.mockReset()
    mockedGridFromJson.mockReset()
    mockedIsJsonPreferred.mockReset()
    mockedBuildKeyBaseUrl.mockReset()
    mockedBuildKeyBaseFile.mockReset()
    mockedNormalizeSeparator.mockReset()
    mockedIsJsonPreferred.mockReturnValue(false)
    mockedNormalizeSeparator.mockImplementation((v) => v)
    global.fetch = jest.fn()
    global.alert = jest.fn()
    nextSelectedFile = undefined
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy?.mockRestore()
  })

  const getOpenModalProps = () => modalMock.mock.calls.map((c) => c[0]).find((p) => p.isOpen)

  test('podgląd z URL ładuje dane i ustawia ukryte pola', async () => {
    mockedParseCsv.mockResolvedValue({ columns: ['a', 'b'], rows: [{ a: '1', b: '2' }] })
    mockedBuildKeyBaseUrl.mockReturnValue('url:key')

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'text/csv' },
      text: () => Promise.resolve('a,b\n1,2'),
    })

    render(<ImportLayout />)

    fireEvent.change(screen.getByPlaceholderText('https://example.com'), {
      target: { value: 'https://example.com/data.csv' },
    })
    fireEvent.click(screen.getByText('Podgląd'))

    await waitFor(() => expect(getOpenModalProps()).toBeDefined())
    const openProps = getOpenModalProps()
    expect(openProps.data).toEqual({ columns: ['a', 'b'], rows: [{ a: '1', b: '2' }] })

    fireEvent.click(screen.getByTestId('confirm-preview'))

    const rowsJson = document.querySelector('input[name="import_rows_json"]')
    const schemaJson = document.querySelector('input[name="import_schema_json"]')
    const optionsJson = document.querySelector('input[name="import_options_json"]')

    expect(JSON.parse(rowsJson.value)).toEqual([{ 'Kolumna A': '1' }])
    expect(JSON.parse(schemaJson.value)).toHaveLength(2)
    expect(JSON.parse(optionsJson.value)).toMatchObject({
      sourceType: 'url',
      urlValue: 'https://example.com/data.csv',
      contentKey: 'url:key',
    })
  })

  test('informuje o nieprawidłowym adresie URL', async () => {
    render(<ImportLayout />)

    fireEvent.change(screen.getByPlaceholderText('https://example.com'), {
      target: { value: 'zły-adres' },
    })
    fireEvent.click(screen.getByText('Podgląd'))

    await waitFor(() => expect(global.alert).toHaveBeenCalled())
    const anyOpen = modalMock.mock.calls.map((c) => c[0]).some((p) => p.isOpen)
    expect(anyOpen).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('pokazuje kontrolki separatora dla pliku', async () => {
    nextSelectedFile = new File(['a\tb'], 'plik.tsv', { type: 'text/tab-separated-values' })
    nextSelectedFile.text = () => Promise.resolve('a\tb')

    render(<ImportLayout />)

    fireEvent.click(screen.getByTestId('source-file'))
    fireEvent.click(screen.getByTestId('mock-file-import'))

    await waitFor(() => expect(fileImportMock).toHaveBeenCalled())
    const selects = screen.getAllByRole('combobox')
    const separatorSelect = selects.find((el) => ['\\t', '\t', ',', ';', '|'].includes(el.value))
    expect(separatorSelect).toBeTruthy()
  })

  test('parsuje plik jako JSON gdy preferowane', async () => {
    nextSelectedFile = new File([JSON.stringify([{ x: 5 }])], 'data.json', { type: 'application/json' })
    nextSelectedFile.text = () => Promise.resolve(JSON.stringify([{ x: 5 }]))
    mockedIsJsonPreferred.mockReturnValue(true)
    mockedGridFromJson.mockReturnValue({ columns: ['x'], rows: [{ x: 5 }] })
    mockedBuildKeyBaseFile.mockReturnValue('file:key')

    render(<ImportLayout />)

    fireEvent.click(screen.getByTestId('source-file'))
    fireEvent.click(screen.getByTestId('mock-file-import'))
    fireEvent.click(screen.getByText('Podgląd'))

    await waitFor(() => expect(getOpenModalProps()).toBeDefined())
    fireEvent.click(screen.getByTestId('confirm-preview'))
    expect(mockedGridFromJson).toHaveBeenCalled()
    const optionsJson = document.querySelector('input[name="import_options_json"]')
    expect(JSON.parse(optionsJson.value)).toMatchObject({ sourceType: 'file', contentKey: 'file:key' })
  })
})
