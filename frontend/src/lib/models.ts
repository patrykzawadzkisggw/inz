import prisma from '@/lib/prisma'
import { z } from 'zod'
import { ModelMode, ModelType, Prisma } from '@/generated/prisma'
import { auth } from '@clerk/nextjs/server'

export const forecastConfigSchema = z.object({
  prediction_length: z.number().int().positive().default(12),
  holiday_dates: z.array(z.string()).optional(),
  missing_strategy: z.enum(['interpolate','ffill','bfill','zero','mean','median','drop'] as const).default('interpolate'),
  frequency: z.string().optional(), // e.g., 'D','W','MS','H'
  holiday_treatment: z.enum(['none','neutralize'] as const).default('none'),
  holiday_enabled: z.boolean().optional().default(false),
  holiday_country: z.string().optional(),
  holiday_rules: z.array(z.object({
    date: z.string(),
    name: z.string().optional(),
    location: z.string().optional(),
    annual: z.boolean().optional().default(true),
  })).optional(),
}).partial().transform((cfg) => ({
  prediction_length: cfg.prediction_length ?? 12,
  missing_strategy: cfg.missing_strategy ?? 'interpolate',
  holiday_treatment: cfg.holiday_treatment ?? 'none',
  holiday_dates: cfg.holiday_dates,
  frequency: cfg.frequency,
  holiday_enabled: cfg.holiday_enabled ?? false,
  holiday_country: cfg.holiday_country,
  holiday_rules: cfg.holiday_rules,
}))

export type ForecastConfig = z.infer<typeof forecastConfigSchema>

export const modelInputSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana').max(255, 'Maksymalnie 255 znaków'),
  description: z.string().max(2000, 'Maksymalnie 2000 znaków').optional().or(z.literal('')),
  type: z.enum(['chronos','morai','timesfm'] as const),
  mode: z.enum(['pretrained','custom'] as const),
  enableUpdates: z.boolean().optional().default(true),
  forecastConfig: forecastConfigSchema.optional(),
})

export type ModelInput = z.infer<typeof modelInputSchema>

export async function createModel(userId: string | null, data: ModelInput) {
  const parsed = modelInputSchema.parse(data)
  return prisma.model.create({
    data: {
      name: parsed.name,
      description: parsed.description || undefined,
  type: parsed.type as ModelType,
  mode: parsed.mode as ModelMode,
      enableUpdates: parsed.enableUpdates,
  configJson: parsed.forecastConfig ? (parsed.forecastConfig as unknown as Prisma.InputJsonValue) : ({} as Prisma.InputJsonValue),
      ownerId: userId || undefined,
    }
  })
}

export async function getModel(id: string) {
  const { userId } = await auth()
  return prisma.model.findUnique({
    where: { id, ownerId: userId as string },
    include: {
      dataFeeds: { where: { active: true }, take: 1, select: { intervalSpec: true } },
  imports: { where: { phase: 'INITIAL' }, orderBy: { createdAt: 'desc' }, take: 1, select: { sourceKind: true } },
    },
  })
}

export async function updateModel(id: string, data: Partial<ModelInput>) {
  const { userId } = await auth()
  const parsed = modelInputSchema.partial().parse(data)
  return prisma.model.update({
    where: { id, ownerId: userId as string },
    data: {
      ...(parsed.name !== undefined ? { name: parsed.name } : {}),
      ...(parsed.description !== undefined ? { description: parsed.description || undefined } : {}),
      ...(parsed.type !== undefined ? { type: parsed.type as ModelType } : {}),
      ...(parsed.mode !== undefined ? { mode: parsed.mode as ModelMode } : {}),
      ...(parsed.enableUpdates !== undefined ? { enableUpdates: parsed.enableUpdates } : {}),
  ...(parsed.forecastConfig !== undefined ? { configJson: parsed.forecastConfig ? (parsed.forecastConfig as unknown as Prisma.InputJsonValue) : ({} as Prisma.InputJsonValue) } : {}),
    }
  })
}
