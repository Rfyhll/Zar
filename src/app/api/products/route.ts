import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, logActivity } from '@/lib/auth'

const MAX_IMAGE_BYTES = 3_000_000 // 3 MB

const MIME_BY_TYPE: Record<string, string> = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
}

const CATEGORIES = ['Dekorasi', 'Fashion', 'Aksesoris', 'Taman & Organik', 'Mainan']

/** GET /api/products — daftar barang jualan di Pasar EcoDaur. */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const category = url.searchParams.get('category')
  const q = url.searchParams.get('q')
  const username = url.searchParams.get('username')
  const session = await getCurrentSession()

  const products = await db.product.findMany({
    where: {
      ...(category && category !== 'Semua' ? { category } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] } : {}),
      ...(username ? { seller: { username } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 80,
    include: {
      seller: { select: { id: true, username: true, name: true, avatarUrl: true, role: true } },
      comments: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { user: { select: { id: true, username: true, name: true, avatarUrl: true, role: true } } },
      },
      _count: { select: { likes: true } },
    },
  })

  let likedIds = new Set<string>()
  if (session) {
    const likes = await db.productLike.findMany({
      where: { userId: session.user.id },
      select: { productId: true },
    })
    likedIds = new Set(likes.map((l) => l.productId))
  }

  return NextResponse.json({
    products: products.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      category: p.category,
      price: p.price,
      oldPrice: p.oldPrice,
      stock: p.stock,
      sold: p.sold,
      rating: p.rating,
      location: p.location,
      imageUrl: p.imageUrl,
      createdAt: p.createdAt,
      seller: p.seller,
      likeCount: p._count.likes,
      likedByMe: likedIds.has(p.id),
      comments: p.comments.map((c) => ({
        id: c.id,
        text: c.text,
        rating: c.rating,
        createdAt: c.createdAt,
        user: c.user,
      })),
    })),
  })
}

/** POST /api/products — anggota memasang barang jualan baru (foto → Asset BLOB). */
export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Masuk dulu untuk menjual barang.' }, { status: 401 })

  try {
    const body = await req.json()
    const title = String(body.title ?? '').trim()
    const description = String(body.description ?? '').trim()
    const category = String(body.category ?? '').trim()
    const price = Math.floor(Number(body.price ?? 0))
    const stock = Math.max(1, Math.floor(Number(body.stock ?? 1)))
    const image = String(body.image ?? '')

    if (!title || !description || !image)
      return NextResponse.json({ error: 'Lengkapi nama, deskripsi, dan foto barang.' }, { status: 400 })
    if (!CATEGORIES.includes(category))
      return NextResponse.json({ error: 'Pilih kategori yang tersedia.' }, { status: 400 })
    if (!Number.isFinite(price) || price < 1000 || price > 50_000_000)
      return NextResponse.json({ error: 'Harga harus antara Rp 1.000 - Rp 50.000.000.' }, { status: 400 })

    const m = image.match(/^data:image\/([a-z0-9.+-]+);base64,(.+)$/)
    if (!m) return NextResponse.json({ error: 'Format foto tidak dikenal.' }, { status: 400 })
    const buf = Buffer.from(m[2], 'base64')
    if (buf.length > MAX_IMAGE_BYTES)
      return NextResponse.json({ error: 'Ukuran foto terlalu besar (maks 3 MB).' }, { status: 413 })

    const asset = await db.asset.create({
      data: { mime: MIME_BY_TYPE[m[1]] ?? 'image/jpeg', data: buf },
    })

    const product = await db.product.create({
      data: {
        title,
        description,
        category,
        price,
        stock,
        imageUrl: `/api/assets/${asset.id}`,
        sellerId: session.user.id,
        location: 'Banda Aceh',
      },
      include: { seller: { select: { id: true, username: true, name: true, avatarUrl: true, role: true } } },
    })

    await logActivity('PRODUCT_CREATE', 'Pasang Jualan', {
      detail: `Memasang barang jualan baru: "${title}" di Pasar EcoDaur`,
      userId: session.user.id,
      actorName: session.user.name,
    })

    return NextResponse.json(
      {
        product: {
          id: product.id,
          title: product.title,
          description: product.description,
          category: product.category,
          price: product.price,
          oldPrice: product.oldPrice,
          stock: product.stock,
          sold: product.sold,
          rating: product.rating,
          location: product.location,
          imageUrl: product.imageUrl,
          createdAt: product.createdAt,
          seller: product.seller,
          likeCount: 0,
          likedByMe: false,
          comments: [],
        },
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: 'Gagal memasang barang. Coba lagi.' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
