import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileImport } from '@/components/custom/FileImport'

describe('FileImport', () => {
  const origRevoke = URL.revokeObjectURL
  beforeEach(() => {
    URL.revokeObjectURL = jest.fn()
  })
  afterEach(() => {
    URL.revokeObjectURL = origRevoke
  })

  const createFile = (name, type, size = 10) => {
    const file = new File(['x'.repeat(size)], name, { type })
    Object.defineProperty(file, 'size', { value: size })
    return file
  }

  test('wywołuje onFileSelected przy wyborze pliku przez input', () => {
    const onFileSelected = jest.fn()
    const { container } = render(<FileImport onFileSelected={onFileSelected} />)
    const input = container.querySelector('input[type="file"]')
    const file = createFile('test.txt', 'text/plain')

    fireEvent.change(input, { target: { files: [file] } })

    expect(onFileSelected).toHaveBeenCalledWith(file)
    expect(screen.getByText('test.txt')).toBeInTheDocument()
  })

  test('odrzuca nieobsługiwany typ pliku i wywołuje onError', () => {
    const onError = jest.fn()
    const { container } = render(<FileImport onError={onError} accept='.txt' />)
    const input = container.querySelector('input[type="file"]')
    const bad = createFile('img.png', 'image/png')

    fireEvent.change(input, { target: { files: [bad] } })

    expect(onError).toHaveBeenCalled()
    expect(screen.getByText('Nieobsługiwany typ pliku')).toBeInTheDocument()
  })

  test('odrzuca zbyt duży plik', () => {
    const onError = jest.fn()
    const { container } = render(<FileImport onError={onError} maxSizeMB={0.000001} />)
    const input = container.querySelector('input[type="file"]')
    const big = createFile('big.txt', 'text/plain', 1024 * 1024)

    fireEvent.change(input, { target: { files: [big] } })

    expect(onError).toHaveBeenCalled()
    expect(screen.getByText(/Plik jest za duży/)).toBeInTheDocument()
  })

  test('drop przekazuje plik i pokazuje nazwę', () => {
    const onFileSelected = jest.fn()
    const { container } = render(<FileImport onFileSelected={onFileSelected} />)
    const label = container.querySelector('label')
    const file = createFile('drag.txt', 'text/plain')
    fireEvent.drop(label, { dataTransfer: { files: [file] }, preventDefault: () => {} })

    expect(onFileSelected).toHaveBeenCalledWith(file)
    expect(screen.getByText('drag.txt')).toBeInTheDocument()
  })

  test('przycisk Usuń czyści stan', () => {
    const { container } = render(<FileImport />)
    const input = container.querySelector('input[type="file"]')
    const file = createFile('keep.txt', 'text/plain')

    fireEvent.change(input, { target: { files: [file] } })
    expect(screen.getByText('keep.txt')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Usuń'))

    expect(screen.queryByText('keep.txt')).not.toBeInTheDocument()
  })
})
