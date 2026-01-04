"use client";
import React, { useEffect, useState } from 'react';
import Button2 from '@/components/custom/Button2';
import Input2 from '@/components/custom/Input2';
import FormulaBox from '@/components/FormulaBox';
import { ModelTypeSelector } from '@/components/model/ModelTypeSelector';
import { ApiConfig } from '@/components/model/ApiConfig';
import ImportLayout from '@/components/custom/ImportLayout';
import { useRouter } from 'next/navigation';
import { type ModelFormState } from '@/app/(authorized)/models/actions';
import Select2 from '@/components/custom/Select2';
import { useModels } from '@/context/ModelsContext'


const NewModelPage = () => {
  const [mode] = useState<'pretrained' | 'custom'>('pretrained');
  const [modelType, setModelType] = useState<'chronos' | 'morai' | 'timesfm' | ''>('');
  // Czy model ma być dalej automatycznie aktualizowany nowymi danymi
  const [enableUpdates, setEnableUpdates] = useState<boolean>(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Ustawienia prognozy
  const [predictionLength, setPredictionLength] = useState<number>(12);
  const [frequency, setFrequency] = useState<string>(''); // '' = auto
  type MissingStrategy = 'interpolate'|'ffill'|'bfill'|'zero'|'mean'|'median'|'drop'
  const [missingStrategy, setMissingStrategy] = useState<MissingStrategy>('interpolate');
  type HolidayTreatment = 'none'|'neutralize'
  const [holidayTreatment, setHolidayTreatment] = useState<HolidayTreatment>('none');
  // Święta: włącz/wyłącz, kraj i własne daty
  const [holidaysEnabled, setHolidaysEnabled] = useState<boolean>(false);
  const [holidayCountry, setHolidayCountry] = useState<string>('');
  const [customHolidayDate, setCustomHolidayDate] = useState<string>('');
  const [customHolidayDates, setCustomHolidayDates] = useState<string[]>([]);
  const addCustomHoliday = () => {
    if (!customHolidayDate) return;
    setCustomHolidayDates((prev) => prev.includes(customHolidayDate) ? prev : [...prev, customHolidayDate].sort());
    setCustomHolidayDate('');
  };
  const removeCustomHoliday = (d: string) => setCustomHolidayDates(prev => prev.filter(x => x !== d));

  const router = useRouter();
  const initialState: ModelFormState = { errors: {} }
  const { addModel, isMutating } = useModels()
  const [state, setState] = useState<ModelFormState>(initialState)

  useEffect(() => {
    if (state.ok) {
      if (state.modelId) router.push(`/models/${state.modelId}/predictions`)
      else router.push('/models')
    }
  }, [state.ok, state.modelId, router])

  return (
    <div className="max-w-4xl w-full mx-auto">
      <header className="space-y-2">
        <h1 className="text-4xl font-extrabold dark:text-white max-w-4xl w-full mx-auto mb-3">Nowy model</h1>
       
      </header>

      {/* Formularz */}
      <form className="space-y-6" noValidate aria-busy={isMutating}
        onSubmit={async (e) => {
          e.preventDefault()
          const form = e.currentTarget as HTMLFormElement
          const fd = new FormData(form)
          const res = await addModel(fd)
          setState(res)
        }}
      >
        {/* Hidden meta */}
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="type" value={modelType} />
        <input type="hidden" name="enableUpdates" value={enableUpdates ? 'on' : ''} />

        {/* Podstawy */}
        <section className="grid gap-4 mb-2">
          <div className="space-y-2">
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nazwa modelu</label>
            <Input2 name="name" placeholder="np. prognoza_sprzedazy_q1" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setName(e.target.value)} />
            {state.errors.name && <p className="text-xs text-red-600 mt-1">{state.errors.name}</p>}
          </div>
          <div className="space-y-2">
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Opis (opcjonalnie)</label>
            <textarea name="description" value={description} onChange={(e)=>setDescription(e.target.value)} rows={3} className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
            {state.errors.description && <p className="text-xs text-red-600 mt-1">{state.errors.description}</p>}
          </div>
        </section>

      <section className="space-y-4 mb-4">
        <h2 className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Typ modelu</h2>
  <ModelTypeSelector value={modelType} onChange={(v) => setModelType(v)} />
        {state.errors.type && <p className="text-xs text-red-600 mt-1">{state.errors.type}</p>}
      </section>

      <section className="space-y-6">
        <div className="space-y-4 mb-4">
          <h2 className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Dane</h2>
        

      <ImportLayout/>
        </div>

        <div className="space-y-4 pt-2 ">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Aktualizacje danych</h2>
          <div className="flex items-center gap-3 mb-4">
            <input id="enable-updates" type="checkbox" checked={enableUpdates} onChange={(e) => setEnableUpdates(e.target.checked)} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" />
            <label htmlFor="enable-updates" className="text-sm text-gray-800 dark:text-gray-200 cursor-pointer">Włącz automatyczne pobieranie nowych danych</label>
          </div>

          {enableUpdates && (
            <div className="space-y-4">
             
              <ApiConfig showInterval />
              
            </div>
          )}
        </div>
      </section>

  {/* Ustawienia prognozy */}
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
            <Select2 name="frequency" value={frequency} onChange={(e)=>setFrequency(e.target.value)}>
              <option value="">Auto (wykryj)</option>
              <option value="H">Godzinowa (H)</option>
              <option value="D">Dzienna (D)</option>
              <option value="W">Tygodniowa (W)</option>
              <option value="MS">Miesięczna - początek miesiąca (MS)</option>
            </Select2>
           
          </div>
          <div className="space-y-2">
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Braki danych</label>
            <Select2 name="missing_strategy" value={missingStrategy} onChange={(e)=>setMissingStrategy(e.target.value as MissingStrategy)}>
              <option value="interpolate">Interpolacja (domyślna)</option>
              <option value="ffill">Forward fill</option>
              <option value="bfill">Backward fill</option>
              <option value="zero">Zera</option>
              <option value="mean">Średnia</option>
              <option value="median">Mediana</option>
              <option value="drop">Usuń brakujące</option>
            </Select2>
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
<Select2 name="holiday_treatment" value={holidayTreatment} onChange={(e)=>setHolidayTreatment(e.target.value as HolidayTreatment)}>
                <option value="none">Bez specjalnego traktowania</option>
                <option value="neutralize">Neutralizuj wpływ w historii</option>
              </Select2>
              </div>
              <div className="space-y-2">
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Kraj świąt</label>
                <Select2 name="holiday_country" value={holidayCountry} onChange={(e)=>setHolidayCountry(e.target.value)}>
                  <option value="">Brak (tylko własne daty)</option>
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
                </Select2>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900 dark:text-white">Dodatkowe własne daty</label>
            
              <div className="flex gap-2 items-stretch">
                <div>
                  
                  <Input2 type="date" value={customHolidayDate} onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setCustomHolidayDate(e.target.value)} />
                </div>
                <Button2 type="button" variant="outline" onClick={addCustomHoliday} className='mt-1'>Dodaj datę</Button2>
              </div>
              {customHolidayDates.length > 0 ? (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700 rounded-md border border-gray-200 dark:border-gray-700">
                  {customHolidayDates.map(d => (
                    <li key={d} className="flex items-center justify-between p-2 text-sm">
                      <span className="font-medium">{d}</span>
                      <Button2 type="button" variant="outline" onClick={()=>removeCustomHoliday(d)}>Usuń</Button2>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-gray-500">Brak dodatkowych dat.</p>
              )}
            </div>

            {/* Hidden serialized values for backend when enabled */}
            <input type="hidden" name="holiday_enabled" value={holidaysEnabled ? 'on' : ''} />
            <input type="hidden" name="holiday_country" value={holidayCountry} />
            <input type="hidden" name="holiday_dates" value={customHolidayDates.join(',')} />
          </div>
        )}
      </section>

      {mode === 'custom' && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Wstępne przetwarzanie (skrypt)</h2>
          <FormulaBox Title="Skrypt / Formuła" initialValue="// tu można wprowadzić transformacje" />
        </section>
      )}

        {/* Akcje */}
        <div className="flex justify-end gap-3 pt-4">
          {state.error && <p className="text-sm text-red-600 dark:text-red-400 mr-auto">{state.error}</p>}
          <Button2 type="button" variant="outline" onClick={()=>history.back()}>Anuluj</Button2>
          <Button2 disabled={!modelType || isMutating} type="submit">{isMutating ? 'Tworzenie...' : 'Utwórz'}</Button2>
        </div>
      </form>

      {isMutating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-12 w-12 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" role="img" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span className="text-white text-sm">Tworzenie modelu...</span>
            <span className="sr-only">Ładowanie...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewModelPage;
