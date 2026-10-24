import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSession, logActivity } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const identifier = String(body.identifier ?? body.username ?? body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')

    if (!identifier || !password)
      return NextResponse.json({ error: 'Username/email dan password wajib diisi.' }, { status: 400 })

    const user = await db.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }] },
    })
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash))
      return NextResponse.json({ error: 'Username atau password salah.' }, { status: 401 })

    /* admin boleh masuk lewat Sign In biasa — navbar akan menampilkan menu Admin,
       dan frontend langsung membawanya ke Portal Admin */

    await createSession(user.id)
    await logActivity('LOGIN_PASSWORD', 'Masuk (Password)', {
      detail: 'Masuk dengan username & password',
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
    return NextResponse.json({ error: 'Masuk gagal. Coba lagi.' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
