import { NextRequest, NextResponse } from 'next/server'
import { triggerPredictionJobs, savePredictionPayload } from '@/lib/predictions'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest | Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  try {
    const payload = await triggerPredictionJobs(id)
    await savePredictionPayload(id, payload)
    try { revalidatePath(`/models/${id}`) } catch {}
    return NextResponse.json({ ok: true, payload })
  } catch (e) {
    console.error('Prediction refresh failed', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
