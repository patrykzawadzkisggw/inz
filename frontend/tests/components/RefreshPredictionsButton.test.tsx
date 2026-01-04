// @ts-nocheck
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RefreshPredictionsButton from '@/components/model/RefreshPredictionsButton'
import { useRouter } from 'next/navigation'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

describe('Przycisk odświeżania predykcji', () => {
  const mockRefresh = jest.fn()
  const modelId = 'test-model-123'
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      refresh: mockRefresh,
    })
    global.fetch = jest.fn()
  })

  afterAll(() => {
    if (originalFetch) {
      global.fetch = originalFetch
    } else {
      delete global.fetch
    }
  })

  it('renderuje poprawnie', () => {
    render(<RefreshPredictionsButton modelId={modelId} />)
    expect(screen.getByRole('button', { name: /odśwież/i })).toBeInTheDocument()
  })

  it('obsługuje kliknięcie (sukces)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
    })

    render(<RefreshPredictionsButton modelId={modelId} />)
    
    const button = screen.getByRole('button', { name: /odśwież/i })
    fireEvent.click(button)

    expect(screen.getByText(/odświeżanie.../i)).toBeInTheDocument()
    expect(button).toBeDisabled()

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/models/${encodeURIComponent(modelId)}/predictions/refresh`,
        { method: 'POST' }
      )
    })

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })

    expect(screen.getByRole('button', { name: /odśwież/i })).toBeInTheDocument()
    expect(button).not.toBeDisabled()
  })

  it('obsługuje błąd poprawnie', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    const mockFetch = jest.fn()
    global.fetch = mockFetch
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<RefreshPredictionsButton modelId={modelId} />)
    
    const button = screen.getByRole('button', { name: /odśwież/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Refresh error', expect.any(Error))
    })

    expect(mockRefresh).not.toHaveBeenCalled()
    expect(button).not.toBeDisabled()
    
    consoleSpy.mockRestore()
  })
})
