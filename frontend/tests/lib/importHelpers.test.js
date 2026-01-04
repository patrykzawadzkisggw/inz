const ih = require('@/lib/importHelpers')

describe('importHelpers (pomocniki importu)', () => {
  test('toGridFromObjects konwertuje i ogranicza kolumny', () => {
    const items = [{ a: 1, b: 2 }, { b: 3, c: 4 }]
    const g = ih.toGridFromObjects(items)
    expect(g.columns.length).toBeGreaterThan(0)
    expect(g.rows.length).toBe(2)
  })

  test('toGridFromArrays z nagłówkiem true/false', () => {
    const arr = [['A','B'], ['1','2']]
    const g1 = ih.toGridFromArrays(arr, true)
    expect(g1.columns).toEqual(['A','B'])
    const g2 = ih.toGridFromArrays(arr, false)
    expect(g2.columns[0]).toMatch(/col_1/)
  })

  test('parseCSVText parsuje prosty CSV', async () => {
    const txt = 'a,b\n1,2\n3,4'
    const g = await ih.parseCSVText(txt, ',', true)
    expect(g.rows.length).toBe(2)
    expect(g.columns).toEqual(['a','b'])
  })

  test('simpleHash zwraca stabilny hash', () => {
    expect(ih.simpleHash('abc')).toMatch(/^[0-9a-f]+$/)
  })

  test('normalizeSeparator działa poprawnie', () => {
    expect(ih.normalizeSeparator('\t')).toBe('\t')
    expect(ih.normalizeSeparator(',')).toBe(',')
  })

  test('isJsonPreferred heurystyka wyboru JSON', () => {
    expect(ih.isJsonPreferred('json')).toBe(true)
    expect(ih.isJsonPreferred('csv')).toBe(false)
    expect(ih.isJsonPreferred('auto', { ext: 'json' })).toBe(true)
    expect(ih.isJsonPreferred('auto', { contentType: 'application/json' })).toBe(true)
  })

  test('buildKeyBaseFile i buildKeyBaseUrl zawierają prefiks', () => {
    const k = ih.buildKeyBaseFile('f.txt', 'hello')
    expect(k.startsWith('file:')).toBe(true)
    const ku = ih.buildKeyBaseUrl('http://x', 'hello')
    expect(ku.startsWith('url:')).toBe(true)
  })

  test('gridFromJsonText obsługuje tablice/obiekty/prymitywy', () => {
    const a = JSON.stringify([[1,2],[3,4]])
    const g1 = ih.gridFromJsonText(a, true)
    expect(g1.rows.length).toBe(1)
    const b = JSON.stringify([{ x: 1 }])
    const g2 = ih.gridFromJsonText(b, true)
    expect(g2.rows.length).toBe(1)
    const o = JSON.stringify({ x: 1 })
    const g3 = ih.gridFromJsonText(o, true)
    expect(g3.rows.length).toBe(1)
    const p = JSON.stringify('hello')
    const g4 = ih.gridFromJsonText(p, true)
    expect(g4.columns).toEqual(['value'])
  })

  test('isPreviewGrid rozpoznaje siatkę podglądu', () => {
    const good = { columns: ['a'], rows: [{ a: 1 }] }
    expect(ih.isPreviewGrid(good)).toBe(true)
    expect(ih.isPreviewGrid({})).toBe(false)
  })
})
