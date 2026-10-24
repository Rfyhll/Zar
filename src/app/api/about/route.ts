import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, logActivity } from '@/lib/auth'

const MAX_PHOTO_BYTES = 1_400_000 // 1 MB (data URL base64 ≈ 1.4x ukuran asli)
const SLOTS = [1, 2, 3]

/** GET /api/about — tiga foto pemilik (publik). */
export async function GET() {
  const photos = await db.aboutPhoto.findMany({ orderBy: { slot: 'asc' } })
  return NextResponse.json({
    photos: SLOTS.map((slot) => {
      const p = photos.find((x) => x.slot === slot)
      return { slot, dataUrl: p?.dataUrl ?? null, updatedAt: p?.updatedAt ?? null }
    }),
  })
}

/** PUT /api/about { slot, dataUrl } — hanya admin. */
export async function PUT(req: Request) {
  const session = await getCurrentSession()
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Hanya administrator EcoDaur.' }, { status: 403 })

  try {
    const body = await req.json()
    const slot = Number(body.slot)
    const dataUrl = String(body.dataUrl ?? '')
    if (!SLOTS.includes(slot)) return NextResponse.json({ error: 'Slot harus 1, 2, atau 3.' }, { status: 400 })
    const m = dataUrl.match(/^data:image\/([a-z0-9.+-]+);base64,.+$/) /* semua tipe gambar diterima */
    if (!m) return NextResponse.json({ error: 'Format foto tidak dikenal.' }, { status: 400 })
    const buf = Buffer.from(dataUrl.split(',')[1] ?? '', 'base64')
    if (buf.length > MAX_PHOTO_BYTES)
      return NextResponse.json({ error: 'Ukuran foto terlalu besar (maks 1 MB).' }, { status: 413 })

    await db.aboutPhoto.upsert({
      where: { slot },
      update: { dataUrl },
      create: { slot, dataUrl },
    })

    await logActivity('ABOUT_UPDATE', 'Kelola Foto Tentang', {
      detail: `slot ${slot}`,
      userId: session.user.id,
      actorName: session.user.name,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Gagal menyimpan foto.' }, { status: 500 })
  }
}

/** DELETE /api/about?slot=1..3 — hanya admin. */
export async function DELETE(req: Request) {
  const session = await getCurrentSession()
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Hanya administrator EcoDaur.' }, { status: 403 })
  const slot = Number(new URL(req.url).searchParams.get('slot'))
  if (!SLOTS.includes(slot)) return NextResponse.json({ error: 'Slot tidak valid.' }, { status: 400 })
  await db.aboutPhoto.deleteMany({ where: { slot } })
  await logActivity('ABOUT_UPDATE', 'Kelola Foto Tentang', {
    detail: `hapus slot ${slot}`,
    userId: session.user.id,
    actorName: session.user.name,
  })
  return NextResponse.json({ ok: true })
}

export const dynamic = 'force-dynamic'
