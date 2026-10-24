import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, ACTION_LABELS } from '@/lib/auth'

/**
 * FITUR KEENAM — Konsol admin melihat SEGALA identitas pengguna:
 * nama, username, email, provider, status wajah, bio, jumlah karya/suka/komentar,
 * sesi aktif, dibuat, dan terakhir terlihat.
 */
export async function GET() {
  const session = await getCurrentSession()
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Hanya administrator EcoDaur.' }, { status: 403 })

  const users = await db.user.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { posts: true, likes: true, comments: true, sessions: true } },
    },
  })

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const stats = {
    totalUsers: users.filter((u) => u.role !== 'ADMIN').length,
    totalAdmins: users.filter((u) => u.role === 'ADMIN').length,
    onlineUsers: users.filter(
      (u) => u._count.sessions > 0 && Date.now() - u.lastSeenAt.getTime() < 5 * 60 * 1000
    ).length,
    totalPosts: await db.post.count(),
    totalLikes: await db.like.count(),
    totalComments: await db.comment.count(),
    activities24h: await db.activity.count({ where: { createdAt: { gte: dayAgo } } }),
    faceRegistered: users.filter((u) => Boolean(u.faceHash)).length,
    googleUsers: users.filter((u) => u.provider === 'GOOGLE').length,
  }

  const activities = await db.activity.findMany({ orderBy: { createdAt: 'desc' }, take: 80 })
  const actorIds = [...new Set(activities.map((a) => a.userId).filter((x): x is string => Boolean(x)))]
  const actors = await db.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, username: true, name: true },
  })
  const actorById = new Map(actors.map((a) => [a.id, a]))

  return NextResponse.json({
    stats,
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      email: u.email,
      role: u.role,
      provider: u.provider,
      faceRegistered: Boolean(u.faceHash),
      avatarUrl: u.avatarUrl,
      bio: u.bio,
      postCount: u._count.posts,
      likeCount: u._count.likes,
      commentCount: u._count.comments,
      activeSessions: u._count.sessions,
      createdAt: u.createdAt,
      lastSeenAt: u.lastSeenAt,
    })),
    activities: activities.map((a) => {
      const actor = a.userId ? actorById.get(a.userId) : undefined
      return {
        id: a.id,
        action: a.action,
        actionLabel: a.actionLabel,
        detail: a.detail,
        path: a.path,
        createdAt: a.createdAt,
        actorName: a.actorName ?? actor?.name ?? null,
        actorUsername: actor?.username ?? null,
      }
    }),
    actionLabels: ACTION_LABELS,
  })
}

export const dynamic = 'force-dynamic'
