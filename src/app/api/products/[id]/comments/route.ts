import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, logActivity } from '@/lib/auth'

/** POST /api/products/[id]/comments — tulis ulasan barang (dengan rating bintang). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Masuk dulu untuk mengulas.' }, { status: 401 })

  try {
    const body = await req.json()
    const text = String(body.text ?? '').trim()
    const rating = Math.min(5, Math.max(1, Math.floor(Number(body.rating ?? 5))))
    if (!text) return NextResponse.json({ error: 'Tulis ulasannya dulu ya.' }, { status: 400 })

    const product = await db.product.findUnique({ where: { id }, select: { id: true } })
    if (!product) return NextResponse.json({ error: 'Barang tidak ditemukan.' }, { status: 404 })

    const comment = await db.productComment.create({
      data: { productId: id, userId: session.user.id, text, rating },
      include: { user: { select: { id: true, username: true, name: true, avatarUrl: true, role: true } } },
    })

    /* perbarui rating rata-rata produk dari semua ulasan */
    const agg = await db.productComment.aggregate({ where: { productId: id }, _avg: { rating: true } })
    if (agg._avg.rating) {
      await db.product.update({ where: { id }, data: { rating: Math.round(agg._avg.rating * 10) / 10 } })
    }

    await logActivity('PRODUCT_REVIEW', 'Ulas Barang', {
      detail: `@${session.user.username} mengulas barang (${rating}★): "${text.slice(0, 50)}${text.length > 50 ? '…' : ''}"`,
      userId: session.user.id,
      actorName: session.user.name,
    })

    return NextResponse.json(
      {
        comment: {
          id: comment.id,
          text: comment.text,
          rating: comment.rating,
          createdAt: comment.createdAt,
          user: comment.user,
        },
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: 'Gagal mengirim ulasan.' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
