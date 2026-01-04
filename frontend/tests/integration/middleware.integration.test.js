import { jest } from '@jest/globals'

const protectMock = jest.fn()
const authMock = { protect: protectMock }

jest.mock('@clerk/nextjs/server', () => ({
  __esModule: true,
  clerkMiddleware: (cb) => (req) => cb(authMock, req),
  createRouteMatcher: (patterns) => (req) => patterns.some((p) => {
    const regex = new RegExp(p.replace('(.*)', '.*'))
    return regex.test(req.nextUrl.pathname)
  }),
}))

const middleware = require('@/middleware').default

describe('middleware route protection', () => {
  beforeEach(() => {
    protectMock.mockClear()
  })

  test('nie chroni publicznych routów', async () => {
    await middleware({ nextUrl: { pathname: '/sign-in' } })
    await middleware({ nextUrl: { pathname: '/sign-up/foo' } })

    expect(protectMock).not.toHaveBeenCalled()
  })

  test('chroni prywatne routy', async () => {
    await middleware({ nextUrl: { pathname: '/dashboard' } })
    await middleware({ nextUrl: { pathname: '/models' } })

    expect(protectMock).toHaveBeenCalledTimes(2)
  })
})
