"use client";

import React, { useEffect, useActionState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import EditModelForm from '@/components/model/EditModelForm'
import ImportLayout from '@/components/custom/ImportLayout'
import Button2 from '@/components/custom/Button2'
import { addManualImportAction, type ModelFormState } from '@/app/(authorized)/models/actions'

export interface ForecastConfig {
  prediction_length?: number
  frequency?: string
  missing_strategy?: string
  holiday_treatment?: string
  holiday_enabled?: boolean
  holiday_country?: string
  holiday_dates?: string[]
  // allow extra keys without triggering errors
  [key: string]: unknown
}

type Props = {
  id: string
  name: string
  description?: string | null
  enableUpdates?: boolean | null
  intervalSpec?: string | null
  lastImportIsApi: boolean
  modelType?: '' | 'chronos' | 'morai' | 'timesfm'
  forecastConfig?: ForecastConfig
}

export default function EditModelTabs({ id, name, description, enableUpdates, intervalSpec, lastImportIsApi, modelType, forecastConfig }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const current = searchParams?.get('tab') ?? 'model'

  const initial: ModelFormState = { errors: {} }
  const [state, formAction, pending] = useActionState<ModelFormState, FormData>(addManualImportAction, initial)

  useEffect(() => {
    if (state.ok && id) router.push(`/models/${id}`)
  }, [state.ok, id, router])

  const pathname = usePathname()

  function gotoTab(t: string) {
    const params = new URLSearchParams(Array.from(searchParams?.entries() ?? []))
    params.set('tab', t)
    const qs = params.toString()
    // Keep current pathname (e.g. /models/[id]/edit) so route stays valid
    router.push(`${pathname}${qs ? `?${qs}` : ''}`)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => gotoTab('model')}
          className={`px-3 py-1 rounded-md ${current === 'model' ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-black' : 'bg-transparent'}`}>
          Model
        </button>
        <button
          type="button"
          onClick={() => gotoTab('dane')}
          className={`px-3 py-1 rounded-md ${current === 'dane' ? 'bg-slate-900 text-white dark:bg-slate-200 dark:text-black' : 'bg-transparent'}`}>
          Dane
        </button>
      </div>

      <div>
        {current === 'model' ? (
          <EditModelForm
            id={id}
            name={name}
            description={description}
            enableUpdates={enableUpdates}
            intervalSpec={intervalSpec}
            lastImportIsApi={lastImportIsApi}
            modelType={modelType}
            forecastConfig={forecastConfig}
          />
        ) : (
          <form className="space-y-6" action={formAction} noValidate>
            <input type="hidden" name="id" value={id ?? ''} />
            <ImportLayout />

            <div className="flex justify-end gap-3">
              {state.error && <p className="text-sm text-red-600 dark:text-red-400 mr-auto">{state.error}</p>}
              <Button2 type="submit" disabled={pending}>{pending ? 'Zapisywanie...' : 'Zapisz import'}</Button2>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
