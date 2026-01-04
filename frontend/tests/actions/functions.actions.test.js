// @ts-nocheck
import { waitFor } from '@testing-library/react'

jest.doMock('@/lib/functions', () => ({
  createFunction: jest.fn(),
  deleteFunction: jest.fn(),
  updateFunction: jest.fn(),
  listFunctions: jest.fn().mockResolvedValue([]),
  getFunction: jest.fn(),
  functionInputSchema: { parse: (v) => v },
}))

jest.doMock('@clerk/nextjs/server', () => ({ currentUser: jest.fn().mockResolvedValue({ id: 'u1' }) }))

jest.doMock('@/lib/userFunctions', () => ({
  isValidFunctionName: jest.fn(),
  validateAndTranspile: jest.fn(),
  normalizeDescription: jest.fn((d) => d),
  mapZodToErrors: jest.fn(() => ({})),
  notifyUserFunctionsUpdate: jest.fn(),
}))

jest.doMock('next/cache', () => ({ revalidatePath: jest.fn() }))

const actions = require('@/app/(authorized)/functions/actions')
const funcs = require('@/lib/functions')
const uf = require('@/lib/userFunctions')

describe('akcje funkcji', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  function makeForm(pairs = []) { const m = new Map(pairs); return { get: (k) => m.get(k) ?? null } }

  test('createFunctionAction zwraca błąd, gdy nazwa jest nieprawidłowa', async () => {
    uf.isValidFunctionName.mockReturnValue(false)
    const res = await actions.createFunctionAction({ errors: {} }, makeForm([['name', 'x'], ['body', 'b']]))
    expect(res.errors.name).toBeDefined()
  })

  test('createFunctionAction zwraca błąd, gdy transpilacja się nie udaje', async () => {
    uf.isValidFunctionName.mockReturnValue(true)
    uf.validateAndTranspile.mockResolvedValue({ ok: false, msg: 'bad' })
    const res = await actions.createFunctionAction({ errors: {} }, makeForm([['name', 'Fn'], ['body', 'b']]))
    expect(res.errors.body).toBeDefined()
  })

  test('createFunctionAction kończy się powodzeniem', async () => {
    uf.isValidFunctionName.mockReturnValue(true)
    uf.validateAndTranspile.mockResolvedValue({ ok: true, transpiled: 'py' })
    funcs.createFunction.mockResolvedValue({ id: 'f1' })
    const res = await actions.createFunctionAction({ errors: {} }, makeForm([['name', 'Fn'], ['body', 'b']]))
    expect(res.ok).toBe(true)
    expect(funcs.createFunction).toHaveBeenCalled()
    expect(uf.notifyUserFunctionsUpdate).toHaveBeenCalled()
  })

  test('createFunctionAction zwraca błąd przy duplikacie nazwy', async () => {
    uf.isValidFunctionName.mockReturnValue(true)
    uf.validateAndTranspile.mockResolvedValue({ ok: true, transpiled: 'py' })
    funcs.createFunction.mockRejectedValueOnce(new Error('dup'))
    const res = await actions.createFunctionAction({ errors: {} }, makeForm([['name', 'Fn'], ['body', 'b']]))
    expect(res.errors.name).toBeDefined()
  })

  test('deleteFunctionAction wywołuje usunięcie i powiadomienie', async () => {
    await actions.deleteFunctionAction('id')
    expect(funcs.deleteFunction).toHaveBeenCalled()
    expect(uf.notifyUserFunctionsUpdate).toHaveBeenCalled()
  })

  test('updateFunctionAction zwraca błąd, gdy funkcja nie istnieje', async () => {
    funcs.getFunction.mockResolvedValue(null)
    const res = await actions.updateFunctionAction('i1', { errors: {} }, makeForm([]))
    expect(res.error).toBeDefined()
  })

  test('updateFunctionAction zwraca błąd przy niepoprawnej nazwie', async () => {
    funcs.getFunction.mockResolvedValue({ id: 'i1', name: 'BadName', userId: 'u1' })
    uf.isValidFunctionName.mockReturnValue(false)
    const res = await actions.updateFunctionAction('i1', { errors: {} }, makeForm([]))
    expect(res.error).toBeDefined()
  })

  test('updateFunctionAction zwraca błąd, gdy transpilacja nowego ciała się nie udaje', async () => {
    funcs.getFunction.mockResolvedValue({ id: 'i1', name: 'Fn', userId: 'u1' })
    uf.isValidFunctionName.mockReturnValue(true)
    const form = makeForm([['body', 'new body']])
    uf.validateAndTranspile.mockResolvedValueOnce({ ok: false, msg: 'bad' })
    const res = await actions.updateFunctionAction('i1', { errors: {} }, form)
    expect(res.errors.body).toBeDefined()
  })

  test('updateFunctionAction kończy się powodzeniem z transpilacją ciała', async () => {
    funcs.getFunction.mockResolvedValue({ id: 'i1', name: 'Fn', userId: 'u1' })
    uf.isValidFunctionName.mockReturnValue(true)
    uf.validateAndTranspile.mockResolvedValueOnce({ ok: true, transpiled: 'py' })
    funcs.updateFunction.mockResolvedValueOnce({ id: 'i1' })
    const res = await actions.updateFunctionAction('i1', { errors: {} }, makeForm([['body', 'new body']]))
    expect(res.ok).toBe(true)
    expect(funcs.updateFunction).toHaveBeenCalled()
    expect(uf.notifyUserFunctionsUpdate).toHaveBeenCalled()
  })

  test('updateFunctionAction używa body2, gdy body jest puste i podano body2', async () => {
    funcs.getFunction.mockResolvedValue({ id: 'i1', name: 'Fn', userId: 'u1' })
    uf.isValidFunctionName.mockReturnValue(true)
    funcs.updateFunction.mockResolvedValueOnce({ id: 'i1' })
    const res = await actions.updateFunctionAction('i1', { errors: {} }, makeForm([['body2', ' transpiled ']]))
    expect(res.ok).toBe(true)
    expect(funcs.updateFunction).toHaveBeenCalled()
  })

  test('updateFunctionAction zwraca błędy pól z mapZodToErrors', async () => {
    funcs.getFunction.mockResolvedValue({ id: 'i1', name: 'Fn', userId: 'u1' })
    uf.isValidFunctionName.mockReturnValue(true)
    funcs.updateFunction.mockRejectedValueOnce(new Error('zod'))
    uf.mapZodToErrors.mockReturnValueOnce({ body: 'too long' })
    const res = await actions.updateFunctionAction('i1', { errors: {} }, makeForm([['body2', 'x']]))
    expect(res.errors.body).toBeDefined()
  })

  test('listFunctionsAction deleguje do listFunctions', async () => {
    funcs.listFunctions.mockResolvedValueOnce([{ id: 'x' }])
    const res = await actions.listFunctionsAction()
    await waitFor(() => expect(res).toBeDefined())
  })
})
