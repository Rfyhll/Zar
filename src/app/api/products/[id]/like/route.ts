import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, logActivity } from '@/lib/auth'

/** POST /api/products/[id]/like — toggle suka barang. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Masuk dulu untuk menyukai barang.' }, { status: 401 })

  try {
    const product = await db.product.findUnique({ where: { id }, select: { id: true } })
    if (!product) return NextResponse.json({ error: 'Barang tidak ditemukan.' }, { status: 404 })

    const existing = await db.productLike.findUnique({
      where: { productId_userId: { productId: id, userId: session.user.id } },
    })

    if (existing) {
      await db.productLike.delete({ where: { id: existing.id } })
      const count = await db.productLike.count({ where: { productId: id } })
      await logActivity('PRODUCT_UNLIKE', 'Batal Suka Barang', {
        detail: `@${session.user.username} membatalkan suka barang`,
        userId: session.user.id,
        actorName: session.user.name,
      })
      return NextResponse.json({ liked: false, likeCount: count })
    }

    await db.productLike.create({ data: { productId: id, userId: session.user.id } })
    const count = await db.productLike.count({ where: { productId: id } })
    await logActivity('PRODUCT_LIKE', 'Suka Barang', {
      detail: `@${session.user.username} menyukai barang di Pasar`,
      userId: session.user.id,
      actorName: session.user.name,
    })
    return NextResponse.json({ liked: true, likeCount: count })
  } catch {
    return NextResponse.json({ error: 'Gagal menyukai barang.' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
