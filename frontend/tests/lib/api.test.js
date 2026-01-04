describe('getDataFromApi', () => {
  afterEach(() => {
    jest.resetModules()
    jest.restoreAllMocks()
  })

  test('dodaje Authorization gdy auth zwraca token i przekazuje body/headers', async () => {
    jest.doMock('@clerk/nextjs/server', () => ({ auth: () => Promise.resolve({ getToken: async () => 'tok' }) }))
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    global.fetch = fetchMock

    const { getDataFromApi } = require('@/lib/api')
    const res = await getDataFromApi('http://a', 'POST', { a: 1 })

    expect(fetchMock).toHaveBeenCalledWith('http://a', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'Content-Type': 'application/json', Authorization: 'Bearer tok' }),
      body: JSON.stringify({ a: 1 }),
    }))
    expect(await res.json()).toEqual({ ok: true })
  })

  test('gdy auth rzuca, nie dodaje Authorization', async () => {
    jest.doMock('@clerk/nextjs/server', () => ({ auth: () => Promise.reject(new Error('no')) }))
    const fetchMock = jest.fn().mockResolvedValue({ ok: true })
    global.fetch = fetchMock

    const { getDataFromApi } = require('@/lib/api')
    await getDataFromApi('http://b', 'GET', { x: 2 })

    expect(fetchMock).toHaveBeenCalledWith('http://b', expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ x: 2 }),
    }))
  })
})
