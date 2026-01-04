
let middlewareModule

const isPublicMock = jest.fn()

jest.mock('@clerk/nextjs/server', () => ({
  __esModule: true,
  clerkMiddleware: jest.fn((handler) => handler),
  createRouteMatcher: jest.fn(() => (req) => isPublicMock(req)),
}))

beforeAll(async () => {
  middlewareModule = await import('@/middleware')
})

beforeEach(() => {
  jest.clearAllMocks()
  isPublicMock.mockReset()
})

describe('middleware', () => {
  it('rejestruje middleware', () => {
    const exported = middlewareModule?.default ?? middlewareModule
    expect(typeof exported).toBe('function')
  })

  it('nie wywołuje auth.protect dla tras publicznych', async () => {
    isPublicMock.mockReturnValue(true)

    const handler = middlewareModule?.default ?? middlewareModule
    const authMock = { protect: jest.fn().mockResolvedValue(undefined) }
    const req = { url: '/sign-in' }

    await handler(authMock, req)

    expect(authMock.protect).not.toHaveBeenCalled()
  })

  it('wywołuje auth.protect dla tras niepublicznych', async () => {
    isPublicMock.mockReturnValue(false)

    const handler = middlewareModule?.default ?? middlewareModule
    const authMock = { protect: jest.fn().mockResolvedValue(undefined) }
    const req = { url: '/dashboard' }

    await handler(authMock, req)

    expect(authMock.protect).toHaveBeenCalled()
  })

  it('eksportuje config.matcher', () => {
    const mod = middlewareModule
    expect(mod.config).toBeDefined()
    expect(Array.isArray(mod.config.matcher)).toBe(true)
  })
})
