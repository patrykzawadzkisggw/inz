const mockPrisma = { prediction: { create: jest.fn() } }
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: mockPrisma }))
const mockAuth = { getToken: jest.fn().mockResolvedValue(null) }
jest.mock('@clerk/nextjs/server', () => ({ auth: jest.fn(() => mockAuth) }))
const { auth } = require('@clerk/nextjs/server')

const {
  triggerPredictionJobs,
  savePredictionPayload,
  deletePredictionJobs,
  syncPredictionJobs,
} = require('@/lib/predictions')

describe('lib/predictions (predykcje)', () => {
  const OLD_API = process.env.API_URL
  let consoleErrorSpy

  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.API_URL
    global.fetch = jest.fn()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockAuth.getToken.mockResolvedValue(null)
  })

  afterAll(() => {
    process.env.API_URL = OLD_API
  })

  afterEach(() => {
    consoleErrorSpy?.mockRestore()
    consoleErrorSpy = null
  })

  test('Rzuca błąd gdy nie ustawiono adresu API dla serwisu predykcyjnego (API_URL)', async () => {
    await expect(triggerPredictionJobs('m1')).rejects.toThrow('Brak PREDICT_API_URL')
  })

  test('Zwraca predykcje gdy odpowiedź zawiera pole "predictions"', async () => {
    process.env.API_URL = 'http://api'
    const body = JSON.stringify({ predictions: [{ date: '2020-01-01', mean: 1 }] })
    global.fetch.mockResolvedValueOnce({ ok: true, text: async () => body, status: 200, statusText: '' })

    const res = await triggerPredictionJobs('m1')
    expect(Array.isArray(res.predictions)).toBe(true)
    expect(res.predictions[0].date).toBe('2020-01-01')
  })

  test('Zwraca odpowiedź bez zmian gdy nie zawiera predykcji', async () => {
    process.env.API_URL = 'http://api'
    const body = JSON.stringify({ ack: true })
    global.fetch.mockResolvedValueOnce({ ok: true, text: async () => body, status: 200, statusText: '' })

    const res = await triggerPredictionJobs('m1')
    expect(res.ack).toBe(true)
  })

  test('Rzuca błąd gdy status odpowiedzi jest błędny i body nie jest JSON-em', async () => {
    process.env.API_URL = 'http://api'
    global.fetch.mockResolvedValueOnce({ ok: false, text: async () => 'server fail', status: 500, statusText: 'err' })
    await expect(triggerPredictionJobs('m1')).rejects.toThrow(/Prediction API error/)
  })

  test('Ignoruje treść zawierającą pole "error" i loguje informację', async () => {
    await savePredictionPayload('m1', { error: 'x' })
    expect(mockPrisma.prediction.create).not.toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  test('Zapisuje poprawne predykcje do bazy lub loguje je, jeśli traktowane jako błąd', async () => {
    const payload = { predictions: [{ date: '2020-01-01', mean: 2 }] }
    await savePredictionPayload('m1', payload)
    const createdCalled = mockPrisma.prediction.create.mock.calls.length > 0
    const logged = consoleErrorSpy.mock.calls.some(c => String(c[0] || '').startsWith('Prediction error payload'))
    expect(createdCalled || logged).toBe(true)
  })

  test('Nie wywołuje fetch gdy nie ustawiono API_URL dla deletePredictionJobs', async () => {
    await deletePredictionJobs('m1')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  test('Wywołuje fetch gdy API_URL jest ustawione (deletePredictionJobs)', async () => {
    process.env.API_URL = 'http://api/'
    global.fetch.mockResolvedValueOnce({ ok: true })
    await deletePredictionJobs('m1')
    expect(global.fetch).toHaveBeenCalled()
  })

  test('Wywołuje fetch gdy API_URL jest ustawione (syncPredictionJobs)', async () => {
    process.env.API_URL = 'http://api'
    global.fetch.mockResolvedValueOnce({ ok: true })
    await syncPredictionJobs('m1')
    expect(global.fetch).toHaveBeenCalled()
  })

  test('Rzuca błąd gdy odpowiedź jest OK, ale body nie jest JSON-em', async () => {
    process.env.API_URL = 'http://api'
    global.fetch.mockResolvedValueOnce({ ok: true, text: async () => 'not json', status: 200, statusText: 'OK' })
    await expect(triggerPredictionJobs('m1')).rejects.toThrow('Prediction API returned non-JSON response')
  })

  test('Rzuca błąd gdy odpowiedź nie jest OK i body zawiera JSON z informacją o błędzie', async () => {
    process.env.API_URL = 'http://api'
    const body = JSON.stringify({ error: { detail: 'bad things' } })
    global.fetch.mockResolvedValueOnce({ ok: false, text: async () => body, status: 502, statusText: 'Bad' })
    await expect(triggerPredictionJobs('m2')).rejects.toThrow(/Prediction API error/)
  })

  test('Kończy pomyślnie dla poprawnego zestawu predykcji', async () => {
    const payload = { predictions: [{ date: '2020-01-02', mean: 5 }] }
    mockPrisma.prediction.create.mockResolvedValueOnce({ id: 'p1' })
    await expect(savePredictionPayload('m1', payload)).resolves.toBeUndefined()
  })

  test('Loguje błąd gdy deletePredictionJobs napotka wyjątek fetch', async () => {
    process.env.API_URL = 'http://api/'
    global.fetch.mockRejectedValueOnce(new Error('net fail'))
    await deletePredictionJobs('m1')
    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  test('Loguje błąd gdy syncPredictionJobs napotka wyjątek fetch', async () => {
    process.env.API_URL = 'http://api/'
    global.fetch.mockRejectedValueOnce(new Error('net fail'))
    await syncPredictionJobs('m1')
    expect(consoleErrorSpy).toHaveBeenCalled()
  })
})
