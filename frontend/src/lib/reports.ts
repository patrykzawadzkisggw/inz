import prisma from '@/lib/prisma'
import { z } from 'zod'
import { API_URL } from './constants'
import { FrequencyUnit } from '@/generated/prisma'
import { auth } from '@clerk/nextjs/server'

const reportBaseSchema = z.object({
  name: z.string()
    .min(1, 'Nazwa jest wymagana')
    .max(255, 'Nazwa może mieć maksymalnie 255 znaków'),
  enabled: z.boolean().default(true),
  frequencyValue: z.number()
    .int('Częstotliwość musi być liczbą całkowitą')
    .positive('Częstotliwość musi być dodatnia'),
  frequencyUnit: z.string()
    .min(1, 'Jednostka nie może być pusta'),
  conditionFormula: z.string()
    .max(5000, 'Warunek jest za długi (max 5000 znaków)')
    .optional(),
  messageTemplate: z.string()
    .max(10000, 'Treść jest za długa (max 10000 znaków)'),
  conditionFormula2: z.string()
    .max(50000, 'Warunek jest za długi (max 50000 znaków)')
    .optional(),
  messageTemplate2: z.string()
    .max(100000, 'Treść jest za długa (max 100000 znaków)')
    .optional(),
})

const ensureFrequencyPair = (val: { frequencyValue?: unknown; frequencyUnit?: unknown }, ctx: z.RefinementCtx) => {
  const hasFreqVal = typeof val.frequencyValue === 'number'
  const hasUnit = typeof val.frequencyUnit === 'string' && val.frequencyUnit.length > 0
  if (hasFreqVal && !hasUnit) {
    ctx.addIssue({ path: ['frequencyUnit'], code: 'custom', message: 'Jednostka wymagana gdy podano częstotliwość' })
  }
  if (hasUnit && !hasFreqVal) {
    ctx.addIssue({ path: ['frequencyValue'], code: 'custom', message: 'Częstotliwość wymagana gdy podano jednostkę' })
  }
}

export const reportInputSchema = reportBaseSchema.superRefine(ensureFrequencyPair)
const reportUpdateSchema = reportBaseSchema.partial().superRefine(ensureFrequencyPair)
export type ReportInput = z.infer<typeof reportInputSchema>
type ReportUpdateInput = z.infer<typeof reportUpdateSchema>

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const session = await auth()
    const token = await session?.getToken?.()
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

export async function createReport(userId: string | null, data: ReportInput) {
  const parsed = reportInputSchema.parse(data)
  const created = await prisma.report.create({
    data: {
      userId: userId as string,
      name: parsed.name,
      enabled: parsed.enabled,
      frequencyValue: parsed.frequencyValue,
      frequencyUnit: parsed.frequencyUnit as FrequencyUnit,
      conditionFormula: parsed.conditionFormula,
      messageTemplate: parsed.messageTemplate,
      nextRunAt: parsed.frequencyValue && parsed.frequencyUnit ? new Date() : null,
      conditionFormula2: parsed.conditionFormula2,
      messageTemplate2: parsed.messageTemplate2,
    },
  })
  try {
    const authHeader = await getAuthHeader()
    await fetch(`${API_URL}/jobs/${created.id}`, { method: 'POST', headers: { ...authHeader } })
  } catch (e) {
    console.error('Report schedule sync failed (create)', created.id, e)
  }
  return created
}

export async function deleteReport(id: string, userId: string) {
  const deleted = await prisma.report.delete({ where: { id, userId } })
  try {
      const authHeader = await getAuthHeader()
      await fetch(`${API_URL}/jobs/${id}`, { method: 'POST', headers: { ...authHeader } })
  } catch (e) {
    console.error('Report schedule delete failed', id, e)
  }
  return deleted
}

export async function getReport(id: string, userId: string) {
  return prisma.report.findUnique({ where: { id, userId } })
}

export async function listReports(userId: string) {
  return prisma.report.findMany({ where: { userId } })
}

export async function updateReport(id: string, data: Partial<ReportInput>, userId: string) {
  const parsed = reportUpdateSchema.parse(data as ReportUpdateInput)
  const updateData = { ...parsed } as Record<string, unknown>
  if (parsed.frequencyUnit !== undefined) updateData.frequencyUnit = parsed.frequencyUnit as FrequencyUnit
  if (parsed.frequencyValue !== undefined && parsed.frequencyUnit !== undefined) updateData.nextRunAt = new Date()
  const updated = await prisma.report.update({
    where: { id, userId },
    data: updateData,
  })
  try {
    const authHeader = await getAuthHeader()
    await fetch(`${API_URL}/jobs/${id}`, { method: 'POST', headers: { ...authHeader } })
  } catch (e) {
    console.error('Report schedule sync failed (update)', id, e)
  }
  return updated
}
