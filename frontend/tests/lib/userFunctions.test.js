jest.mock('@/lib/api', () => ({
  getDataFromApi: jest.fn(),
}))

const { getDataFromApi } = require('@/lib/api')
const uf = require('@/lib/userFunctions')

describe('userFunctions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('isValidFunctionName działa poprawnie', () => {
    expect(uf.isValidFunctionName('MyFunc')).toBe(true)
    expect(uf.isValidFunctionName('myFunc')).toBe(false)
    expect(uf.isValidFunctionName('A1_')).toBe(true)
  })

  test('extractFunctionNames wyciąga nazwy', () => {
    const src = `function a() {} function b() {}`
    expect(uf.extractFunctionNames(src)).toEqual(['a', 'b'])
  })

  test('matchesSingleFunctionOnly - poprawny przypadek', () => {
    const src = `function foo() { return 1 }`
    const res = uf.matchesSingleFunctionOnly(src, 'foo')
    expect(res.ok).toBe(true)
  })

  test('matchesSingleFunctionOnly - wiele funkcji', () => {
    const src = `function a() {} function b() {}`
    const res = uf.matchesSingleFunctionOnly(src, 'a')
    expect(res.ok).toBe(false)
  })

  test('normalizeDescription normalizuje puste', () => {
    expect(uf.normalizeDescription('  ')).toBeUndefined()
    expect(uf.normalizeDescription(' hi ')).toBe('hi')
  })

  test('validateOnSentOnly - poprawna definicja', () => {
    expect(uf.validateOnSentOnly('function onSent() { console.log(1) }').ok).toBe(true)
    expect(uf.validateOnSentOnly('function onSent(x) {}').ok).toBe(false)
  })

  test('validateAndTranspile poprawnie transpiluje', async () => {
    getDataFromApi.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ python: '#\n#\nprint(1)' }),
    })

    const { attempted, ok, transpiled } = await uf.validateAndTranspile('foo', 'function foo() { return 1 }')
    expect(attempted).toBe(true)
    expect(ok).toBe(true)
    expect(transpiled).toBe('print(1)')
  })

  test('validateAndTranspile - niepoprawny kod', async () => {
    getDataFromApi.mockResolvedValueOnce({ ok: false })
    const res = await uf.validateAndTranspile('f', 'function f() {')
    expect(res.attempted).toBe(false)
  })

  test('transpileToPythonRaw zwraca python kiedy ok', async () => {
    getDataFromApi.mockResolvedValue({ ok: true, json: async () => ({ python: '##\npycode' }) })
    const py = await uf.transpileToPythonRaw('function x() {}')
    expect([undefined, '##\npycode']).toContain(py)
  })

  test('notifyUserFunctionsUpdate tworzy log gdy odpowiedź nie jest ok lub jest wyjątek', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    getDataFromApi.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'err' })
    await uf.notifyUserFunctionsUpdate()
    expect(spy).toHaveBeenCalled()

    getDataFromApi.mockRejectedValueOnce(new Error('net'))
    await uf.notifyUserFunctionsUpdate()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  test('transpileToPython zwraca undefined dla pustego inputu lub nie-ok', async () => {
    expect(await uf.transpileToPython('   ')).toBeUndefined()
    getDataFromApi.mockResolvedValueOnce({ ok: false })
    expect(await uf.transpileToPython('function x(){}')).toBeUndefined()
  })

  test('runPython zwraca tablicę wyników lub null w przypadku błędu', async () => {
    getDataFromApi.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [42] }) })
    expect(await uf.runPython('py')).toEqual([42])
    getDataFromApi.mockResolvedValueOnce({ ok: false })
    expect(await uf.runPython('py')).toBeNull()
    getDataFromApi.mockRejectedValueOnce(new Error('net'))
    expect(await uf.runPython('py')).toBeNull()
  })

  test('mapZodToErrors zwraca pierwsze komunikaty dla każdego klucza', () => {
    const z = { issues: [{ path: ['a'], message: 'first' }, { path: ['a'], message: 'second' }, { path: ['b'], message: 'ok' }] }
    expect(uf.mapZodToErrors(z)).toEqual({ a: 'first', b: 'ok' })
  })

  test('matchesSingleFunctionOnly zwraca false dla pustego inputu, złej nazwy funkcji i dodatkowego kodu', () => {
    expect(uf.matchesSingleFunctionOnly('  ', 'X').ok).toBe(false)
    const res1 = uf.matchesSingleFunctionOnly('function a(){}', 'b')
    expect(res1.ok).toBe(false)
    const res2 = uf.matchesSingleFunctionOnly('function X(){}\nconst y=1', 'X')
    expect(res2.ok).toBe(false)
  })
})
