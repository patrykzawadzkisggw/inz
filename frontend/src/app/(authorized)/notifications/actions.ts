'use server'
import { createReport, deleteReport, getReport, listReports, reportInputSchema, updateReport } from '@/lib/reports'
import { currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { mapZodToErrors, transpileToPythonRaw, validateOnSentOnly } from '@/lib/userFunctions'

export type ReportFormState = {
  errors: Record<string, string>
  error?: string
  ok?: boolean
  record?: unknown
}

const emptyState: ReportFormState = { errors: {} }

export async function createReportAction(prevState: ReportFormState, formData: FormData): Promise<ReportFormState> {
  const state: ReportFormState = { ...emptyState }
  const user = await currentUser()

  const raw = {
    name: formData.get('name'),
    enabled: formData.get('enabled') === 'on',
    frequencyValue: formData.get('frequencyValue'),
    frequencyUnit: formData.get('frequencyUnit'),
    conditionFormula: formData.get('conditionFormula'),
    messageTemplate: formData.get('messageTemplate'),
  }

  const conditionSrc = typeof raw.conditionFormula === 'string' ? raw.conditionFormula : ''
  const messageSrc = typeof raw.messageTemplate === 'string' ? raw.messageTemplate : ''
  const onSentCheck = validateOnSentOnly(conditionSrc)
  if (!onSentCheck.ok) {
    state.errors.conditionFormula = onSentCheck.msg || 'Niepoprawny warunek'
    return state
  }
  const conditionFormula2 = conditionSrc ? await transpileToPythonRaw(conditionSrc) : undefined
  const messageTemplate2 = messageSrc ? await transpileToPythonRaw(messageSrc) : undefined
  const normalized = {
    name: typeof raw.name === 'string' ? raw.name : '',
    enabled: raw.enabled,
    frequencyValue: typeof raw.frequencyValue === 'string' && raw.frequencyValue.length ? Number(raw.frequencyValue) : undefined,
    frequencyUnit: typeof raw.frequencyUnit === 'string' && raw.frequencyUnit.length ? raw.frequencyUnit : undefined,
    conditionFormula: conditionSrc.length ? conditionSrc : undefined,
    messageTemplate: messageSrc.length ? messageSrc : undefined,
    conditionFormula2: conditionFormula2,
    messageTemplate2: messageTemplate2,
  }

  if (messageSrc && !messageTemplate2) {
    state.errors.messageTemplate = 'Niepoprawny szablon'
    return state
  }
  try {
    const validated = reportInputSchema.parse(normalized)
    const record = await createReport(user?.id || '', validated)
    revalidatePath('/notifications')
    return { ...state, ok: true, record }
  } catch (err) {
    const fieldErrors = mapZodToErrors(err)
    if (Object.keys(fieldErrors).length) return { errors: fieldErrors }
    console.error(err)
    return { errors: {}, error: 'Nie udało się utworzyć raportu' }
  }
}


export async function deleteReportAction(id?: string) {
  'use server'
  const user = await currentUser()
  return await deleteReport(id || '', user?.id || '')
}
export async function listReportsAction() {
  const user = await currentUser()
  return await listReports(user?.id || '')
}
export async function getReportAction(id: string) {
  const user = await currentUser()
  return await getReport(id, user?.id || '')
}

export async function updateReportAction(id: string, prevState: ReportFormState, formData: FormData): Promise<ReportFormState> {
  const state: ReportFormState = { errors: {} }
  const user = await currentUser()



  const raw = {
    name: formData.get('name'),
    enabled: formData.get('enabled'), 
    frequencyValue: formData.get('frequencyValue'),
    frequencyUnit: formData.get('frequencyUnit'),
    conditionFormula: formData.get('conditionFormula'),
    messageTemplate: formData.get('messageTemplate'),
  }

  const conditionSrc = typeof raw.conditionFormula === 'string' ? raw.conditionFormula.trim() : ''
  const messageSrc = typeof raw.messageTemplate === 'string' ? raw.messageTemplate.trim() : ''
  const onSentCheck2 = validateOnSentOnly(conditionSrc)
  if (conditionSrc && !onSentCheck2.ok) {
    state.errors.conditionFormula = onSentCheck2.msg || 'Niepoprawny warunek'
    return state
  }
  const conditionFormula2 = conditionSrc ? await transpileToPythonRaw(conditionSrc) : undefined
  const messageTemplate2 = messageSrc ? await transpileToPythonRaw(messageSrc) : undefined

  const partial: Record<string, unknown> = {}
  if (typeof raw.name === 'string' && raw.name.length) partial.name = raw.name
  if (raw.enabled === 'on') partial.enabled = true
  if (raw.enabled === null) partial.enabled = false 
  if (typeof raw.frequencyValue === 'string') {
    const val = raw.frequencyValue.trim()
    if (val.length) {
      const n = Number(val)
      if (!Number.isNaN(n)) partial.frequencyValue = n
    } else {
      partial.frequencyValue = undefined
      partial.frequencyUnit = undefined
    }
  }
  if (typeof raw.frequencyUnit === 'string') {
    const u = raw.frequencyUnit.trim()
    if (u.length) partial.frequencyUnit = u
  }
  if (typeof raw.conditionFormula === 'string') {
    const cf = conditionSrc
    if (cf.length) partial.conditionFormula = cf
    if (conditionSrc && conditionFormula2) partial.conditionFormula2 = conditionFormula2
  }
  if (typeof raw.messageTemplate === 'string') {
    const mt = messageSrc
    if (mt.length) partial.messageTemplate = mt
    if (messageSrc) {
      if (!messageTemplate2) {
        state.errors.messageTemplate = 'Niepoprawny szablon'
        return state
      }
      partial.messageTemplate2 = messageTemplate2
    }
  }

  try {
    const record = await updateReport(id, partial, user?.id || '')
    revalidatePath('/notifications')
    return { ...state, ok: true, record }
  } catch (err) {
    const fieldErrors = mapZodToErrors(err)
    if (Object.keys(fieldErrors).length) return { errors: fieldErrors }
    console.error(err)
    return { errors: {}, error: 'Nie udało się zaktualizować raportu' }
  }
}
