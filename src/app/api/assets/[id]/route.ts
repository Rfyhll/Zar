import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/** GET /api/assets/<id> — sajikan gambar dari database (BLOB) dengan cache
 *  permanen (id tidak pernah berubah), bekerja di hosting mana pun. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const asset = await db.asset.findUnique({ where: { id } })
  if (!asset) return new NextResponse('Gambar tidak ditemukan.', { status: 404 })

  return new NextResponse(new Uint8Array(asset.data), {
    headers: {
      'Content-Type': asset.mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': String(asset.data.length),
    },
  })
}

export const dynamic = 'force-dynamic'
