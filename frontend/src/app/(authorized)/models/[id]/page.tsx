"use client";
import EditModelTabs, { ForecastConfig } from '@/components/model/EditModelTabs'
import { useParams } from 'next/navigation'
import { useModels } from '@/context/ModelsContext'
import Loading from '@/app/(authorized)/loading';

export default function EditModelPage() {
  const params = useParams() as { id?: string }
  const id = typeof params?.id === 'string' ? params.id : ''
  const { models, isLoading } = useModels()
  
  const m = models.find(x => x.id === id)
  if (isLoading) return Loading()
  if (!m) return <div>Model nie znaleziony</div>

  return (
    <div className="max-w-4xl w-full mx-auto">
      <EditModelTabs
        id={m.id}
        name={m.name}
        description={m.description}
        enableUpdates={m.enableUpdates}
        intervalSpec={(m as unknown as { dataFeeds?: { intervalSpec?: string }[] }).dataFeeds?.[0]?.intervalSpec ?? null}
        lastImportIsApi={(m as unknown as { imports?: { sourceKind?: string }[] }).imports?.[0]?.sourceKind === 'API'}
        modelType={m.type as unknown as '' | 'chronos' | 'morai' | 'timesfm'}
        forecastConfig={m.configJson  as ForecastConfig}
      />
    </div>
  )
}
