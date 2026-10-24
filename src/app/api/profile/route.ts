import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, getCurrentUser, logActivity } from '@/lib/auth'

/** Simpan data-URL avatar sebagai BLOB tabel Asset → URL pendek /api/assets/<id>
 *  (feed tidak lagi membawa avatar base64 berulang setiap permintaan). */
async function storeAvatar(dataUrl: string): Promise<string> {
  const m = dataUrl.match(/^data:image\/([a-z0-9.+-]+);base64,(.+)$/)
  if (!m) return dataUrl
  const buf = Buffer.from(m[2], 'base64')
  const mimeByType: Record<string, string> = { jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp', avif: 'image/avif', heic: 'image/heic', heif: 'image/heif' }
  const asset = await db.asset.create({ data: { mime: mimeByType[m[1]] ?? 'image/jpeg', data: buf } })
  return `/api/assets/${asset.id}`
}

/** GET /api/profile — profil akun yang sedang masuk. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Belum masuk.' }, { status: 401 })
  const stats = {
    postCount: await db.post.count({ where: { userId: user.id } }),
    likeCount: await db.like.count({ where: { post: { userId: user.id } } }),
    commentCount: await db.comment.count({ where: { userId: user.id } }),
  }
  return NextResponse.json({ user: { ...user, ...stats } })
}

/** PUT /api/profile { name, bio, avatarUrl } */
export async function PUT(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Belum masuk.' }, { status: 401 })

  try {
    const body = await req.json()
    const data: { name?: string; bio?: string | null; avatarUrl?: string | null } = {}
    const changed: string[] = []

    if (typeof body.name === 'string' && body.name.trim().length >= 2) {
      data.name = body.name.trim()
      changed.push('name')
    }
    if (typeof body.bio === 'string') {
      data.bio = body.bio.trim().slice(0, 300)
      changed.push('bio')
    }
    if (typeof body.avatarUrl === 'string' || body.avatarUrl === null) {
      const av = body.avatarUrl
      if (av === null) {
        data.avatarUrl = null
        changed.push('avatarUrl')
      } else if (av.length <= 1_400_000 && /^data:image\//.test(av)) {
        data.avatarUrl = await storeAvatar(av)
        changed.push('avatarUrl')
      } else if (av.length > 1_400_000) {
        return NextResponse.json({ error: 'Foto profil terlalu besar (maks 1 MB).' }, { status: 413 })
      }
    }

    if (Object.keys(data).length === 0)
      return NextResponse.json({ error: 'Tidak ada perubahan.' }, { status: 400 })

    const user = await db.user.update({ where: { id: session.user.id }, data })

    await logActivity('PROFILE_UPDATE', 'Ubah Profil', {
      detail: changed.join(', '),
      userId: user.id,
      actorName: user.name,
    })

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        provider: user.provider,
        faceRegistered: Boolean(user.faceHash),
        avatarUrl: user.avatarUrl,
        bio: user.bio,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Gagal menyimpan profil.' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
