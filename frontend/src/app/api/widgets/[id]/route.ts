import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { transpileToPythonRaw, runPython } from '@/lib/userFunctions'

type Row = { id: string; name: string; value: string; draft?: boolean }
type TableCfg = { rows: Row[] }
type ChartCfg = { records: Row[]; chartType: string }

const isTableCfg = (v: unknown): v is TableCfg => !!v && typeof v === 'object' && Array.isArray((v as TableCfg).rows)
const isChartCfg = (v: unknown): v is ChartCfg => !!v && typeof v === 'object' && Array.isArray((v as ChartCfg).records)
const trimOrNull = (s?: string) => (s?.trim() ? s.trim() : null)
const appendDisplay = (base: string, type: 'TEXT' | 'TABLE' | 'CHART', cfg?: TableCfg | ChartCfg): string => {
  if (!base.trim()) return ''
  if (type === 'TEXT') return base
  if (type === 'TABLE' && cfg && isTableCfg(cfg)) {
    const args = cfg.rows.map(r => `${r.value}, "${r.name}"`).join(',')
    return `${base}\nDisplayTable(CreateDF(${args}));`
  }
  if (type === 'CHART' && cfg && isChartCfg(cfg)) {
    const args = cfg.records.map(r => `${r.value}, "${r.name}"`).join(',')
    const kind = cfg.chartType || 'line'
    return `${base}\nDisplayChart(CreateDF(${args}),"${kind}");`
  }
  return base
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await context.params
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  let payload: Record<string, unknown>
  try {
    const body = await req.json()
    if (!body || typeof body !== 'object') throw new Error('invalid')
    payload = body as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const title = typeof payload.title === 'string' ? payload.title : undefined
  const content = typeof payload.content === 'string' ? payload.content : undefined
  const configJson = payload.configJson as TableCfg | ChartCfg | undefined

  const widget = await prisma.widget.findFirst({ where: { id, userId: user.id } })
  if (!widget) return NextResponse.json({ error: 'not found' }, { status: 404 })

  if (widget.type === 'TEXT' && content !== undefined && !content.trim()) {
    return NextResponse.json({ error: 'empty text' }, { status: 400 })
  }
  if (widget.type === 'TABLE' && configJson !== undefined) {
    if (!isTableCfg(configJson) || configJson.rows.length === 0) return NextResponse.json({ error: 'empty table' }, { status: 400 })
  }
  if (widget.type === 'CHART' && configJson !== undefined) {
    if (!isChartCfg(configJson) || configJson.records.length === 0) return NextResponse.json({ error: 'empty chart' }, { status: 400 })
  }

  let newPython: string | null | undefined
  if (content !== undefined) {
    const base = content.trim()
    const augmented = appendDisplay(base, widget.type, configJson)
    newPython = augmented ? await transpileToPythonRaw(augmented) ?? null : null
  }

  type UpdateData = {
    title?: string | null;
    // content is required in the DB (non-nullable), so when updating pass a string
    content?: string;
    configJson?: object;
    content2?: string | null;
  }
  const updateData: UpdateData = {}
  if (title !== undefined) updateData.title = trimOrNull(title)
  if (content !== undefined) updateData.content = content.trim()
  if (configJson !== undefined) updateData.configJson = configJson as object
  if (newPython !== undefined) updateData.content2 = newPython

  const updated = await prisma.widget.update({ where: { id }, data: updateData })

  let cacheJson: unknown = updated.cacheJson
  if (updated.content2 && (newPython !== undefined || configJson !== undefined)) {
    const results = await runPython(updated.content2)
    cacheJson = results ?? null
    if (results !== null) await prisma.widget.update({ where: { id }, data: { cacheJson: results as object } })
  }

  return NextResponse.json({ widget: { ...updated, cacheJson } })
}
