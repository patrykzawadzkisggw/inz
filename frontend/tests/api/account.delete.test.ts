// @ts-nocheck
jest.mock('next/server', () => ({ NextResponse: { json: jest.fn((body, init) => ({ body, status: init?.status ?? 200, headers: init?.headers })) } }))
jest.mock('@clerk/nextjs/server', () => ({ auth: jest.fn(), currentUser: jest.fn(), clerkClient: jest.fn() }))

import { POST } from '@/app/api/account/delete/route'
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'

describe('endpoint usuwania konta', () => {
  beforeEach(() => {
    ;(auth as any).mockReset()
    ;(currentUser as any).mockReset()
    ;(clerkClient as any).mockReset()
    global.fetch = jest.fn()
  })

  test('zwraca 401, gdy użytkownik nie jest uwierzytelniony', async () => {
    ;(currentUser as any).mockResolvedValue(null)
    const res = await POST()
    expect(res.status).toBe(401)
    expect(res.body).toEqual({ error: 'unauthorized' })
  })

  test('przy udanym usunięciu wywołuje clerkClient i zwraca deleted: true', async () => {
    ;(currentUser as any).mockResolvedValue({ id: 'u1' })
    ;(auth as any).mockImplementation(() => Promise.resolve({ getToken: () => 'tok' }))
    ;(global.fetch as any).mockResolvedValue({ ok: true })
    ;(clerkClient as any).mockResolvedValue({ users: { deleteUser: jest.fn().mockResolvedValue(true) } })

    const res = await POST()
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ deleted: true })
  })

  test('nieudany fetch zwraca 500 i komunikat o błędzie', async () => {
    ;(currentUser as any).mockResolvedValue({ id: 'u1' })
    ;(auth as any).mockImplementation(() => Promise.resolve({ getToken: () => 'tok' }))
    ;(global.fetch as any).mockResolvedValue({ ok: false })
    const res = await POST()
    expect(res.status).toBe(500)
    expect(res.body).toEqual({ error: 'nie udało się usunąć konta' })
  })
})
