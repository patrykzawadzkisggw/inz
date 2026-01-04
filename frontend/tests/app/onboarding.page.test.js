import { jest } from '@jest/globals'

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock('@clerk/nextjs/server', () => ({
  __esModule: true,
  currentUser: jest.fn(),
}))

const redirectMock = jest.fn()
jest.mock('next/navigation', () => ({
  __esModule: true,
  redirect: (...args) => redirectMock(...args),
}))

const prisma = require('@/lib/prisma').default
const { currentUser } = require('@clerk/nextjs/server')
const { default: OnboardingPage } = require('@/app/(authorized)/onboarding/page')

describe('OnboardingPage', () => {
  beforeEach(() => {
    redirectMock.mockClear()
    redirectMock.mockImplementation(() => { throw new Error('redirect') })
    prisma.user.findUnique.mockReset()
    prisma.user.create.mockReset()
    currentUser.mockReset()
  })

  test('przekierowuje na logowanie gdy brak użytkownika', async () => {
    currentUser.mockResolvedValue(null)

    await expect(OnboardingPage()).rejects.toThrow('redirect')

    expect(redirectMock).toHaveBeenCalledWith('/sign-in')
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  test('gdy użytkownik istnieje w bazie przechodzi do /', async () => {
    currentUser.mockResolvedValue({ id: 'u1', emailAddresses: [{ emailAddress: 'a@b.com' }] })
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' })

    await expect(OnboardingPage()).rejects.toThrow('redirect')

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } })
    expect(prisma.user.create).not.toHaveBeenCalled()
    expect(redirectMock).toHaveBeenCalledWith('/')
  })

  test('tworzy użytkownika gdy brak rekordu', async () => {
    currentUser.mockResolvedValue({ id: 'u2', emailAddresses: [{ emailAddress: 'new@example.com' }] })
    prisma.user.findUnique.mockResolvedValue(null)

    await expect(OnboardingPage()).rejects.toThrow('redirect')

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { id: 'u2', email: 'new@example.com' },
    })
    expect(redirectMock).toHaveBeenCalledWith('/')
  })
})
