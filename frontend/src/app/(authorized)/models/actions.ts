'use server'
import { createModel, modelInputSchema, updateModel } from '@/lib/models'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { Prisma } from '@/generated/prisma'
import { triggerPredictionJobs, savePredictionPayload, deletePredictionJobs, syncPredictionJobs } from '@/lib/predictions'
import { mapZodToErrors, normalizeDescription } from '@/lib/userFunctions'
import { buildForecastConfigFromForm, buildIntervalSpecFromForm, rowsToCsv, parseImportForm } from '@/lib/modelUtils'

export type ModelFormState = {
  errors: Record<string, string>
  error?: string
  ok?: boolean
  modelId?: string
}

export async function deleteModelAction(id: string) {
  if (!id) return { error: 'Brak id' }
  const { userId } = await auth()
  if (!userId) return { error: 'Brak uprawnień' }
  try {
    const own = await prisma.model.findFirst({ where: { id, ownerId: userId }, select: { id: true } })
    if (!own) return { error: 'Model nie istnieje lub brak uprawnień' }
    await prisma.$transaction([
      prisma.dataFeed.deleteMany({ where: { modelId: id } }),
      prisma.dataImport.deleteMany({ where: { modelId: id } }),
      prisma.prediction.deleteMany({ where: { modelId: id } }),
      prisma.model.delete({ where: { id } }),
    ])

    void deletePredictionJobs(id)
    revalidatePath('/models')
    return { ok: true }
  } catch (e) {
    console.error(e)
    return { error: 'Nie udało się usunąć modelu' }
  }
}

export async function updateModelAction(prev: ModelFormState, formData: FormData): Promise<ModelFormState> {
  const state: ModelFormState = { errors: {} }
  const id = formData.get('id')
  if (typeof id !== 'string' || !id) return { errors: {}, error: 'Brak id' }
  const { userId } = await auth()
  if (!userId) return { errors: {}, error: 'Brak uprawnień' }

  const fc = buildForecastConfigFromForm(formData, 'update')
  const intervalSpec = buildIntervalSpecFromForm(formData)

  const partial: Record<string, unknown> = {}
  const name = formData.get('name')
  if (typeof name === 'string') partial.name = name
  const typeField = formData.get('type')
  if (typeof typeField === 'string' && ['chronos','morai','timesfm'].includes(typeField)) partial.type = typeField
  partial.description = normalizeDescription(formData.get('description'))
  const enableUpdates = formData.get('enableUpdates')
  if (enableUpdates !== null) partial.enableUpdates = enableUpdates === 'on'

  if (Object.keys(fc).length) {
    const existing = await prisma.model.findFirst({ where: { id, ownerId: userId }, select: { configJson: true } })
    const merged = { ...(existing?.configJson as Record<string, unknown> || {}), ...fc }
    const pl = (merged as Record<string, unknown>)['prediction_length']
    if (typeof pl === 'number' && Number.isFinite(pl)) {
      ;(merged as Record<string, unknown>)['prediction_length'] = Math.min(pl, 12)
    } else if (typeof (existing?.configJson as Record<string, unknown> | undefined)?.['prediction_length'] === 'number') {
      ;(merged as Record<string, unknown>)['prediction_length'] = Math.min(((existing?.configJson as Record<string, unknown>)['prediction_length'] as number), 12)
    }
    partial.forecastConfig = merged
  }

  try {
    const exists = await prisma.model.findFirst({ where: { id, ownerId: userId }, select: { id: true } })
    if (!exists) return { errors: {}, error: 'Model nie istnieje lub brak uprawnień' }

  await updateModel(id, partial)

    if (intervalSpec) {
      const existingFeed = await prisma.dataFeed.findFirst({ where: { modelId: id, active: true } })
      if (existingFeed) {
        await prisma.dataFeed.update({ where: { id: existingFeed.id }, data: { intervalSpec } })
      } else {
        const data: Prisma.DataFeedCreateInput = {
          model: { connect: { id } },
          kind: 'API',
          intervalSpec,
          active: true,
        }
        await prisma.dataFeed.create({ data })
      }
    }

    try {
      await syncPredictionJobs(id)
    } catch (e) {
      console.error('Scheduler sync failed', e)
    }
    revalidatePath('/models')
  return { ...state, ok: true }
  } catch (err) {
    const fieldErrors = mapZodToErrors(err)
    if (Object.keys(fieldErrors).length) return { errors: fieldErrors }
    console.error(err)
    return { errors: {}, error: 'Nie udało się zaktualizować modelu' }
  }
}

