import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  parseFaceTemplate,
  faceSimilarity,
  FACE_MATCH_THRESHOLD,
  createSession,
  destroySession,
  getCurrentSession,
  logActivity,
  publicUser,
} from '@/lib/auth'

/**
 * POST /api/auth/face
 * - { mode: 'enroll', signature }      → daftarkan wajah akun yang sedang login
 * - { mode: 'login', signature }       → cocokkan signature ke semua user terdaftar
 * - { mode: 'cancel' }                 → batalkan sesi verifikasi (sesi dicabut)
 * Tidak ada foto yang disimpan — hanya signature matematis.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const mode = String(body.mode ?? '')

    if (mode === 'cancel') {
      const session = await getCurrentSession()
      if (session) {
        await logActivity('LOGOUT', 'Keluar', {
          detail: `Verifikasi wajah dibatalkan — sesi @${session.user.username} dicabut`,
          userId: session.user.id,
          actorName: session.user.name,
        })
      }
      await destroySession()
      return NextResponse.json({ ok: true, user: null })
    }

    /* signature boleh dikirim sebagai string JSON atau objek — keduanya diterima */
    const rawSignature =
      typeof body.signature === 'string'
        ? body.signature
        : body.signature && typeof body.signature === 'object'
          ? JSON.stringify(body.signature)
          : null
    const signature = parseFaceTemplate(rawSignature)
    if (!signature)
      return NextResponse.json({ error: 'Signature wajah tidak terbaca. Ulangi pemindaian.' }, { status: 400 })

    if (mode === 'enroll') {
      const session = await getCurrentSession()
      if (!session) return NextResponse.json({ error: 'Masuk dulu untuk mendaftarkan wajah.' }, { status: 401 })
      await db.user.update({
        where: { id: session.user.id },
        data: { faceHash: body.signature },
      })
      await logActivity('REGISTER', 'Pendaftaran', {
        detail: `Wajah @${session.user.username} terdaftar sebagai signature biometrik`,
        userId: session.user.id,
        actorName: session.user.name,
      })
      const fresh = await db.user.findUnique({ where: { id: session.user.id } })
      return NextResponse.json({ ok: true, user: fresh ? publicUser(fresh) : null })
    }

    if (mode === 'login') {
      const candidates = await db.user.findMany({
        where: { faceHash: { not: null } },
        select: { id: true, username: true, name: true, role: true, faceHash: true },
      })
      let best: { id: string; score: number } | null = null
      for (const c of candidates) {
        const tpl = parseFaceTemplate(c.faceHash)
        if (!tpl) continue
        const score = faceSimilarity(signature, tpl)
        if (!best || score > best.score) best = { id: c.id, score }
      }

      if (!best || best.score < FACE_MATCH_THRESHOLD) {
        await logActivity('LOGIN_FACE', 'Masuk (Wajah)', { detail: 'Wajah tidak dikenali' })
        return NextResponse.json(
          { error: 'Wajah tidak dikenali. Coba lagi atau gunakan password.' },
          { status: 401 }
        )
      }

      const user = await db.user.findUnique({ where: { id: best.id } })
      if (!user || user.role === 'ADMIN')
        return NextResponse.json({ error: 'Wajah tidak dikenali.' }, { status: 401 })

      // re-enroll adaptif agar signature tetap akurat seiring waktu
      if (best.score < 0.95) {
        await db.user.update({ where: { id: user.id }, data: { faceHash: body.signature } })
      }

      await createSession(user.id)
      await logActivity('LOGIN_FACE', 'Masuk (Wajah)', {
        detail: `Wajah @${user.username} dikenali (skor ${(best.score * 100).toFixed(1)}%)`,
        userId: user.id,
        actorName: user.name,
      })
      return NextResponse.json({
        user: publicUser(user),
        score: Number(best.score.toFixed(3)),
      })
    }

    return NextResponse.json({ error: 'Mode tidak dikenal.' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Pemindaian wajah gagal. Coba lagi.' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
