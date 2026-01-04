import Papa from 'papaparse'
import { z } from 'zod'

export const PreviewGridSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.record(z.string(), z.unknown())),
}).loose()

export type PreviewGrid = z.infer<typeof PreviewGridSchema>

export function toGridFromObjects(items: Record<string, unknown>[], maxCols = 200): PreviewGrid {
    const keySet = new Set<string>()
    for (const it of items) {
      Object.keys(it ?? {}).forEach(k => { if (keySet.size < maxCols) keySet.add(k) })
      if (keySet.size >= maxCols) break
    }
    const columns = Array.from(keySet)
    const rows = items.map(it => {
      const row: Record<string, unknown> = {}
      for (const c of columns) row[c] = (it as Record<string, unknown>)[c]
      return row
    })
    return { columns, rows }
  }

export function toGridFromArrays(arr: unknown[][], header: boolean): PreviewGrid {
    if (arr.length === 0) return { columns: [], rows: [] }
    let columns: string[]
    let startIdx = 0
    if (header) {
      const firstRow = (arr[0] ?? []) as unknown[]
      columns = firstRow.map((v, i) => (v ?? `col_${i+1}`).toString())
      startIdx = 1
    } else {
      const maxLen = Math.max(...arr.map(r => r?.length ?? 0))
      columns = Array.from({ length: maxLen }, (_, i) => `col_${i+1}`)
    }
    const rows = arr.slice(startIdx).map(r => {
      const obj: Record<string, unknown> = {}
      const rowArr = (r ?? []) as unknown[]
      for (let i = 0; i < columns.length; i++) obj[columns[i]] = rowArr?.[i]
      return obj
    })
    return { columns, rows }
  }

export async function parseCSVText(text: string, delim: string, header: boolean): Promise<PreviewGrid> {
    const res = Papa.parse(text, {
      delimiter: delim === '\\t' ? '\t' : delim,
      skipEmptyLines: true,
      preview: 300,
      dynamicTyping: false,
    })

    const data = (res.data as unknown[][]).filter(r => r && r.length)
    return toGridFromArrays(data, header)
  }

export function simpleHash(str: string): string {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i)
  return (h >>> 0).toString(16)
}

export function normalizeSeparator(sep: string): string {
  return sep === '\\t' ? '\t' : sep
}

export function isJsonPreferred(
  format: 'auto'|'csv'|'json',
  hint?: { ext?: string; contentType?: string }
): boolean {
  if (format === 'json') return true
  if (format === 'csv') return false
  const ext = hint?.ext?.toLowerCase()
  const ct = (hint?.contentType || '').toLowerCase()
  if (ext === 'json') return true
  if (ct.includes('json')) return true
  return false
}

export function buildKeyBaseFile(fileName: string, text: string): string {
  return `file:${fileName}:${text.length}:${simpleHash(text.slice(0, 20000))}`
}

export function buildKeyBaseUrl(url: string, text: string): string {
  return `url:${url}:${text.length}:${simpleHash(text.slice(0, 20000))}`
}

export function gridFromJsonText(text: string, header: boolean): PreviewGrid {
  const parsed: unknown = JSON.parse(text)

  const ArrayOfArrays = z.array(z.array(z.unknown()))
  const ArrayOfObjects = z.array(z.record(z.string(), z.unknown()))
  const PlainObject = z.record(z.string(), z.unknown())

  if (ArrayOfArrays.safeParse(parsed).success) {
    return toGridFromArrays(parsed as unknown[][], header)
  }
  if (ArrayOfObjects.safeParse(parsed).success) {
    return toGridFromObjects(parsed as Record<string, unknown>[])
  }
  if (PlainObject.safeParse(parsed).success) {
    return toGridFromObjects([parsed as Record<string, unknown>])
  }
  return { columns: ['value'], rows: [{ value: parsed as unknown }] }
}

export function isPreviewGrid(val: unknown): val is PreviewGrid {
  return PreviewGridSchema.safeParse(val).success
}