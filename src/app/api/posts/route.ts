import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, logActivity } from '@/lib/auth'

const MAX_IMAGE_BYTES = 3_000_000 // 3 MB — cukup untuk foto HP & GIF animasi

/** tipe gambar yang diterima → mime untuk tabel Asset */
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
  tiff: 'image/tiff',
  'svg+xml': 'image/svg+xml',
}

/** GET /api/posts — feed karya (bentuk respons persis situs lama). */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const username = url.searchParams.get('username')
  const session = await getCurrentSession()

  const posts = await db.post.findMany({
    where: username ? { user: { username } } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 60,
    include: {
      user: { select: { id: true, username: true, name: true, avatarUrl: true, role: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, username: true, name: true, avatarUrl: true, role: true } } },
      },
      _count: { select: { likes: true } },
    },
  })

  let likedIds = new Set<string>()
  if (session) {
    const likes = await db.like.findMany({ where: { userId: session.user.id }, select: { postId: true } })
    likedIds = new Set(likes.map((l) => l.postId))
  }

  return NextResponse.json({
    posts: posts.map((p) => ({
      id: p.id,
      imageUrl: p.imageUrl,
      caption: p.caption,
      createdAt: p.createdAt,
      user: p.user,
      likeCount: p._count.likes,
      likedByMe: likedIds.has(p.id),
      comments: p.comments.map((c) => ({
        id: c.id,
        text: c.text,
        createdAt: c.createdAt,
        user: c.user,
      })),
    })),
  })
}

/** POST /api/posts — bagikan karya baru (gambar disimpan ke DATABASE sebagai
 *  BLOB tabel Asset → tersaji via /api/assets/<id>, portabel di hosting mana
 *  pun; folder public/ tidak perlu bisa ditulis). */
export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Masuk dulu untuk membagikan karya.' }, { status: 401 })

  try {
    const body = await req.json()
    const caption = String(body.caption ?? '').trim()
    const image = String(body.image ?? '')
    const m = image.match(/^data:image\/([a-z0-9.+-]+);base64,(.+)$/) /* semua tipe gambar diterima */
    if (!m) return NextResponse.json({ error: 'Format gambar tidak dikenal. Gunakan foto (JPG, PNG, WEBP, GIF, HEIC, dll).' }, { status: 400 })
    const buf = Buffer.from(m[2], 'base64')
    if (buf.length > MAX_IMAGE_BYTES)
      return NextResponse.json({ error: 'Ukuran gambar terlalu besar (maks 3 MB).' }, { status: 413 })
    if (!caption) return NextResponse.json({ error: 'Ceritakan karyamu dulu ya.' }, { status: 400 })

    const asset = await db.asset.create({
      data: { mime: MIME_BY_TYPE[m[1]] ?? 'image/jpeg', data: buf },
    })

    const post = await db.post.create({
      data: { imageUrl: `/api/assets/${asset.id}`, caption, userId: session.user.id },
      include: { user: { select: { id: true, username: true, name: true, avatarUrl: true, role: true } } },
    })

    await logActivity('POST_CREATE', 'Unggah Karya', {
      detail: `Membagikan karya baru: "${caption.slice(0, 60)}${caption.length > 60 ? '…' : ''}"`,
      userId: session.user.id,
      actorName: session.user.name,
    })

    return NextResponse.json(
      {
        post: {
          id: post.id,
          imageUrl: post.imageUrl,
          caption: post.caption,
          createdAt: post.createdAt,
          user: post.user,
          likeCount: 0,
          likedByMe: false,
          comments: [],
        },
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: 'Gagal membagikan karya. Coba lagi.' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
