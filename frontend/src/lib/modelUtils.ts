import { type ForecastConfig } from '@/lib/models'

export type ImportOptions = {
  separator?: string
  sourceType?: string
  urlValue?: string
  fileName?: string
}

export function parsePositiveInt(v: unknown): number | undefined {
  if (typeof v !== 'string') return undefined
  const n = Number(v.trim())
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : undefined
}

export function splitCsv(v: unknown): string[] | undefined {
  if (typeof v !== 'string' || !v) return undefined
  const arr = v.split(',').map(s => s.trim()).filter(Boolean)
  return arr.length ? arr : undefined
}

export function buildForecastConfigFromForm(formData: FormData, mode: 'create'|'update'): Partial<ForecastConfig> {
  const cfg: Partial<ForecastConfig> = {}

  const freq = formData.get('frequency')
  if (typeof freq === 'string' && freq.trim()) cfg.frequency = freq

  const pl = parsePositiveInt(formData.get('prediction_length'))
  if (pl) {
    const MAX_PREDICTION = 12
    cfg.prediction_length = Math.min(pl, MAX_PREDICTION)
  }

  const miss = formData.get('missing_strategy')
  if (typeof miss === 'string' && (mode === 'create' || miss)) cfg.missing_strategy = miss as ForecastConfig['missing_strategy']

  const holTr = formData.get('holiday_treatment')
  if (typeof holTr === 'string' && (mode === 'create' || holTr)) cfg.holiday_treatment = holTr as ForecastConfig['holiday_treatment']

  const rulesRaw = formData.get('holiday_rules')
  if (typeof rulesRaw === 'string' && rulesRaw) {
    try {
      const arr = JSON.parse(rulesRaw)
      if (Array.isArray(arr)) cfg.holiday_rules = arr as ForecastConfig['holiday_rules']
    } catch {}
  }

  const dates = splitCsv(formData.get('holiday_dates'))
  if (dates) cfg.holiday_dates = dates

  if (formData.get('holiday_enabled') === 'on') cfg.holiday_enabled = true

  const holCountry = formData.get('holiday_country')
  if (typeof holCountry === 'string' && holCountry) cfg.holiday_country = holCountry

  return cfg
}

export function buildIntervalSpecFromForm(formData: FormData): string | null {
  const v = parsePositiveInt(formData.get('interval_value'))
  const u = String(formData.get('interval_unit') || '') as 'm'|'h'|'d'|''
  return v && u ? `${v}${u}` : null
}

export function rowsToCsv(
  rows: Record<string, unknown>[],
  schemaJson?: unknown,
  optionsJson?: ImportOptions
): { csv: string; headers: string[]; delimiter: string } {
  type SchemaCol = { key: string; name: string; type?: string; removed?: boolean }
  const schemaCols = Array.isArray(schemaJson) ? (schemaJson as SchemaCol[]) : undefined
  const visible = schemaCols ? schemaCols.filter(c => !c?.removed).map(c => String(c?.name)) : undefined
  const headers: string[] = visible && visible.length ? visible : (rows.length ? Object.keys(rows[0]) : [])
  const rawSep = optionsJson?.separator
  const sep: string = rawSep === '\t' ? '\t' : (rawSep || ',')
  const effectiveSep = sep === '\t' ? '\t' : sep
  const q = '"'
  const escapeCell = (v: unknown): string => {
    if (v === null || v === undefined) return ''
    const s = String(v)
    const needsQuote = s.includes(effectiveSep) || s.includes('\n') || s.includes('\r') || s.includes(q)
    const body = s.replaceAll(q, q + q)
    return needsQuote ? q + body + q : body
  }
  const csvLines: string[] = []
  csvLines.push(headers.map(h => escapeCell(h)).join(effectiveSep))
  for (const r of rows) csvLines.push(headers.map(h => escapeCell((r as Record<string, unknown>)[h])).join(effectiveSep))
  return { csv: csvLines.join('\n'), headers, delimiter: effectiveSep }
}

export function parseImportForm(formData: FormData): {
  rows?: Record<string, unknown>[]
  schemaJson?: unknown
  options?: ImportOptions
} {
  const rowsRaw = formData.get('import_rows_json')
  const schemaRaw = formData.get('import_schema_json')
  const optionsRaw = formData.get('import_options_json')
  let rows: Record<string, unknown>[] | undefined
  try {
    if (typeof rowsRaw === 'string' && rowsRaw) rows = JSON.parse(rowsRaw)
  } catch {}
  const schemaJson = (typeof schemaRaw === 'string' && schemaRaw) ? safeJson(schemaRaw) : undefined
  const options = (typeof optionsRaw === 'string' && optionsRaw) ? safeJson(optionsRaw) as ImportOptions : undefined
  return { rows, schemaJson, options }
}

function safeJson<T = unknown>(s: string): T | undefined {
  try { return JSON.parse(s) as T } catch { return undefined }
}
