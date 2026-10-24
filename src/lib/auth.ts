import { cookies } from 'next/headers'
import crypto from 'crypto'
import { db } from '@/lib/db'

const SESSION_COOKIE = 'ecodaur_session'
const SESSION_DAYS = 30

/** SHA-256 dari kode enkripsi Portal Admin. Plaintext kode TIDAK disimpan di kode sumber. */
export const ADMIN_GATE_HASH = 'b9d5c69e53b96a5694315e6bfe39630989236aa4e35332864837d2172911e15a'

export function sha256(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex')
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const test = crypto.scryptSync(password, salt, 64)
  const orig = Buffer.from(hash, 'hex')
  if (test.length !== orig.length) return false
  return crypto.timingSafeEqual(test, orig)
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await db.session.create({ data: { token, userId, expiresAt } })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    expires: expiresAt,
    path: '/',
  })
  return token
}

export async function getCurrentSession() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value
    if (!token) return null
    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    })
    if (!session || session.expiresAt < new Date()) return null
    return session
  } catch {
    return null
  }
}

/** Bentuk user persis seperti API lama (/api/auth/me). */
export function publicUser(u: {
  id: string
  username: string
  name: string
  email: string | null
  role: string
  provider: string
  faceHash: string | null
  avatarUrl: string | null
  bio: string | null
}) {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    email: u.email,
    role: u.role,
    provider: u.provider,
    faceRegistered: Boolean(u.faceHash),
    avatarUrl: u.avatarUrl,
    bio: u.bio,
  }
}

export async function getCurrentUser() {
  const session = await getCurrentSession()
  if (!session) return null
  try {
    await db.user.update({
      where: { id: session.user.id },
      data: { lastSeenAt: new Date() },
    })
  } catch {
    // lastSeen tidak boleh menggagalkan request
  }
  return publicUser(session.user)
}

export async function destroySession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (token) {
    await db.session.deleteMany({ where: { token } })
    cookieStore.delete(SESSION_COOKIE)
  }
}

/** Catat aktivitas ke database (dilihat admin di konsol Admin). */
export async function logActivity(
  action: string,
  actionLabel: string,
  opts: { detail?: string; path?: string; userId?: string | null; actorName?: string | null } = {}
) {
  try {
    await db.activity.create({
      data: {
        action,
        actionLabel,
        detail: opts.detail ?? null,
        path: opts.path ?? null,
        userId: opts.userId ?? null,
        actorName: opts.actorName ?? null,
      },
    })
  } catch {
    // logging tidak boleh menggagalkan request utama
  }
}

/** Label Indonesia untuk semua aksi — bentuk sama seperti situs lama. */
export const ACTION_LABELS: Record<string, string> = {
  REGISTER: 'Pendaftaran',
  LOGIN_FACE: 'Masuk (Wajah)',
  LOGIN_PASSWORD: 'Masuk (Password)',
  LOGIN_GOOGLE: 'Masuk (Google)',
  ADMIN_LOGIN: 'Login Admin',
  ADMIN_GATE: 'Gerbang Admin',
  FORCE_LOGOUT: 'Paksa Keluar',
  LOGOUT: 'Keluar',
  VIEW_PAGE: 'Jelajah Halaman',
  POST_CREATE: 'Unggah Karya',
  LIKE: 'Suka Karya',
  UNLIKE: 'Batal Suka',
  COMMENT: 'Komentar',
  TUTORIAL_VIEW: 'Lihat Tutorial',
  PROFILE_UPDATE: 'Ubah Profil',
  ABOUT_UPDATE: 'Kelola Foto Tentang',
}

/* ---------------- Bio-signature wajah (privacy-friendly) ----------------
 * Template = vektor grayscale 32x32 ternormalisasi (mean 0, std 1).
 * Foto TIDAK disimpan — hanya angka signature, sehingga tidak bisa direkonstruksi.
 */
export interface FaceSignature {
  w: number
  h: number
  vec: number[]
}

export function parseFaceTemplate(raw: string | null): FaceSignature | null {
  if (!raw) return null
  try {
    const t = JSON.parse(raw) as FaceSignature
    if (!t || !Array.isArray(t.vec) || t.vec.length === 0) return null
    return t
  } catch {
    return null
  }
}

/** Kemiripan 0..1 dari dua signature (L1 ternormalisasi). */
export function faceSimilarity(a: FaceSignature, b: FaceSignature): number {
  const n = Math.min(a.vec.length, b.vec.length)
  if (n === 0) return 0
  let sum = 0
  for (let i = 0; i < n; i++) sum += Math.abs(a.vec[i] - b.vec[i])
  return Math.max(0, 1 - sum / (2 * n))
}

export const FACE_MATCH_THRESHOLD = 0.8
