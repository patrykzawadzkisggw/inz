import prisma from '@/lib/prisma'
// Revalidate this public user page every 5 minutes (ISR)
export const revalidate = 300
import { notFound } from 'next/navigation'
import PublicDashboardView from '@/components/model/PublicDashboardView'
import { cacheItem, GridItem } from '@/lib/gridHelpers'
import { clerkClient } from '@clerk/nextjs/server'

async function getPublicUserAndWidgets(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, isAccountPrivate: true } })
  if (!user) return null
  if (user.isAccountPrivate) return null
  const widgets = await prisma.widget.findMany({ where: { userId: id }, orderBy: { createdAt: 'asc' } })
  // fetch Clerk profile for display (name, avatar)
  try {
    const client = await clerkClient()
    const c = await client.users.getUser(id)
    const profile = {
      firstName: c.firstName || '',
      lastName: c.lastName || '',
      publicName: c.firstName && c.lastName ? `${c.firstName} ${c.lastName}` : c.username || c.primaryEmailAddress?.emailAddress || '',
      avatarUrl: (c.imageUrl as string) || null,
    }
    return { user, widgets, profile }
  } catch (err) {
    // If Clerk lookup fails, still return widgets but without profile
    console.error('Clerk lookup failed for user', id, err)
    return { user, widgets, profile: null }
  }
}

export default async function PublicUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await getPublicUserAndWidgets(id)
  if (!res) return notFound()

  type WidgetRow = {
    id: string
    x: number
    y: number
    w: number
    h: number
    type: 'TEXT' | 'CHART' | 'TABLE'
    content?: string | null
    cacheJson?: unknown
    title?: string | null
    configJson?: unknown
  }
  const { widgets, profile } = res as { widgets: WidgetRow[]; profile: { firstName?: string; lastName?: string; publicName?: string; avatarUrl?: string | null } | null }

  const initialItems: GridItem[] = widgets.map(r => {
    const type = r.type === 'TEXT' ? 'tekst' : r.type === 'CHART' ? 'wykres' : 'tabela'
    let tableCache = undefined
    if (type === 'tabela' && Array.isArray(r.cacheJson)) {
      const firstUnknown: unknown = r.cacheJson[0]
      if (
        firstUnknown && typeof firstUnknown === 'object' &&
        Array.isArray((firstUnknown as { columns?: unknown }).columns) &&
        Array.isArray((firstUnknown as { rows?: unknown }).rows)
      ) {
        const cols = (firstUnknown as { columns: unknown[] }).columns
        const rowsArr = (firstUnknown as { rows: unknown[] }).rows
        if (cols.every((c: unknown) => typeof c === 'string')) {
          tableCache = { columns: cols as string[], rows: rowsArr.filter(rw => !!rw && typeof rw === 'object') as Record<string, unknown>[] }
        }
      }
    }
    return {
      i: r.id,
      x: r.x, y: r.y, w: r.w, h: r.h,
      type,
      content: r.content ?? undefined,
      cacheJson: Array.isArray(r.cacheJson) ? r.cacheJson as cacheItem[] : undefined,
      tableCache,
      title: r.title || undefined,
      configJson: r.configJson || undefined,
    }
  })

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-center gap-4">
        {profile?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatarUrl} alt={profile.publicName || 'Avatar'} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm text-gray-600">{(profile?.firstName || profile?.publicName || '').charAt(0) || '?'}</div>
        )}
        <div>
          <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{profile?.publicName || 'Użytkownik'}</div>
          <div className="text-sm text-gray-500">Publikowany dashboard</div>
        </div>
      </div>
      <PublicDashboardView initialItems={initialItems} />
    </div>
  )
}
