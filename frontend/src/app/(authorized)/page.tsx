
import '@/css/custom-grid.css'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { listWidgetsAction } from './actions'
import { cacheItem, GridItem } from '@/lib/gridHelpers'
import DashboardGrid from '@/components/DashboardGrid'

export default async function Home() {
  const rows = await listWidgetsAction()
  const initialItems: GridItem[] = rows.map(r => {
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
        if (cols.every(c => typeof c === 'string')) {
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
      <DashboardGrid initialItems={initialItems} />
    </div>
  )
}
