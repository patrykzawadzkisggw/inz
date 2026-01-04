"use client";
import React, { useEffect, useState } from 'react'
import Button2 from '@/components/custom/Button2'
import Input2 from '@/components/custom/Input2'
import { ApiConfig } from '@/components/model/ApiConfig'
import { ModelTypeSelector } from '@/components/model/ModelTypeSelector'
import { useRouter } from 'next/navigation'
import { type ModelFormState } from '@/app/(authorized)/models/actions'
import { useModels } from '@/context/ModelsContext'

type Props = {
  id: string
  name: string
  description?: string | null
  enableUpdates?: boolean | null
  intervalSpec?: string | null
  lastImportIsApi?: boolean
  modelType?: '' | 'chronos' | 'morai' | 'timesfm'
  forecastConfig?: {
    prediction_length?: number
    frequency?: string
    missing_strategy?: string
    holiday_treatment?: string
    holiday_enabled?: boolean
    holiday_country?: string
    holiday_dates?: string[]
  } | null
}

export default function EditModelForm({ id, name, description, enableUpdates = true, intervalSpec, lastImportIsApi = false, modelType: initialModelType, forecastConfig }: Props) {
  const [modelType, setModelType] = useState<'' | 'chronos' | 'morai' | 'timesfm'>(initialModelType ?? '')
  const [modelName] = useState(name)
  const [desc, setDesc] = useState(description ?? '')
  const [updates, setUpdates] = useState<boolean>(!!enableUpdates)
  const [initialIntVal, setInitialIntVal] = useState<number | undefined>(undefined)
  const [initialIntUnit, setInitialIntUnit] = useState<'m'|'h'|'d' | undefined>(undefined)
  const [predictionLength, setPredictionLength] = useState<number>(forecastConfig?.prediction_length ?? 12)
  const [frequency, setFrequency] = useState<string>(forecastConfig?.frequency ?? '')
  const [missingStrategy, setMissingStrategy] = useState<string>(forecastConfig?.missing_strategy ?? 'interpolate')
  const [holidayTreatment, setHolidayTreatment] = useState<string>(forecastConfig?.holiday_treatment ?? 'none')
  const [holidaysEnabled, setHolidaysEnabled] = useState<boolean>(!!forecastConfig?.holiday_enabled)
  const [holidayCountry, setHolidayCountry] = useState<string>(forecastConfig?.holiday_country ?? '')
  const [customHolidayDates, setCustomHolidayDates] = useState<string[]>(forecastConfig?.holiday_dates ?? [])
  const [customHolidayDate, setCustomHolidayDate] = useState<string>('')
  const addCustomHoliday = () => {
    if (!customHolidayDate) return
    setCustomHolidayDates(prev => prev.includes(customHolidayDate) ? prev : [...prev, customHolidayDate].sort())
    setCustomHolidayDate('')
  }
  const removeCustomHoliday = (d: string) => setCustomHolidayDates(prev => prev.filter(x => x !== d))

  React.useEffect(() => {
    if (!intervalSpec) return
    const m = intervalSpec.match(/^(\d+)([mhd])$/)
    if (m) {
      setInitialIntVal(Number(m[1]))
      setInitialIntUnit(m[2] as 'm'|'h'|'d')
    }
  }, [intervalSpec])

  const router = useRouter()
  const { editModel, isMutating } = useModels()
  const [state, setState] = useState<ModelFormState>({ errors: {} })

  useEffect(() => {
    if (state.ok) router.push('/models')
  }, [state.ok, router])

  return (
    <form className="space-y-6" noValidate onSubmit={async (e) => {
      e.preventDefault()
      const form = e.currentTarget as HTMLFormElement
      const fd = new FormData(form)
      const res = await editModel(id, fd)
      setState(res)
    }}>
      <input type="hidden" name="type" value={modelType ?? ''} />
      <input type="hidden" name="id" value={id} />

      <input type="hidden" name="enableUpdates" value={updates ? 'on' : 'off'} />

      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold dark:text-white max-w-4xl w-full mx-auto mb-3">Edycja modelu</h1>
        </div>
      </header>

      <section className="mb-4">
        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Typ modelu</label>
        <ModelTypeSelector value={modelType} onChange={(v) => setModelType(v)} />
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nazwa (nieedytowalna)</label>
          <Input2 name="name" value={modelName} readOnly disabled className="opacity-70 cursor-not-allowed" onChange={()=>{}} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-200">Opis</label>
          <textarea name="description" rows={3} value={desc} onChange={(e)=>setDesc(e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
          {state.errors.description && <p className="text-xs text-red-600 mt-1">{state.errors.description}</p>}
        </div>
      </section>

      {lastImportIsApi && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Aktualizacje danych</h2>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer select-none ">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              checked={updates}
              onChange={(e) => setUpdates(e.target.checked)}
            />
            Dynamiczne pobieranie danych
          </label>
          {updates ? (
            <ApiConfig showInterval initialIntervalValue={initialIntVal} initialIntervalUnit={initialIntUnit} />
          ) : (
            <div className='mb-4'></div>
          )}
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Ustawienia prognozy</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Okno predykcji</label>
            <Input2
              type="number"
              min={1}
              max={12}
              name="prediction_length"
              value={predictionLength}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const v = Number(e.target.value || 0)
                const clamped = Math.max(1, Math.min(12, v))
                setPredictionLength(clamped)
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Częstotliwość danych</label>
            <select name="frequency" value={frequency} onChange={e=>setFrequency(e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="">Auto (wykryj)</option>
              <option value="H">Godzinowa (H)</option>
              <option value="D">Dzienna (D)</option>
              <option value="W">Tygodniowa (W)</option>
              <option value="MS">Miesięczna (MS)</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Braki danych</label>
            <select name="missing_strategy" value={missingStrategy} onChange={e=>setMissingStrategy(e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
              <option value="interpolate">Interpolacja</option>
              <option value="ffill">Forward fill</option>
              <option value="bfill">Backward fill</option>
              <option value="zero">Zera</option>
              <option value="mean">Średnia</option>
              <option value="median">Mediana</option>
              <option value="drop">Usuń brakujące</option>
            </select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input id="holidays-enabled" type="checkbox" className="w-4 h-4" checked={holidaysEnabled} onChange={(e)=>setHolidaysEnabled(e.target.checked)} />
              <label htmlFor="holidays-enabled" className="text-sm">Uwzględniaj święta</label>
            </div>
          </div>
        </div>
        {holidaysEnabled && (
          <div className="space-y-3">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Traktowanie świąt</label>
                <select name="holiday_treatment" value={holidayTreatment} onChange={e=>setHolidayTreatment(e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="none">Bez specjalnego traktowania</option>
                  <option value="neutralize">Neutralizuj wpływ</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Kraj świąt</label>
                <select name="holiday_country" value={holidayCountry} onChange={e=>setHolidayCountry(e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                  <option value="">Brak</option>
                  <option value="PL">Polska (PL)</option>
                  <option value="US">United States (US)</option>
                  <option value="GB">United Kingdom (GB)</option>
                  <option value="DE">Deutschland (DE)</option>
                  <option value="FR">France (FR)</option>
                  <option value="ES">España (ES)</option>
                  <option value="IT">Italia (IT)</option>
                  <option value="NL">Nederland (NL)</option>
                  <option value="SE">Sverige (SE)</option>
                  <option value="NO">Norge (NO)</option>
                  <option value="DK">Danmark (DK)</option>
                  <option value="FI">Suomi (FI)</option>
                  <option value="CZ">Česko (CZ)</option>
                  <option value="SK">Slovensko (SK)</option>
                  <option value="UA">Україна (UA)</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">Dodatkowe daty</label>
              <div className="flex gap-2 items-stretch">
                <Input2 type="date" value={customHolidayDate} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setCustomHolidayDate(e.target.value)} />
                <Button2 type="button" variant="outline" onClick={addCustomHoliday}>Dodaj</Button2>
              </div>
              {customHolidayDates.length ? (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700 rounded-md border border-gray-200 dark:border-gray-700">
                  {customHolidayDates.map(d => (
                    <li key={d} className="flex items-center justify-between p-2 text-sm">
                      <span className="font-medium">{d}</span>
                      <Button2 type="button" variant="outline" onClick={()=>removeCustomHoliday(d)}>Usuń</Button2>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-gray-500">Brak dodatkowych dat.</p>}
            </div>
            <input type="hidden" name="holiday_enabled" value={holidaysEnabled ? 'on' : ''} />
            <input type="hidden" name="holiday_country" value={holidayCountry} />
            <input type="hidden" name="holiday_dates" value={customHolidayDates.join(',')} />
          </div>
        )}
      </section>

      <div className="flex justify-end gap-3">
        {state.error && <p className="text-sm text-red-600 dark:text-red-400 mr-auto">{state.error}</p>}
        <Button2 type="button" variant="outline" onClick={()=>history.back()}>Anuluj</Button2>
        <Button2 type="submit" disabled={isMutating}>{isMutating ? 'Zapisywanie...' : 'Zapisz'}</Button2>
      </div>
    </form>
  )
}
