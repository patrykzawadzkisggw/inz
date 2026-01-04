import { currentUser } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const user = await currentUser()
    if (!user?.id) return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } })
    const rows = await prisma.customFunction.findMany({
      where: { userId: user.id },
      select: { name: true, description: true, body: true },
      orderBy: { updatedAt: 'desc' },
    })
    const mapped = rows.map(r => {
      let example = `${r.name}()`
      const m = r.body?.match(/function\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/)
      if (m) {
        const params = m[2]
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .map((p, idx) => `<${p || 'arg' + (idx + 1)}>`) 
          .join(', ')
        example = `${r.name}(${params})`
      }
      return { name: r.name, description: r.description ?? '', example }
    })
    return new Response(JSON.stringify(mapped), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('user-functions route error', e)
    return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
}
