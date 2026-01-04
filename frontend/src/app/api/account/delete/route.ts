import { NextResponse } from 'next/server'
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { API_URL } from '@/lib/constants'

export async function POST() {
  const user = await currentUser();
  if (!user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const token = await auth().then(a => a.getToken())
    const response= await fetch(`${API_URL}/users`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    if (!response.ok) throw new Error('Error')

    const client = await clerkClient()
    await client.users.deleteUser(user.id)
  } catch  {
    return NextResponse.json({ error: 'nie udało się usunąć konta' }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}