export async function createModelAction(prev: ModelFormState, formData: FormData): Promise<ModelFormState> {
  const state: ModelFormState = { errors: {} }
  const { userId } = await auth()
  if (!userId) return { errors: {}, error: 'Brak uprawnień' }
  

  const name = formData.get('name')
  const type = formData.get('type')
  const mode = formData.get('mode')
  const normalized = {
    name: typeof name === 'string' ? name : '',
    description: normalizeDescription(formData.get('description')),
    type: typeof type === 'string' ? (type as 'chronos'|'morai'|'timesfm') : undefined,
    mode: typeof mode === 'string' ? (mode as 'pretrained'|'custom') : undefined,
    enableUpdates: formData.get('enableUpdates') === 'on',
    forecastConfig: buildForecastConfigFromForm(formData, 'create'),
  }

  try {
    const parsed = modelInputSchema.parse(normalized)
    let model
    try {
  model = await createModel(userId, parsed)
    } catch (e) {
      if (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'P2002') {
        return { errors: { name: 'Model o takiej nazwie już istnieje u tego użytkownika' } }
      }
      throw e
    }

  const intervalSpec = buildIntervalSpecFromForm(formData)
    if (intervalSpec) {
      const data: Prisma.DataFeedCreateInput = {
        model: { connect: { id: model.id } },
        kind: 'API',
        intervalSpec,
        active: true,
        lastRunAt: null,
      }
      await prisma.dataFeed.create({ data })
    }

    const { rows, schemaJson, options } = parseImportForm(formData)
    if (rows && Array.isArray(rows)) {
      const { csv: csvStr, headers, delimiter } = rowsToCsv(rows as Record<string, unknown>[], schemaJson, options)

          const sourceRefInit = (options?.sourceType === 'url' ? options?.urlValue?.trim() : options?.fileName?.trim()) || ''
          const dataImportData: Prisma.DataImportCreateInput = {
          model: { connect: { id: model.id } },
          phase: 'INITIAL',
  sourceKind: options?.sourceType === 'url' ? 'API' : 'FILE',
        sourceRef: sourceRefInit,
        processedSchemaJson: (schemaJson ?? undefined) as unknown as Prisma.InputJsonValue,
        importOptionsJson: { ...(options || {}), storedAs: 'csv', delimiter, headers } as unknown as Prisma.InputJsonValue,
          dataBlob: Buffer.from(csvStr, 'utf8'),
          startedAt: new Date(),
          finishedAt: new Date(),
        }
        const imp = await prisma.dataImport.create({ data: dataImportData })
    void imp
    }

    try {
      const payload = await triggerPredictionJobs(model.id)
      await savePredictionPayload(model.id, payload)
    } catch (e) {
      console.error('Prediction trigger failed', e)
    }
    revalidatePath('/models')
    return { ...state, ok: true, modelId: model.id }
  } catch (err) {
    const fieldErrors = mapZodToErrors(err)
    if (Object.keys(fieldErrors).length) return { errors: fieldErrors }
    console.error(err)
    return { errors: {}, error: 'Nie udało się utworzyć modelu' }
  }
}

export async function addManualImportAction(prev: ModelFormState, formData: FormData): Promise<ModelFormState> {
  const state: ModelFormState = { errors: {} }
  const { userId } = await auth()
  if (!userId) return { errors: {}, error: 'Brak uprawnień' }

  const id = formData.get('id')
  if (typeof id !== 'string' || !id) return { errors: {}, error: 'Brak id modelu' }

  const model = await prisma.model.findFirst({ where: { id, ownerId: userId }, select: { id: true } })
  if (!model) return { errors: {}, error: 'Model nie istnieje lub brak uprawnień' }

  try {
    const { rows, schemaJson, options } = parseImportForm(formData)
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return { errors: {}, error: 'Brak danych do importu' }
    }

    const { csv: csvStr, headers, delimiter } = rowsToCsv(rows as Record<string, unknown>[], schemaJson, options)

    const sourceRefManual = (options?.sourceType === 'url' ? options?.urlValue?.trim() : options?.fileName?.trim()) || ''
    const data: Prisma.DataImportCreateInput = {
      model: { connect: { id } },
      phase: 'UPDATE',
      sourceKind: options?.sourceType === 'url' ? 'API' : 'FILE',
      sourceRef: sourceRefManual,
      processedSchemaJson: (schemaJson ?? undefined) as unknown as Prisma.InputJsonValue,
      importOptionsJson: { ...(options || {}), storedAs: 'csv', delimiter, headers } as unknown as Prisma.InputJsonValue,
      dataBlob: Buffer.from(csvStr, 'utf8'),
      startedAt: new Date(),
      finishedAt: new Date(),
    }

    await prisma.dataImport.create({ data })

    try {
      const payload = await triggerPredictionJobs(id)
      await savePredictionPayload(id, payload)
    } catch (e) {
      console.error('Prediction trigger failed (manual import)', e)
    }

    revalidatePath(`/models/${id}`)
    return { ...state, ok: true, modelId: id }
  } catch (err) {
    console.error(err)
    return { errors: {}, error: 'Nie udało się dodać danych do modelu' }
  }
}

export async function listModelsAction() {
  const { userId } = await auth()
  if (!userId) return { errors: {}, error: 'Brak uprawnień' }
  return await prisma.model.findMany({ where: { ownerId: userId } ,include: {
      dataFeeds: { where: { active: true }, take: 1, select: { intervalSpec: true } },
  imports: { where: { phase: 'INITIAL' }, orderBy: { createdAt: 'desc' }, take: 1, select: { sourceKind: true, processedSchemaJson: true } },
    }, orderBy: {updatedAt: 'desc'} })
}