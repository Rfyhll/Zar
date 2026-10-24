import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, logActivity } from '@/lib/auth'

/** POST /api/posts/[id]/like — toggle suka. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Masuk dulu untuk menyukai karya.' }, { status: 401 })

  try {
    const post = await db.post.findUnique({ where: { id }, select: { id: true } })
    if (!post) return NextResponse.json({ error: 'Karya tidak ditemukan.' }, { status: 404 })

    const existing = await db.like.findUnique({
      where: { postId_userId: { postId: id, userId: session.user.id } },
    })

    if (existing) {
      await db.like.delete({ where: { id: existing.id } })
      const count = await db.like.count({ where: { postId: id } })
      await logActivity('UNLIKE', 'Batal Suka', {
        detail: `@${session.user.username} membatalkan suka`,
        userId: session.user.id,
        actorName: session.user.name,
      })
      return NextResponse.json({ liked: false, likeCount: count })
    }

    await db.like.create({ data: { postId: id, userId: session.user.id } })
    const count = await db.like.count({ where: { postId: id } })
    await logActivity('LIKE', 'Suka Karya', {
      detail: `@${session.user.username} menyukai karya`,
      userId: session.user.id,
      actorName: session.user.name,
    })
    return NextResponse.json({ liked: true, likeCount: count })
  } catch {
    return NextResponse.json({ error: 'Gagal menyukai karya.' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
