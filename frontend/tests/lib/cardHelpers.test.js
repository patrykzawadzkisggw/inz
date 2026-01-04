const {
  isChartResult,
  isTextEntry,
  isTableEntry,
  extractChartFromCache,
  extractTextFromCache,
  extractTableFromCache,
} = require('@/lib/cardHelpers')

describe('cardHelpers', () => {
  test('isChartResult rozpoznaje chart', () => {
    expect(isChartResult({ type: 'chart', chartType: 'x', data: { series: [] } })).toBe(true)
    expect(isChartResult({})).toBe(false)
  })

  test('isTextEntry rozpoznaje text entry', () => {
    expect(isTextEntry({ type: 'text', text: 'a' })).toBe(true)
    expect(isTextEntry({ type: 'text' })).toBe(false)
  })

  test('isTableEntry rozpoznaje tabelę', () => {
    const table = { type: 'table', columns: ['a'], rows: [{ a: 1 }] }
    expect(isTableEntry(table)).toBe(true)
    expect(isTableEntry({})).toBe(false)
  })

  test('extractChartFromCache wyciąga pierwszy chart', () => {
    const cache = [{ type: 'text', text: 'x' }, { type: 'chart', chartType: 'c', data: { series: [] } }]
    expect(extractChartFromCache(cache)).toMatchObject({ chartType: 'c' })
    expect(extractChartFromCache(null)).toBeNull()
  })

  test('extractTextFromCache łączy teksty', () => {
    const cache = [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }]
    expect(extractTextFromCache(cache)).toBe('a\nb')
    expect(extractTextFromCache([])).toBeNull()
  })

  test('extractTableFromCache zwraca kolumny i wiersze', () => {
    const cache = [{ type: 'table', columns: ['c'], rows: [{ c: 1 }] }]
    expect(extractTableFromCache(cache)).toMatchObject({ columns: ['c'], rows: [{ c: 1 }] })
    expect(extractTableFromCache({})).toBeNull()
  })
})
