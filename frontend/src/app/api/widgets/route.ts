import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { transpileToPythonRaw, runPython } from '@/lib/userFunctions'

export async function POST(req: NextRequest) {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid payload' }, { status: 400 })
  const payload = body as Record<string, unknown>
  const type = payload.type as string | undefined
  const content = payload.content as string | undefined
  const configJson = payload.configJson as unknown
  const title = payload.title as string | undefined
  const transpileSource = payload.transpileSource as string | undefined
  if (!type || !['tekst','wykres','tabela'].includes(type)) return NextResponse.json({ error: 'invalid type' }, { status: 400 })

  if (type === 'tekst') {
    if (!content || !String(content).trim()) return NextResponse.json({ error: 'empty text' }, { status: 400 })
  }
  const hasRows = (v: unknown): v is { rows: unknown[] } => !!v && typeof v === 'object' && Array.isArray((v as Record<string,unknown>).rows)
  const hasRecords = (v: unknown): v is { records: unknown[] } => !!v && typeof v === 'object' && Array.isArray((v as Record<string,unknown>).records)
  if (type === 'tabela') {
    if (!hasRows(configJson) || configJson.rows.length === 0) return NextResponse.json({ error: 'empty table' }, { status: 400 })
  }
  if (type === 'wykres') {
    if (!hasRecords(configJson) || configJson.records.length === 0) return NextResponse.json({ error: 'empty chart' }, { status: 400 })
  }

  const sourceForTranspile = (transpileSource ?? (type === 'tekst' ? content : '') )?.trim() || ''
  const python = sourceForTranspile ? (await transpileToPythonRaw(sourceForTranspile)) ?? null : null
  const jsonData = configJson === undefined || configJson === null ? undefined : (configJson as unknown as object)
  const widget = await prisma.widget.create({
    data: {
      userId: user.id,
      type: type === 'tekst' ? 'TEXT' : type === 'wykres' ? 'CHART' : 'TABLE',
      x: 0, y: 0, w: 3, h: 2,
      // `content` is non-nullable in the DB schema, so ensure we always pass a string.
      content: content?.trim() ?? '',
      title: title?.trim() || null,
      content2: python,
      ...(jsonData !== undefined ? { configJson: jsonData } : {}),
    }
  })

  let results: unknown = null
  if (widget.content2) {
    results = await runPython(widget.content2)
    if (results !== null) {
  await prisma.widget.update({ where: { id: widget.id }, data: { cacheJson: results as unknown as object } })
    }
  }

  return NextResponse.json({ widget: { ...widget, cacheJson: results } }, { status: 201 })
}
