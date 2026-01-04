import prisma from '@/lib/prisma'
import { Prisma } from '@/generated/prisma'

export type UIWidgetType = 'tekst' | 'wykres' | 'tabela'

export function uiToDbType(t: UIWidgetType): 'TEXT' | 'CHART' | 'TABLE' {
  switch (t) {
    case 'tekst': return 'TEXT'
    case 'wykres': return 'CHART'
    case 'tabela': return 'TABLE'
  }
}

export function dbToUiType(t: 'TEXT' | 'CHART' | 'TABLE'): UIWidgetType {
  switch (t) {
    case 'TEXT': return 'tekst'
    case 'CHART': return 'wykres'
    case 'TABLE': return 'tabela'
  }
}

export async function listWidgets(userId?: string) {
  const rows = await prisma.widget.findMany({ where: userId ? { userId } : {}, orderBy: { createdAt: 'asc' } })
  return rows
}

export async function createWidget(data: {
  userId?: string | null
  type: UIWidgetType
  title?: string | null
  x: number; y: number; w: number; h: number
  content?: string | null
  content2?: string | null
  dataQuery?: string | null
  configJson?: Prisma.InputJsonValue
  order?: number | null
} ) {
  const created = await prisma.widget.create({
    data: {
      userId: data.userId || undefined,
      type: uiToDbType(data.type),
      title: data.title ?? null,
      x: data.x, y: data.y, w: data.w, h: data.h,
      content: data.content ?? "",
      content2: data.content2 ?? "",
      ...(data.configJson !== undefined ? { configJson: data.configJson } : {}),
    }
  })
  return created
}

export async function updateWidget(id: string, data: Partial<{ 
  type: UIWidgetType
  title: string | null
  x: number; y: number; w: number; h: number
  content: string | null
  dataQuery: string | null
  configJson: Prisma.InputJsonValue
  order: number | null
}>) {
  const updated = await prisma.widget.update({
    where: { id },
    data: {
      ...(data.type ? { type: uiToDbType(data.type) } : {}),
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.x !== undefined ? { x: data.x } : {}),
      ...(data.y !== undefined ? { y: data.y } : {}),
      ...(data.w !== undefined ? { w: data.w } : {}),
      ...(data.h !== undefined ? { h: data.h } : {}),
      ...(data.content !== undefined ? { content: data.content ?? "" } : {}),
      ...(data.dataQuery !== undefined ? { dataQuery: data.dataQuery } : {}),
      ...(data.configJson !== undefined ? { configJson: data.configJson } : {}),
      ...(data.order !== undefined ? { order: data.order } : {}),
    }
  })
  return updated
}

export async function bulkUpdateWidgetPositions(
  entries: Array<{ id: string; x?: number; y?: number; w?: number; h?: number }>,
  userId: string
) {
  if (!entries.length) return { count: 0 }

  const filtered = entries.filter(e =>
    e.x !== undefined || e.y !== undefined || e.w !== undefined || e.h !== undefined
  )
  if (!filtered.length) return { count: 0 }

  const tx = filtered.map(e =>
    prisma.widget.update({
      where: { id: e.id, userId },
      data: {
        ...(e.x !== undefined ? { x: e.x } : {}),
        ...(e.y !== undefined ? { y: e.y } : {}),
        ...(e.w !== undefined ? { w: e.w } : {}),
        ...(e.h !== undefined ? { h: e.h } : {}),
      },
    })
  )

  const res = await prisma.$transaction(tx)
  return { count: res.length }
}

export async function deleteWidget(id: string, userId: string) {
  await prisma.widget.delete({ where: { id, userId } })
}
