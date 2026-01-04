const { cn } = require('@/lib/utils')

describe('narzędzia UI (utils)', () => {
  beforeEach(() => {
  })

  test('Łączy klasy i usuwa duplikaty', () => {
    const res = cn('p-2', 'p-2', 'text-center')
    expect(res).toMatch(/p-2/)
    expect(res).toMatch(/text-center/)
  })

  test('Obsługuje obiekty zgodnie z clsx', () => {
    const res = cn({ 'foo': true, 'bar': false }, 'baz')
    expect(res).toContain('foo')
    expect(res).toContain('baz')
    expect(res).not.toContain('bar')
  })
})
