import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, logActivity } from '@/lib/auth'

const PAYMENTS = ['COD', 'TRANSFER', 'ECOPOINT']

/** POST /api/products/[id]/buy — beli barang (pembayaran disimulasikan).
 *  Membuat Order, mengurangi stok, menambah jumlah terjual. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Masuk dulu untuk membeli barang.' }, { status: 401 })

  try {
    const body = await req.json()
    const qty = Math.max(1, Math.floor(Number(body.qty ?? 1)))
    const address = String(body.address ?? '').trim()
    const payment = PAYMENTS.includes(String(body.payment ?? '')) ? String(body.payment) : 'COD'

    if (!address) return NextResponse.json({ error: 'Isi alamat pengiriman dulu ya.' }, { status: 400 })

    const product = await db.product.findUnique({ where: { id } })
    if (!product) return NextResponse.json({ error: 'Barang tidak ditemukan.' }, { status: 404 })
    if (product.stock < qty)
      return NextResponse.json({ error: `Stok tinggal ${product.stock}. Kurangi jumlahnya ya.` }, { status: 400 })
    if (product.sellerId === session.user.id)
      return NextResponse.json({ error: 'Ini barangmu sendiri. 😅' }, { status: 400 })

    const totalPrice = product.price * qty

    const order = await db.order.create({
      data: {
        productId: id,
        buyerId: session.user.id,
        qty,
        totalPrice,
        address,
        payment,
        status: payment === 'COD' ? 'DIPROSES' : 'DIPROSES',
      },
    })

    await db.product.update({
      where: { id },
      data: { stock: { decrement: qty }, sold: { increment: qty } },
    })

    await logActivity('ORDER_CREATE', 'Beli Barang', {
      detail: `Membeli "${product.title}" ×${qty} (Rp ${totalPrice.toLocaleString('id-ID')}) — pembayaran ${payment}`,
      userId: session.user.id,
      actorName: session.user.name,
    })

    return NextResponse.json(
      {
        order: {
          id: order.id,
          qty: order.qty,
          totalPrice: order.totalPrice,
          payment: order.payment,
          status: order.status,
          createdAt: order.createdAt,
        },
        stock: product.stock - qty,
        sold: product.sold + qty,
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: 'Gagal membuat pesanan. Coba lagi.' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
