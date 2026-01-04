// @ts-nocheck
jest.mock('next/server', () => ({ NextResponse: { json: jest.fn((body, init) => ({ body, status: init?.status ?? 200 })) } }))
jest.mock('@/lib/predictions', () => ({ triggerPredictionJobs: jest.fn(), savePredictionPayload: jest.fn() }))
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { POST } from '@/app/api/models/[id]/predictions/refresh/route'
import { triggerPredictionJobs, savePredictionPayload } from '@/lib/predictions'
import { revalidatePath } from 'next/cache'

describe('endpoint odświeżania predykcji modelu', () => {
  beforeEach(() => {
    ;(triggerPredictionJobs as any).mockReset()
    ;(savePredictionPayload as any).mockReset()
    ;(revalidatePath as any).mockReset()
  })

  test('zwraca 400 gdy brakuje id', async () => {
    const ctx = { params: Promise.resolve({ id: '' }) }
    const res = await POST({} as any, ctx as any)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'missing id' })
  })

  test('przy sukcesie uruchamia zadania i zapisuje payload', async () => {
    const payload = { jobs: [1] }
    ;(triggerPredictionJobs as any).mockResolvedValue(payload)
    ;(savePredictionPayload as any).mockResolvedValue(true)
    const ctx = { params: Promise.resolve({ id: 'm1' }) }
    const res = await POST({} as any, ctx as any)
    expect(triggerPredictionJobs).toHaveBeenCalledWith('m1')
    expect(savePredictionPayload).toHaveBeenCalledWith('m1', payload)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, payload })
  })

  test('w przypadku błędu zwraca 500', async () => {
    ;(triggerPredictionJobs as any).mockRejectedValue(new Error('fail'))
    const ctx = { params: Promise.resolve({ id: 'm2' }) }
    const res = await POST({} as any, ctx as any)
    expect(res.status).toBe(500)
    expect(res.body).toHaveProperty('error')
  })
})
