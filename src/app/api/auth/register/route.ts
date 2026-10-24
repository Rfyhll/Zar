import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createSession, logActivity, publicUser } from '@/lib/auth'

/**
 * Pendaftaran persis situs lama (screenshot 135–136):
 * Full Name + Username + Password (+ signature wajah dari Step 2).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const name = String(body.name ?? '').trim()
    const username = String(body.username ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const faceSignature = typeof body.faceSignature === 'string' ? body.faceSignature : null

    if (name.length < 2) return NextResponse.json({ error: 'Nama minimal 2 karakter.' }, { status: 400 })
    if (!/^[a-z0-9._]{3,20}$/.test(username))
      return NextResponse.json(
        { error: 'Username 3-20 karakter, hanya huruf kecil, angka, titik, atau garis bawah.' },
        { status: 400 }
      )
    if (password.length < 6)
      return NextResponse.json({ error: 'Password minimal 6 karakter.' }, { status: 400 })

    const taken = await db.user.findUnique({ where: { username } })
    if (taken)
      return NextResponse.json(
        { error: 'Username sudah dipakai. Coba yang lain ya.' },
        { status: 409 }
      )

    const user = await db.user.create({
      data: {
        username,
        name,
        email: null,
        passwordHash: hashPassword(password),
        role: 'USER',
        provider: 'CREDENTIALS',
        faceHash: faceSignature,
      },
    })

    await createSession(user.id)
    await logActivity('REGISTER', 'Pendaftaran', {
      detail: `Akun baru @${username} (dengan${faceSignature ? '' : ' tanpa'} pendaftaran wajah)`,
      userId: user.id,
      actorName: user.name,
    })

    const fresh = await db.user.findUnique({ where: { id: user.id } })
    return NextResponse.json({ user: fresh ? publicUser(fresh) : null }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Pendaftaran gagal. Coba lagi.' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
