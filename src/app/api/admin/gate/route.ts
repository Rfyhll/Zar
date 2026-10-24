import { NextResponse } from 'next/server'
import { ADMIN_GATE_HASH, sha256, logActivity } from '@/lib/auth'

/**
 * FITUR KEENAM — Gerbang terenkripsi Portal Admin.
 * Kode diverifikasi sebagai SHA-256 di server; plaintext tidak pernah tersimpan.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const code = String(body.code ?? '')
    if (!code) return NextResponse.json({ error: 'Kode enkripsi wajib diisi.' }, { status: 400 })

    if (sha256(code) !== ADMIN_GATE_HASH) {
      await logActivity('ADMIN_GATE', 'Gerbang Admin', { detail: 'kode enkripsi salah' })
      return NextResponse.json({ error: 'Kode enkripsi salah. Akses ditolak.' }, { status: 401 })
    }

    await logActivity('ADMIN_GATE', 'Gerbang Admin', { detail: 'gerbang terbuka (kode benar)' })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Verifikasi gerbang gagal.' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
