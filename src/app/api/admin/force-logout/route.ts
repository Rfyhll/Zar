import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, logActivity } from '@/lib/auth'

/**
 * FITUR KEENAM — Paksa keluar akun pengguna (untuk jaga-jaga keamanan).
 * Menghapus SEMUA sesi login user yang dituju; user harus masuk ulang.
 */
export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Hanya administrator EcoDaur.' }, { status: 403 })

  try {
    const body = await req.json()
    const userId = String(body.userId ?? '')
    if (!userId) return NextResponse.json({ error: 'userId wajib.' }, { status: 400 })

    const target = await db.user.findUnique({ where: { id: userId } })
    if (!target) return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 })
    if (target.id === session.user.id)
      return NextResponse.json({ error: 'Tidak bisa memaksa keluar akun sendiri.' }, { status: 400 })

    const removed = await db.session.deleteMany({ where: { userId } })

    await logActivity('FORCE_LOGOUT', 'Paksa Keluar', {
      detail: `${target.name} (@${target.username}${target.email ? `, ${target.email}` : ''}) — ${removed.count} sesi dihapus`,
      userId: session.user.id,
      actorName: session.user.name,
    })

    return NextResponse.json({ ok: true, removedSessions: removed.count })
  } catch {
    return NextResponse.json({ error: 'Gagal memaksa keluar pengguna.' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
