import prisma from '@/lib/prisma'
import { z } from 'zod'

export const functionInputSchema = z.object({
  name: z.string()
    .min(1, 'Nazwa jest wymagana')
    .max(255, 'Nazwa może mieć maksymalnie 255 znaków'),
  description: z.string().max(1000, 'Opis może mieć maksymalnie 1000 znaków').optional().nullable(),
  body: z.string()
    .min(1, 'Ciało funkcji jest wymagane')
    .max(10000, 'Ciało jest za długie (max 10000 znaków)'),
  body2: z.string()
    .max(10000, 'Ciało 2 jest za długie (max 10000 znaków)')
    .optional(),
  userId: z.string().optional().nullable(),
})

export type FunctionInput = z.infer<typeof functionInputSchema>

export async function createFunction(data: FunctionInput, userId: string) {
  const parsed = functionInputSchema.parse(data)
  return prisma.customFunction.create({
    data: {
      userId: userId,
      name: parsed.name,
      description: parsed.description || undefined,
      body: parsed.body,
      body2: parsed.body2 || '',
    },
  })
}

export async function deleteFunction(id: string, userId: string) {
  return prisma.customFunction.delete({ where: { id, userId: userId } })
}

export async function deleteUserFunction(id: string, userId: string | null | undefined) {
  if (!userId) throw new Error('Brak uprawnień')
  const fn = await prisma.customFunction.findUnique({ where: { id } })
  if (!fn || fn.userId !== userId) throw new Error('Nie znaleziono lub brak uprawnień')
  return prisma.customFunction.delete({ where: { id } })
}

export async function getFunction(id: string, userId: string) {
  return prisma.customFunction.findUnique({ where: { id, userId } })
}

export async function listFunctions(userId: string) {
  return prisma.customFunction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function updateFunction(id: string, data: Partial<FunctionInput>, userId: string) {
  const parsed = functionInputSchema.partial().parse(data)
  return prisma.customFunction.update({
    where: { id, userId },
  data: { ...parsed, userId: userId },
  })
}
