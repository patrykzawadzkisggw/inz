'use server'
import { functionInputSchema, createFunction, deleteFunction, updateFunction, listFunctions, getFunction } from '@/lib/functions'
import { currentUser } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
 
import { isValidFunctionName, notifyUserFunctionsUpdate, validateAndTranspile, normalizeDescription, mapZodToErrors } from '@/lib/userFunctions'

export type FunctionFormState = {
  errors: Record<string, string>
  error?: string
  ok?: boolean
  record?: unknown
}

const emptyState: FunctionFormState = { errors: {} }



export async function createFunctionAction(prevState: FunctionFormState, formData: FormData): Promise<FunctionFormState> {
  const state: FunctionFormState = { ...emptyState }
  const raw = {
    name: formData.get('name'),
    body: formData.get('body'),
    description: formData.get('description'),
  }
  const user = await currentUser()
  const name = typeof raw.name === 'string' ? raw.name : ''
  if (!isValidFunctionName(name)) {
    state.errors.name = 'Nazwa musi zaczynać się wielką literą i zawierać tylko litery/cyfry/podkreślenia.'
    return state
  }
  const sourceBody = typeof raw.body === 'string' ? raw.body : ''
  const val = await validateAndTranspile(name, sourceBody)
  if (!val.ok) {
    state.errors.body = val.msg || 'Niepoprawna definicja funkcji'
    return state
  }

  const normalized = {
    name,
    description: normalizeDescription(raw.description),
    body: sourceBody,
    body2: val.transpiled,
    userId: user?.id,
  }


  const e1 : Record<string, string> = {}
  try {
    const parsed = functionInputSchema.parse(normalized)
    const record = await createFunction(parsed, user?.id || '').catch(() => {
e1['name'] = 'Nazwa funkcji już istnieje';
      throw new Error('Nazwa funkcji już istnieje');
    })
  await notifyUserFunctionsUpdate()
    revalidatePath('/functions')
    return { ...state, ok: true, record }
  } catch (err) {
    const fieldErrors = mapZodToErrors(err)
    console.log('fieldErrors', fieldErrors)
    if (Object.keys(fieldErrors).length) return { errors: fieldErrors }
    console.error(err)
    return { errors: e1, error: 'Nie udało się utworzyć funkcji' }
  }
}

export async function deleteFunctionAction(id: string) {
  const user = await currentUser()
  await deleteFunction(id, user?.id || '')
  await notifyUserFunctionsUpdate()
}


export async function updateFunctionAction(id: string, prevState: FunctionFormState, formData: FormData): Promise<FunctionFormState> {
  const state: FunctionFormState = { errors: {} }
  const user = await currentUser()

  const raw = { name: formData.get('name'), body: formData.get('body'), body2: formData.get('body2'), description: formData.get('description') }
  const partial: Record<string, unknown> = {}

  const sourceBody = typeof raw.body === 'string' ? raw.body : ''
  const hasBody = sourceBody.trim().length > 0

  const existing = await getFunction(id, user?.id || '')
  const fixedName = existing?.name || ''
  if (!fixedName) return { errors: {}, error: 'Nie znaleziono funkcji' }
  if (!isValidFunctionName(fixedName)) return { errors: {}, error: 'Nazwa funkcji jest niepoprawna' }

  if (hasBody) {
    const val = await validateAndTranspile(fixedName, sourceBody)
    if (!val.ok) {
      state.errors.body = val.msg || 'Niepoprawna definicja funkcji'
      return state
    }
    partial.body = sourceBody
    if (val.transpiled) partial.body2 = val.transpiled
  } else if (typeof raw.body2 === 'string') {
    const b2 = raw.body2.trim()
    if (b2.length) partial.body2 = b2
  }

  partial.description = normalizeDescription(raw.description)
  try {
  const record = await updateFunction(id, partial, user?.id || '' )
  await notifyUserFunctionsUpdate()
    revalidatePath('/functions')
    return { ...state, ok: true, record }
  } catch (err) {
    const fieldErrors = mapZodToErrors(err)
    if (Object.keys(fieldErrors).length) return { errors: fieldErrors }
    console.error(err)
    return { errors: {}, error: 'Nie udało się zaktualizować funkcji' }
  }
}

export async function listFunctionsAction() {
  const user = await currentUser()
  return listFunctions(user?.id || '')
}

export async function getFunctionAction(id: string) {
  const user = await currentUser()
  return getFunction(id, user?.id || '')
}