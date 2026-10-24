import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, logActivity } from '@/lib/auth'

/** GET /api/posts/[id]/comments */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const comments = await db.comment.findMany({
    where: { postId: id },
    orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, username: true, name: true, avatarUrl: true, role: true } } },
  })
  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c.id,
      text: c.text,
      createdAt: c.createdAt,
      user: c.user,
    })),
  })
}

/** POST /api/posts/[id]/comments { text } */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Masuk dulu untuk berkomentar.' }, { status: 401 })

  try {
    const body = await req.json()
    const text = String(body.text ?? '').trim()
    if (!text) return NextResponse.json({ error: 'Komentar tidak boleh kosong.' }, { status: 400 })

    const post = await db.post.findUnique({ where: { id }, select: { id: true } })
    if (!post) return NextResponse.json({ error: 'Karya tidak ditemukan.' }, { status: 404 })

    const comment = await db.comment.create({
      data: { postId: id, userId: session.user.id, text },
      include: { user: { select: { id: true, username: true, name: true, avatarUrl: true, role: true } } },
    })

    await logActivity('COMMENT', 'Komentar', {
      detail: `@${session.user.username} berkomentar: "${text.slice(0, 50)}${text.length > 50 ? '…' : ''}"`,
      userId: session.user.id,
      actorName: session.user.name,
    })

    return NextResponse.json(
      { comment: { id: comment.id, text: comment.text, createdAt: comment.createdAt, user: comment.user } },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: 'Gagal mengirim komentar.' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
