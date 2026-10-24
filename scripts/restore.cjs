/**
 * EcoDaur — Restore data dari backup.json ke database (PostgreSQL/Neon).
 *
 * Dipanggil otomatis oleh `npm run build` di Vercel:
 *   prisma generate && prisma db push --skip-generate && node scripts/restore.cjs && next build
 *
 * Sifat: IDEMPOTENT — aman dijalankan berulang.
 *  - Baris yang sudah ada (id sama) dilewati, jadi deploy ke-2 dst. tidak menduplikasi data.
 *  - Urutan insert mengikuti relasi FK: User dulu, baru Session/Post/Like/Comment.
 */
const { PrismaClient } = require('@prisma/client')
const path = require('path')

const backup = require(path.join(__dirname, 'backup.json'))

const db = new PrismaClient()

// [namaModel, field tanggal, field bytes]
const TABLES = [
  ['user', ['createdAt', 'lastSeenAt'], []],
  ['asset', ['createdAt'], ['data']],
  ['aboutPhoto', ['updatedAt'], []],
  ['session', ['createdAt', 'expiresAt'], []],
  ['post', ['createdAt'], []],
  ['like', ['createdAt'], []],
  ['comment', ['createdAt'], []],
  ['activity', ['createdAt'], []],
]

function convertRow(row, dateFields, byteFields) {
  const out = { ...row }
  for (const f of dateFields) {
    if (typeof out[f] === 'string') out[f] = new Date(out[f])
  }
  for (const f of byteFields) {
    if (typeof out[f] === 'string') out[f] = Buffer.from(out[f], 'base64')
  }
  return out
}

function chunk(arr, size) {
  const res = []
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size))
  return res
}

async function restoreTable(modelName, dateFields, byteFields) {
  const model = db[modelName]
  const rows = backup[modelName] || []

  // Baris yang sudah ada di DB -> dilewati (idempotent)
  const existing = await model.findMany({ select: { id: true } })
  const existingIds = new Set(existing.map((r) => r.id))
  const fresh = rows.filter((r) => !existingIds.has(r.id))

  if (fresh.length === 0) {
    console.log(`  ${modelName}: ${rows.length} baris di backup, ${existing.length} sudah ada di DB -> skip`)
    return 0
  }

  const dataSize = byteFields.length > 0 ? 10 : 100
  let inserted = 0
  for (const part of chunk(fresh, dataSize)) {
    const data = part.map((r) => convertRow(r, dateFields, byteFields))
    const res = await model.createMany({ data })
    inserted += res.count
  }
  console.log(`  ${modelName}: +${inserted} baris dimasukkan (dari ${rows.length} di backup, ${existing.length} sudah ada)`)
  return inserted
}

async function main() {
  console.log('=== RESTORE DATA ECODAUR ===')
  console.log(`Backup dibuat: ${backup._meta ? backup._meta.dumpedAt : '(tanpa meta)'}`)
  let total = 0
  for (const [name, dates, bytes] of TABLES) {
    try {
      total += await restoreTable(name, dates, bytes)
    } catch (err) {
      console.error(`  PERINGATAN: gagal restore tabel ${name}:`, err.message)
    }
  }
  console.log(`=== SELESAI — total ${total} baris baru dimasukkan ===`)
}

main()
  .catch((e) => {
    // Jangan gagalkan build karena data — aplikasi tetap jalan walau restore gagal
    console.error('RESTORE ERROR (build tetap lanjut):', e)
  })
  .finally(() => db.$disconnect())
