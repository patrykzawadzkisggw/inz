import prisma from '@/lib/prisma'
import { Prisma } from '@/generated/prisma'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'

export type PredictionPoint = {
  date: string
  low?: number
  median?: number
  high?: number
  mean?: number
}

export type PredictionResponse = {
  predictions: PredictionPoint[]
  [k: string]: unknown
}

const PredictionPointSchema = z.object({
  date: z.string(),
  low: z.number().optional(),
  median: z.number().optional(),
  high: z.number().optional(),
  mean: z.number().optional(),
}).loose()

const PredictionsPayloadSchema = z.object({
  predictions: z.array(PredictionPointSchema),
}).loose()

const ErrorPayloadSchema = z.object({
  error: z.any(),
}).loose()

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const session = await auth()
    const token = await session?.getToken?.()
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

export async function triggerPredictionJobs(modelId: string): Promise<PredictionResponse> {
  const base = process.env.API_URL
  if (!base) throw new Error('Brak PREDICT_API_URL')
  const url = `${base.replace(/\/$/, '')}/models/${encodeURIComponent(modelId)}/jobs`
  const authHeader = await getAuthHeader()
  const resp = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...authHeader }, cache: 'no-store' })
  const raw = await resp.text().catch(() => '')
  try {
    const parsed = raw ? JSON.parse(raw) : null
    const pretty = JSON.stringify(parsed, null, 2)
    if (!resp.ok) {
      throw new Error(`Prediction API error ${resp.status}: ${pretty || resp.statusText}`)
    }
    const ok = PredictionsPayloadSchema.safeParse(parsed)
    if (ok.success) return ok.data as unknown as PredictionResponse
    return parsed as PredictionResponse
  } catch {
    if (!resp.ok) {
      throw new Error(`Prediction API error ${resp.status}: ${raw || resp.statusText}`)
    }
    throw new Error('Prediction API returned non-JSON response')
  }
}

function isErrorPayload(obj: unknown): boolean {
  return ErrorPayloadSchema.safeParse(obj).success
}

export async function savePredictionPayload(modelId: string, payload: PredictionResponse) {
  if (isErrorPayload(payload)) {
    let printed = ''
    try { printed = JSON.stringify(payload, null, 2) } catch { printed = String(payload) }
    console.error(`Prediction error payload (modelId=${modelId}):\n${printed}`)
    return
  }
  const data = JSON.parse(JSON.stringify(payload)) as unknown as Prisma.InputJsonValue
  await prisma.prediction.create({ data: { model: { connect: { id: modelId } }, payloadJson: data } })
}

export async function deletePredictionJobs(modelId: string): Promise<void> {
   const base = process.env.API_URL
  if (!base) return
  const url = `${base.replace(/\/$/, '')}/models/${encodeURIComponent(modelId)}/jobs/sync`
  const authHeader = await getAuthHeader()
  try {
    const resp = await fetch(url, { method: 'POST', cache: 'no-store', headers: { ...authHeader } })
    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      console.error(`Scheduler sync jobs error ${resp.status}: ${text || resp.statusText}`)
    }
  } catch (e) {
    console.error('Scheduler sync jobs failed', e)
  }
}

export async function syncPredictionJobs(modelId: string): Promise<void> {
  const base = process.env.API_URL
  if (!base) return
  const url = `${base.replace(/\/$/, '')}/models/${encodeURIComponent(modelId)}/jobs/sync`
  const authHeader = await getAuthHeader()
  try {
    const resp = await fetch(url, { method: 'POST', cache: 'no-store', headers: { ...authHeader } })
    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      console.error(`Scheduler sync jobs error ${resp.status}: ${text || resp.statusText}`)
    }
  } catch (e) {
    console.error('Scheduler sync jobs failed', e)
  }
}
