import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  __esModule: true,
  useRouter: () => ({ push: pushMock }),
}))

const signInCreate = jest.fn()
const signInSetActive = jest.fn()
const signUpCreate = jest.fn()
const signUpSetActive = jest.fn()

jest.mock('@clerk/nextjs', () => {
  const React = require('react')
  return {
    __esModule: true,
    useSignIn: () => ({
      isLoaded: true,
      signIn: { create: signInCreate },
      setActive: signInSetActive,
    }),
    useSignUp: () => ({
      isLoaded: true,
      signUp: { create: signUpCreate },
      setActive: signUpSetActive,
    }),
    SignIn: ({ afterSignInUrl }) => {
      const [err, setErr] = React.useState('')
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            signInCreate({ email: 'a@b.com' })
              .then((res) => {
                if (res.status === 'complete') {
                  signInSetActive({ session: res.createdSessionId })
                  pushMock(afterSignInUrl || '/')
                }
              })
              .catch(() => setErr('signin-error'))
          }}
        >
          <input aria-label="email" defaultValue="a@b.com" />
          <input aria-label="password" defaultValue="pass" />
          <button type="submit">Zaloguj</button>
          {err && <div role="alert">{err}</div>}
        </form>
      )
    },
    SignUp: ({ afterSignUpUrl }) => {
      const [err, setErr] = React.useState('')
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            signUpCreate({ email: 'new@b.com' })
              .then((res) => {
                if (res.status === 'complete') {
                  signUpSetActive({ session: res.createdSessionId })
                  pushMock(afterSignUpUrl || '/onboarding')
                }
              })
              .catch(() => setErr('signup-error'))
          }}
        >
          <input aria-label="email" defaultValue="new@b.com" />
          <input aria-label="password" defaultValue="pass" />
          <input aria-label="confirm" defaultValue="pass" />
          <button type="submit">Zarejestruj</button>
          {err && <div role="alert">{err}</div>}
        </form>
      )
    },
  }
})

const SignInPage = require('@/app/sign-in/[[...sign-in]]/page').default
const SignUpPage = require('@/app/sign-up/[[...sign-up]]/page').default

describe('Auth flow integration', () => {
  beforeEach(() => {
    pushMock.mockClear()
    signInCreate.mockReset()
    signInSetActive.mockClear()
    signUpCreate.mockReset()
    signUpSetActive.mockClear()
  })

  test('sign-in success ustawia sesję i przekierowuje', async () => {
    signInCreate.mockResolvedValue({ status: 'complete', createdSessionId: 'sess-1' })

    render(<SignInPage />)

    fireEvent.click(screen.getByText('Zaloguj'))

    await waitFor(() => expect(signInSetActive).toHaveBeenCalledWith({ session: 'sess-1' }))
    expect(pushMock).toHaveBeenCalledWith('/')
  })

  test('sign-in błąd pokazuje wyjątek', async () => {
    const error = new Error('invalid creds')
    signInCreate.mockRejectedValue(error)

    render(<SignInPage />)

    fireEvent.click(screen.getByText('Zaloguj'))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('signin-error'))
    expect(signInCreate).toHaveBeenCalled()
  })

  test('sign-up success ustawia sesję i przekierowuje', async () => {
    signUpCreate.mockResolvedValue({ status: 'complete', createdSessionId: 'sess-2' })

    render(<SignUpPage />)

    fireEvent.click(screen.getByText('Zarejestruj'))

    await waitFor(() => expect(signUpSetActive).toHaveBeenCalledWith({ session: 'sess-2' }))
    expect(pushMock).toHaveBeenCalledWith('/onboarding')
  })

  test('sign-up błąd pokazuje wyjątek', async () => {
    signUpCreate.mockRejectedValue(new Error('email exists'))

    render(<SignUpPage />)

    fireEvent.click(screen.getByText('Zarejestruj'))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('signup-error'))
    expect(signUpCreate).toHaveBeenCalled()
  })
})
