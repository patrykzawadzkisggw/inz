"use client";
import React, { useState, useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import FormulaBox from '../FormulaBox';
import type { ReportFormState } from '@/app/(authorized)/notifications/actions'

export interface NotifyActionResult { ok?: boolean; fieldErrors?: Record<string,string>; error?: string }
type NotifyFormProps = {
  initialName?: string;
  initialEnabled?: boolean;
  initialFrequency?: number;
  initialUnit?: string;
  initialCondition?: string;
  initialContent?: string;
  isEditMode?: boolean;
  userId?: string;
  serverAction?: (prev: ReportFormState, formData: FormData) => Promise<ReportFormState>;
  onSubmitClient?: (formData: FormData) => Promise<ReportFormState>;
};

const NotifyForm: React.FC<NotifyFormProps> = ({
  initialName,
  initialEnabled = true,
  initialFrequency,
  initialUnit,
  initialCondition,
  initialContent,
  isEditMode = false,
  userId,
  serverAction,
  onSubmitClient,
}) => {
  const initialState: ReportFormState = { errors: {} }
  const [name, setName] = useState(initialName || '')
  const [enabled, setEnabled] = useState(initialEnabled)
  const [frequencyValue, setFrequencyValue] = useState<number | ''>(initialFrequency ?? '')
  const [frequencyUnit, setFrequencyUnit] = useState(initialUnit || '')
  const [conditionFormula, setConditionFormula] = useState(initialCondition || 'function onSent() {\n  return True;\n}')
  const [messageTemplate, setMessageTemplate] = useState(initialContent || '')
  const [clientState, setClientState] = useState<ReportFormState>(initialState)
  const [clientPending, setClientPending] = useState<boolean>(false)
  const useClientSubmit = !!onSubmitClient && !serverAction
  const [saState, saFormAction, saPending] = useActionState<ReportFormState, FormData>(
    (serverAction || (async () => initialState)) as (prev: ReportFormState, formData: FormData) => Promise<ReportFormState>,
    initialState
  )
  const state = useClientSubmit ? clientState : saState
  const formAction = useClientSubmit ? (undefined as unknown as (fd: FormData) => void) : saFormAction
  const pending = useClientSubmit ? clientPending : saPending
  const router = useRouter()
  useEffect(() => {
    if (state.ok) {
      
      router.push('/notifications')
    }
  }, [state.ok, router])

  async function handleClientSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!useClientSubmit) return
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setClientPending(true)
    try {
      const result = await onSubmitClient!(fd)
      setClientState(result)
    } finally {
      setClientPending(false)
    }
  }

  return (
    <form className="max-w-4xl w-full mx-auto" action={useClientSubmit ? undefined : (formAction as unknown as string)} onSubmit={useClientSubmit ? handleClientSubmit : undefined} noValidate>
      <input type="hidden" name="userId" value={userId || ''} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="base-input" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nazwa raportu</label>
          <input name="name" id="base-input" required value={name} onChange={e=>setName(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
          {state.errors.name && <p className="text-xs text-red-600 mt-1">{state.errors.name}</p>}
        </div>
        <div className="flex items-center">
          <label className="inline-flex items-center cursor-pointer">
            <input name="enabled" type="checkbox" className="sr-only peer" checked={enabled} onChange={e=>setEnabled(e.target.checked)} />
            <div className="relative w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:w-5 after:h-5 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">Raport włączony</span>
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="frequencyValue" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Wykonuj co</label>
            <input type="number" name="frequencyValue" id="frequencyValue" min={1} value={frequencyValue} onChange={e=>setFrequencyValue(e.target.value ? Number(e.target.value) : '')} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500" />
            {state.errors.frequencyValue && <p className="text-xs text-red-600 mt-1">{state.errors.frequencyValue}</p>}
          </div>
          <div>
            <label htmlFor="frequencyUnit" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Jednostka</label>
            <select name="frequencyUnit" id="frequencyUnit" value={frequencyUnit} onChange={e=>setFrequencyUnit(e.target.value)} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-600 dark:border-gray-500">
              <option value="">Brak</option>
              <option value="m">Minuty</option>
              <option value="h">Godziny</option>
              <option value="d">Dni</option>
              <option value="w">Tygodnie</option>
              <option value="M">Miesiące</option>
            </select>
            {state.errors.frequencyUnit && <p className="text-xs text-red-600 mt-1">{state.errors.frequencyUnit}</p>}
          </div>
        </div>
        <div>
          <FormulaBox Title="Warunek wysłania (opcjonalne)" initialValue={conditionFormula} onChangeText={v=>setConditionFormula(v)} />
          <textarea name="conditionFormula" className="hidden" value={conditionFormula} readOnly />
          {state.errors.conditionFormula && <p className="text-xs text-red-600 mt-1">{state.errors.conditionFormula}</p>}
        </div>
        <div>
          <FormulaBox Title="Treść wiadomości" initialValue={messageTemplate} onChangeText={v=>setMessageTemplate(v)} />
            <textarea name="messageTemplate" className="hidden" value={messageTemplate} readOnly />
          {state.errors.messageTemplate && <p className="text-xs text-red-600 mt-1">{state.errors.messageTemplate}</p>}
        </div>
        <div className="sm:col-span-2 flex justify-end">
          {state.error && <p className="text-sm text-red-600 dark:text-red-400 mr-auto">{state.error}</p>}
          <button type="submit" disabled={pending} className="text-white inline-flex items-center bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg text-sm px-5 py-2.5">
            {pending ? 'Zapisywanie...' : (isEditMode ? 'Zapisz zmiany' : 'Dodaj')}
          </button>
        </div>
      </div>
    </form>
  )
}

export default NotifyForm
