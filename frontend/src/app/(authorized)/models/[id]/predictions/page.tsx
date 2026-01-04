import prisma from '@/lib/prisma'
import { SimpleObjectTable } from '@/components/DataTable'
import RefreshPredictionsButton from '@/components/model/RefreshPredictionsButton'
async function getLatestPrediction(modelId: string) {
  const model = await prisma.model.findUnique({ where: { id: modelId }, select: { id: true } })
  if (!model) return null
  const pred = await prisma.prediction.findFirst({ where: { modelId }, orderBy: { createdAt: 'desc' } })
  return pred
}

export default async function PredictionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const pred = await getLatestPrediction(id)
  if (!pred) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <h1 className="text-4xl font-extrabold dark:text-white w-full mx-auto mb-3">Predykcje</h1>
        <div className="text-sm text-red-600">Brak zapisanych predykcji dla tego modelu lub zadanie jeszcze trwa.</div>
      </div>
    )
  }
  const payload = pred.payloadJson as { predictions?: Array<{ date: string; low?: number; median?: number; high?: number; mean?: number }> }
  const rows: Array<{ date: string; low?: number; median?: number; high?: number; mean?: number }> = Array.isArray(payload?.predictions) ? payload.predictions! : []

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex items-center gap-3 mb-3">
        <h1 className="text-4xl font-extrabold dark:text-white w-full mx-auto">Predykcje</h1>
        <RefreshPredictionsButton modelId={id} />
      </div>
      {rows.length === 0 ? (
        <div className="text-sm text-red-600">Nie udało się odczytać predykcji (pusta odpowiedź).</div>
      ) : (
      
          <SimpleObjectTable data={rows} columns={['date', 'low', 'median', 'high', 'mean']} />
    
      )}
      <div className="text-xs text-gray-500 mt-2">Utworzono: {new Date(pred.createdAt).toLocaleString()}</div>
    </div>
  )
}
