import { NextResponse } from 'next/server'
import { destroySession, getCurrentSession, logActivity } from '@/lib/auth'

export async function POST() {
  const session = await getCurrentSession()
  if (session) {
    await logActivity('LOGOUT', 'Keluar', {
      detail: `Keluar dari akun @${session.user.username}`,
      userId: session.user.id,
      actorName: session.user.name,
    })
  }
  await destroySession()
  return NextResponse.json({ ok: true })
}

export const dynamic = 'force-dynamic'
