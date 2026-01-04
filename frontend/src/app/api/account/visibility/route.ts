import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'

export async function GET() {
  const user = await currentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { isAccountPrivate: true } })
  return NextResponse.json({ isAccountPrivate: dbUser?.isAccountPrivate ?? true })
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { isAccountPrivate} = await req.json().catch(() => ({}));
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { 
      isAccountPrivate: isAccountPrivate === true
    },
    select: { isAccountPrivate: true },
  });
  return NextResponse.json({ isAccountPrivate: updated.isAccountPrivate });
}
