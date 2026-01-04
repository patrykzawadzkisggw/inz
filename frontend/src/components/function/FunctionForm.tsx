"use client";
import React, { useState, useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import FormulaBox from '../FormulaBox';
import type { FunctionFormState } from '@/app/(authorized)/functions/actions';

type FunctionFormProps = {
  initialId?: string;        
  initialName?: string;
  initialBody?: string;       
  initialDescription?: string;
  isEditMode?: boolean;
  userId?: string;
  serverAction?: (prev: FunctionFormState, formData: FormData) => Promise<FunctionFormState>;
  onSubmitClient?: (formData: FormData) => Promise<FunctionFormState>;
};

const FunctionForm: React.FC<FunctionFormProps> = ({
  initialId,
  initialName = 'My_function',
  initialBody = 'function My_function(data) {\n      return data; \n }',
  initialDescription = '',
  isEditMode = false,
  userId,
  serverAction,
  onSubmitClient,
}) => {
  const router = useRouter()
  const initialState: FunctionFormState = { errors: {} }
  const [name, setName] = useState(initialName)
  const [body, setBody] = useState(initialBody)
  const [description, setDescription] = useState(initialDescription)
  const [clientState, setClientState] = useState<FunctionFormState>(initialState)
  const [clientPending, setClientPending] = useState<boolean>(false)
  const useClientSubmit = !!onSubmitClient && !serverAction
  // Always call the hook to keep hooks order consistent
  const [saState, saFormAction, saPending] = useActionState<FunctionFormState, FormData>(
    (serverAction || (async () => initialState)) as (prev: FunctionFormState, formData: FormData) => Promise<FunctionFormState>,
    initialState
  )
  const state = useClientSubmit ? clientState : saState
  const formAction = useClientSubmit ? (undefined as unknown as (fd: FormData) => void) : saFormAction
  const pending = useClientSubmit ? clientPending : saPending

  function onNameChange(v: string) {
    if (!isEditMode) {
      const capped = v.length ? v[0].toUpperCase() + v.slice(1) : v
      setName(capped)
    } else {
      setName(v)
    }
  }


  useEffect(() => {
    if (state.ok) {
      router.push('/functions')
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
      {isEditMode && initialId && <input type="hidden" name="id" value={initialId} />}
      <input type="hidden" name="userId" value={userId || ''} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="func-name" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Nazwa funkcji</label>
          <input
            name={isEditMode ? undefined : 'name'}
            id="func-name"
            required={!isEditMode}
            value={name}
            onChange={e=>onNameChange(e.target.value)}
            readOnly={isEditMode}
            disabled={isEditMode}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white disabled:opacity-70"
          />
          {state.errors.name && <p className="text-xs text-red-600 mt-1">{state.errors.name}</p>}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="func-desc" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Opis (opcjonalnie)</label>
          <textarea
            id="func-desc"
            name="description"
            rows={3}
            value={description}
            onChange={e=>setDescription(e.target.value)}
            className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:placeholder-gray-400 dark:text-white"
            placeholder="Krótki opis funkcji, do czego służy i jakich parametrów oczekuje"
          />
        </div>
        <div className="sm:col-span-2">
          <FormulaBox Title="Ciało funkcji" initialValue={body} onChangeText={v=>setBody(v)} />
          <textarea name="body" className="hidden" value={body} readOnly />
          {state.errors.body && <p className="text-xs text-red-600 mt-1">{state.errors.body}</p>}
        </div>
        <div className="sm:col-span-2 flex justify-end">
          {state.error && <p className="text-sm text-red-600 dark:text-red-400 mr-auto">{state.error}</p>}
          <button type="submit" disabled={pending} className="text-white inline-flex items-center bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg text-sm px-5 py-2.5">
            {(pending) ? 'Zapisywanie...' : (isEditMode ? 'Zapisz zmiany' : 'Dodaj')}
          </button>
        </div>
      </div>
    </form>
  )
}

export default FunctionForm
