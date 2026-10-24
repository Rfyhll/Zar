/**
 * Migrasi penyimpanan gambar ke tabel Asset (BLOB di database).
 * - Post.imageUrl "/uploads/<file>"  → dibaca dari public/uploads → Asset → URL jadi /api/assets/<id>
 * - User.avatarUrl "data:image/..."  → Asset → /api/assets/<id> (payload feed jauh lebih ringan)
 * Aman dijalankan berulang (idempotent): hanya baris yang belum berbentuk /api/assets/ yang diproses.
 */
import { promises as fs } from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const MIME_BY_TYPE: Record<string, string> = {
  jpeg: 'image/jpeg', jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', bmp: 'image/bmp', avif: 'image/avif', heic: 'image/heic',
  heif: 'image/heif', tiff: 'image/tiff', 'svg+xml': 'image/svg+xml',
}

async function main() {
  // 1) Post /uploads/* → Asset
  const posts = await db.post.findMany({ where: { imageUrl: { startsWith: '/uploads/' } } })
  let movedPosts = 0
  for (const p of posts) {
    try {
      const file = path.join(process.cwd(), 'public', p.imageUrl) // public/uploads/xxx
      const buf = await fs.readFile(file)
      const ext = path.extname(p.imageUrl).slice(1).toLowerCase() || 'jpg'
      const mime = MIME_BY_TYPE[ext] ?? 'image/jpeg'
      const asset = await db.asset.create({ data: { mime, data: buf } })
      await db.post.update({ where: { id: p.id }, data: { imageUrl: `/api/assets/${asset.id}` } })
      movedPosts++
      console.log(`post ${p.id}: ${p.imageUrl} → /api/assets/${asset.id} (${mime}, ${buf.length}b)`)
    } catch (e) {
      console.warn(`post ${p.id}: GAGAL baca ${p.imageUrl} — dibiarkan (akan 404):`, (e as Error).message)
    }
  }

  // 2) Avatar data-URL → Asset
  const users = await db.user.findMany({ where: { avatarUrl: { startsWith: 'data:image/' } } })
  let movedAvatars = 0
  for (const u of users) {
    const m = u.avatarUrl!.match(/^data:image\/([a-z0-9.+-]+);base64,(.+)$/)
    if (!m) continue
    const buf = Buffer.from(m[2], 'base64')
    const mime = MIME_BY_TYPE[m[1]] ?? 'image/jpeg'
    const asset = await db.asset.create({ data: { mime, data: buf } })
    await db.user.update({ where: { id: u.id }, data: { avatarUrl: `/api/assets/${asset.id}` } })
    movedAvatars++
    console.log(`user ${u.username}: avatar → /api/assets/${asset.id} (${mime}, ${buf.length}b)`)
  }

  console.log(`\nSELESAI: ${movedPosts} postingan + ${movedAvatars} avatar dimigrasi ke tabel Asset.`)
}

main().finally(() => db.$disconnect())
