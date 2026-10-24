import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSession, logActivity, publicUser } from '@/lib/auth'

/**
 * Login "Google" — perilaku sama seperti situs lama:
 * membuat/memakai akun ber-provider GOOGLE lalu langsung masuk.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body.email ?? '').trim().toLowerCase()
    const name = String(body.name ?? '').trim()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: 'Alamat Gmail tidak valid.' }, { status: 400 })
    if (name.length < 2) return NextResponse.json({ error: 'Nama minimal 2 karakter.' }, { status: 400 })

    let user = await db.user.findFirst({ where: { email } })

    if (!user) {
      let username = email.split('@')[0].replace(/[^a-z0-9._]/g, '').slice(0, 18) || 'anggota'
      const taken = await db.user.findUnique({ where: { username } })
      if (taken) username = `${username}${Math.floor(10 + Math.random() * 90)}`
      user = await db.user.create({
        data: { username, name, email, role: 'USER', provider: 'GOOGLE' },
      })
    }

    await createSession(user.id)
    await logActivity('LOGIN_GOOGLE', 'Masuk (Google)', {
      detail: `Masuk dengan opsi Google (${email})`,
      userId: user.id,
      actorName: user.name,
    })

    const fresh = await db.user.findUnique({ where: { id: user.id } })
    return NextResponse.json({ user: fresh ? publicUser(fresh) : null })
  } catch {
    return NextResponse.json({ error: 'Masuk dengan Google gagal. Coba lagi.' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
