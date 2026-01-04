import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import FormulaBox from '@/components/FormulaBox'

jest.mock('@/context/UserFunctionsContext', () => ({ useUserFunctions: jest.fn() }))
jest.mock('@/context/ModelsContext', () => ({ useModels: jest.fn() }))
jest.mock('@/components/functions_catalog.json', () => ([
  { category: 'Statyczne', items: [{ name: 'StatFn', example: 'StatFn()', description: 'stat desc' }] }
]), { virtual: true })

const useUserFunctions = require('@/context/UserFunctionsContext').useUserFunctions
const useModels = require('@/context/ModelsContext').useModels

describe('FormulaBox', () => {
  beforeEach(() => {
    useUserFunctions.mockReturnValue({ functions: [] })
    useModels.mockReturnValue({ models: [] })
  })

  test('aktualizuje tekst i wywołuje onChangeText', () => {
    const onChangeText = jest.fn()
    render(<FormulaBox Title="Box" initialValue="abc" onChangeText={onChangeText} showCatalog={false} />)

    fireEvent.change(screen.getByPlaceholderText('Napisz formułę tutaj'), { target: { value: 'xyz' } })

    expect(onChangeText).toHaveBeenCalledWith('xyz')
  })

  test('po dwukliku w katalogu wstawia przykładową funkcję', async () => {
    useUserFunctions.mockReturnValue({ functions: [{ name: 'UF', body: 'UF()', description: 'u' }] })
    useModels.mockReturnValue({ models: [{ name: 'Model1', description: '', imports: [{ processedSchemaJson: [{ name: 'col1' }] }] }] })

    render(<FormulaBox Title="Formuła" showCatalog />)

    const [, itemsList] = screen.getAllByRole('listbox')

    const option = await screen.findByText('Model1')
    fireEvent.doubleClick(option)

    expect(screen.getByPlaceholderText('Napisz formułę tutaj').value).toContain('ModelData("Model1")')
    expect(itemsList.querySelectorAll('option').length).toBeGreaterThan(0)
  })
})
