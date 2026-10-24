import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, logActivity } from '@/lib/auth'

/** GET /api/activity — jejak aktivitas (khusus admin). */
export async function GET() {
  const session = await getCurrentSession()
  if (!session || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Hanya administrator EcoDaur.' }, { status: 403 })

  const activities = await db.activity.findMany({ orderBy: { createdAt: 'desc' }, take: 80 })
  return NextResponse.json({ activities })
}

/** POST /api/activity — catat aktivitas jelajah pengguna (VIEW_PAGE, TUTORIAL_VIEW). */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const action = String(body.action ?? '')
    const detail = typeof body.detail === 'string' ? body.detail.slice(0, 200) : null
    const path = typeof body.path === 'string' ? body.path.slice(0, 200) : null

    const allowed: Record<string, string> = {
      VIEW_PAGE: 'Jelajah Halaman',
      TUTORIAL_VIEW: 'Lihat Tutorial',
    }
    if (!allowed[action]) return NextResponse.json({ ok: false }, { status: 400 })

    const session = await getCurrentSession()
    await logActivity(action, allowed[action], {
      detail,
      path,
      userId: session?.user.id ?? null,
      actorName: session?.user.name ?? null,
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}

export const dynamic = 'force-dynamic'
