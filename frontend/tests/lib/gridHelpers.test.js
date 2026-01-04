const gh = require('@/lib/gridHelpers')

describe('lib/gridHelpers', () => {
  test('isTextCacheArray prawda dla poprawnej tablicy', () => {
    const arr = [{ type: 't', text: 'x' }]
    expect(gh.isTextCacheArray(arr)).toBe(true)
  })

  test('isTextCacheArray fałsz dla niepoprawnego', () => {
    expect(gh.isTextCacheArray('x')).toBe(false)
    expect(gh.isTextCacheArray([{ type: 1 }])).toBe(false)
  })
})
