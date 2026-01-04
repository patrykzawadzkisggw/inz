const mu = require('@/lib/modelUtils')

describe('lib/modelUtils (narzędzia modelu)', () => {
  test('parsePositiveInt — zwraca dodatnią liczbę całkowitą lub undefined dla niepoprawnego wejścia', () => {
    expect(mu.parsePositiveInt('5')).toBe(5)
    expect(mu.parsePositiveInt('0')).toBeUndefined()
    expect(mu.parsePositiveInt('abc')).toBeUndefined()
    expect(mu.parsePositiveInt(5)).toBeUndefined()
  })

  test('splitCsv — dzieli łańcuch na elementy i przycina spacje', () => {
    expect(mu.splitCsv('a,b, c')).toEqual(['a','b','c'])
    expect(mu.splitCsv('')).toBeUndefined()
    expect(mu.splitCsv(null)).toBeUndefined()
  })

  test('buildIntervalSpecFromForm — buduje specyfikację interwału lub zwraca null', () => {
    const fd = new FormData()
    fd.append('interval_value', '10')
    fd.append('interval_unit', 'm')
    expect(mu.buildIntervalSpecFromForm(fd)).toBe('10m')

    const fd2 = new FormData()
    fd2.append('interval_value', '')
    fd2.append('interval_unit', '')
    expect(mu.buildIntervalSpecFromForm(fd2)).toBeNull()
  })

  test('rowsToCsv — poprawne cytowanie i nagłówki CSV', () => {
    const rows = [{ a: 'x,y', b: 'v' }, { a: 'z', b: 'u' }]
    const res = mu.rowsToCsv(rows)
    expect(res.csv).toContain('"x,y"')
    expect(res.headers).toEqual(['a','b'])
  })

  test('parseImportForm — bezpieczne parsowanie pól JSON', () => {
    const fd = new FormData()
    fd.append('import_rows_json', JSON.stringify([{ x: 1 }]))
    fd.append('import_schema_json', JSON.stringify([{ key: 'x', name: 'X' }]))
    fd.append('import_options_json', JSON.stringify({ separator: '\t' }))
    const out = mu.parseImportForm(fd)
    expect(out.rows).toEqual([{ x: 1 }])
    expect(out.schemaJson).toBeDefined()
    expect(out.options).toBeDefined()
  })

  test('buildForecastConfigFromForm (update) — ignoruje puste wartości i błędne reguły', () => {
    const f = new FormData()
    f.append('prediction_length', '8')
    f.append('missing_strategy', '')
    f.append('holiday_treatment', '')
    f.append('holiday_rules', 'not json')
    const cfg = mu.buildForecastConfigFromForm(f, 'update')
    expect(cfg.prediction_length).toBe(8)
    expect(cfg.missing_strategy).toBeUndefined()
    expect(cfg.holiday_treatment).toBeUndefined()
    expect(cfg.holiday_rules).toBeUndefined()
  })

  test('buildIntervalSpecFromForm — zwraca null dla nieprawidłowych danych', () => {
    const f = new FormData()
    f.append('interval_value', '5')
    f.append('interval_unit', '')
    expect(mu.buildIntervalSpecFromForm(f)).toBeNull()
    const f2 = new FormData()
    f2.append('interval_value', '0')
    f2.append('interval_unit', 'h')
    expect(mu.buildIntervalSpecFromForm(f2)).toBeNull()
  })

  test('rowsToCsv — obsługa separatora tab, nowych linii oraz pustych wierszy', () => {
    const rows = [{ A: 'a\nb', B: 'c\rd' }, { A: 'e', B: 'f' }]
    const res = mu.rowsToCsv(rows, undefined, { separator: '\t' })
    expect(res.delimiter).toBe('\t')
    expect(res.csv).toContain('"a\nb"')
    expect(res.csv).toContain('"c\rd"')

    const empty = mu.rowsToCsv([], undefined, {})
    expect(empty.headers).toEqual([])
    expect(empty.csv).toBe('')
  })

  test('parseImportForm — zwraca undefined gdy schema/options są niepoprawne', () => {
    const f = new FormData()
    f.append('import_schema_json', 'notjson')
    f.append('import_options_json', 'alsonotjson')
    const out = mu.parseImportForm(f)
    expect(out.schemaJson).toBeUndefined()
    expect(out.options).toBeUndefined()
  })
})
