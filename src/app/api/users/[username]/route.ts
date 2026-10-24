import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/** GET /api/users/[username] — profil publik anggota + karyanya. */
export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const user = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      provider: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
    },
  })
  if (!user) return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 })

  const posts = await db.post.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: {
      user: { select: { id: true, username: true, name: true, avatarUrl: true, role: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, username: true, name: true, avatarUrl: true, role: true } } },
      },
      _count: { select: { likes: true } },
    },
  })

  return NextResponse.json({
    user: { ...user, postCount: posts.length },
    posts: posts.map((p) => ({
      id: p.id,
      imageUrl: p.imageUrl,
      caption: p.caption,
      createdAt: p.createdAt,
      user: p.user,
      likeCount: p._count.likes,
      likedByMe: false,
      comments: p.comments.map((c) => ({
        id: c.id,
        text: c.text,
        createdAt: c.createdAt,
        user: c.user,
      })),
    })),
  })
}

export const dynamic = 'force-dynamic'
