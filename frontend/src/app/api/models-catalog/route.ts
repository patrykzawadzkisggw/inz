import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// endpoint używany do pobrania katalogu modeli wraz z ich kolumnami dla formulaBox
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json([], { status: 200 })

    const models = await prisma.model.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, description: true },
      orderBy: { updatedAt: 'desc' },
    })
    if (models.length === 0) return NextResponse.json([], { status: 200 })

    const imports = await prisma.dataImport.findMany({
      where: { modelId: { in: models.map(m => m.id) }},
      select: { modelId: true, processedSchemaJson: true },
      orderBy: { createdAt: 'desc' },
    })

    const latest = new Map<string, unknown>()
    for (const imp of imports) if (imp.modelId && !latest.has(imp.modelId)) latest.set(imp.modelId, imp.processedSchemaJson as unknown)

    const result = models.map(m => {
      const schema = latest.get(m.id)
      const columns = Array.isArray(schema)
        ? (schema as Array<{ name?: string; key?: string; removed?: boolean }>)
            .filter(c => !c?.removed)
            .map(c => String(c?.name || c?.key))
            .filter(Boolean)
        : []
      return { name: m.name, description: m.description || '', columns }
    })

    return NextResponse.json(result, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
