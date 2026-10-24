import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSession, logActivity } from '@/lib/auth'

/**
 * FITUR KEENAM — Login Portal Admin.
 * Tanpa petunjuk kredensial demo; hanya pemilik website yang tahu kode gerbang + kredensial.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const username = String(body.username ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    if (!username || !password)
      return NextResponse.json({ error: 'Username dan password wajib diisi.' }, { status: 400 })

    const user = await db.user.findFirst({ where: { username, role: 'ADMIN' } })
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      await logActivity('ADMIN_LOGIN', 'Login Admin', { detail: `percobaan gagal (${username || 'kosong'})` })
      return NextResponse.json({ error: 'Kredensial admin salah.' }, { status: 401 })
    }

    await createSession(user.id)
    await logActivity('ADMIN_LOGIN', 'Login Admin', {
      detail: 'Administrator masuk ke portal admin',
      userId: user.id,
      actorName: user.name,
    })

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        provider: user.provider,
        faceRegistered: Boolean(user.faceHash),
        avatarUrl: user.avatarUrl,
        bio: user.bio,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Login admin gagal.' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
