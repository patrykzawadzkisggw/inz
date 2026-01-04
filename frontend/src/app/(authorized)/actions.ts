'use server'
import prisma from '@/lib/prisma';
import { runPython } from '@/lib/userFunctions';

type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue }
import { bulkUpdateWidgetPositions, deleteWidget } from '@/lib/widgets'
import { currentUser } from '@clerk/nextjs/server'

async function updateWidgetCache(id: string, newCache: unknown) {
  const cacheData: JSONValue | JSONValue[] | Record<string, JSONValue> | undefined = (newCache === null ? undefined : (newCache as JSONValue))
  await prisma.widget.update({ where: { id }, data: { cacheJson: cacheData as unknown as object } })
  return cacheData
}

export async function deleteWidgetAction(id: string) {
  if (!id) return { ok: false }
  const user = await currentUser()
  await deleteWidget(id, user?.id || '')
  return { ok: true }
}

export async function bulkUpdateWidgetPositionsAction(items: Array<{ id: string; x?: number; y?: number; w?: number; h?: number }>) {
  const user = await currentUser()
  // Forward only defined coordinates; lib will ignore undefineds
  const res = await bulkUpdateWidgetPositions(items, user?.id || '')
  return res
}

export async function listWidgetsAction() {
  const user = await currentUser()
  const widgets = await prisma.widget.findMany({ where: { userId: user?.id || ''  }, orderBy: { createdAt: 'asc' } })
  return widgets
}

export async function getWidgetCacheAction(id: string) {
  if (!id) return null
  const widget = await prisma.widget.findUnique({ where: { id } }).catch(() => null)
  return widget?.cacheJson ?? null
}

export async function refreshWidgetAction(id: string) {
  if (!id) return { ok: false, error: 'missing id' }

  const widget = await prisma.widget.findUnique({ where: { id } }).catch((e) => {
    console.error('refreshWidgetAction find error', id, e)
    return null
  })
  if (!widget) return { ok: false, error: 'not found' }

  const newCache: unknown = widget.content2
    ? await runPython(widget.content2).catch((e) => {
        console.error('refresh run error', id, e)
        return null as unknown
      })
    : null

  await updateWidgetCache(id, newCache).catch((e) => {
    console.error('updateWidgetCache error', id, e)
  })

  return { ok: true, cache: newCache }
}