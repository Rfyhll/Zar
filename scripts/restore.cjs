/**
 * EcoDaur — Restore data dari backup.json ke database (PostgreSQL/Neon).
 *
 * Dipanggil otomatis oleh `npm run build` di Vercel:
 *   prisma generate && prisma db push --skip-generate && node scripts/restore.cjs && next build
 *
 * Sifat: IDEMPOTENT — aman dijalankan berulang.
 *  - Baris yang sudah ada (id sama) dilewati, jadi deploy ke-2 dst. tidak menduplikasi data.
 *  - Insert per-chunk: kalau satu chunk gagal (mis. bentrok unique), chunk lain tetap jalan.
 *  - TOP-UP: setelah restore, setiap post dijamin punya minimal suka & komentar, dan
 *    setiap produk dijamin punya minimal suka & ulasan — supaya komunitas & pasar tidak
 *    pernah tampak sepi walau data lama di DB tidak lengkap.
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
  // PASAR ECODAUR — urutan mengikuti relasi FK
  ['product', ['createdAt'], []],
  ['productLike', ['createdAt'], []],
  ['productComment', ['createdAt'], []],
  ['order', ['createdAt'], []],
]

/* ---------- komunitas: konten top-up bergaya netizen (Gen Z) ---------- */
const TOPUP_COMMENTS = [
  'GOKIL BANGET SIH INI 🔥🔥🔥',
  'keren kak, minta tutornya dong step by step',
  'wkwkwk kreatif parah, otak ini isi apaan sih 😂👍',
  'sumpah aesthetic banget, izin repost ya kak',
  'ini mah bukan sekadar daur ulang, ini seni',
  'baru gabung tapi udah fall in love sama feed sini',
  'worth it banget, akhirnya kresek di rumah ada gunanya',
  'yuk rame-rame jaga bumi 🌍💚',
]
const TOPUP_REVIEWS = [
  'barangnya rapi banget, packing aman, recommended seller! ⭐',
  'no way ini dari sampah?? keren parah 😱',
  'langsung repeat order deh, worth it!',
  'lucu banget, temen-temen pada nanya beli dimana 😂',
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

/** insert satu chunk; kalau gagal, coba per-baris supaya baris valid tetap masuk */
async function insertTolerant(model, rows) {
  try {
    const res = await model.createMany({ data: rows, skipDuplicates: true })
    return res.count
  } catch {
    let n = 0
    for (const r of rows) {
      try {
        await model.create({ data: r })
        n += 1
      } catch {} /* duplikat / FK error → lewati baris ini saja */
    }
    return n
  }
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
    inserted += await insertTolerant(model, part.map((r) => convertRow(r, dateFields, byteFields)))
  }
  console.log(`  ${modelName}: +${inserted} baris dimasukkan (dari ${rows.length} di backup, ${existing.length} sudah ada)`)
  return inserted
}

/* ======================= TOP-UP KOMUNITAS & PASAR ======================= */

const MIN_POST_LIKES = 5
const MIN_POST_COMMENTS = 2
const MIN_PRODUCT_LIKES = 3
const MIN_PRODUCT_COMMENTS = 1

async function topupCommunity() {
  const [posts, users, likes, comments] = await Promise.all([
    db.post.findMany({ select: { id: true, userId: true }, orderBy: { createdAt: 'asc' } }),
    db.user.findMany({ select: { id: true }, orderBy: { createdAt: 'asc' } }),
    db.like.findMany({ select: { postId: true, userId: true } }),
    db.comment.findMany({ select: { postId: true } }),
  ])
  const userIds = users.map((u) => u.id)
  if (userIds.length === 0 || posts.length === 0) return

  const likeCount = {}
  const likersOf = {}
  for (const l of likes) {
    likeCount[l.postId] = (likeCount[l.postId] || 0) + 1
    ;(likersOf[l.postId] = likersOf[l.postId] || new Set()).add(l.userId)
  }
  const cmtCount = {}
  for (const c of comments) cmtCount[c.postId] = (cmtCount[c.postId] || 0) + 1

  const now = Date.now()
  let newLikes = 0
  let newCmts = 0

  for (let pi = 0; pi < posts.length; pi++) {
    const post = posts[pi]
    const taken = likersOf[post.id] || new Set()

    // --- top-up suka ---
    let need = MIN_POST_LIKES - (likeCount[post.id] || 0)
    if (need > 0) {
      const rows = []
      for (let k = 0; k < userIds.length && need > 0; k++) {
        const uid = userIds[(pi * 7 + k * 3) % userIds.length]
        if (uid === post.userId || taken.has(uid)) continue
        taken.add(uid)
        rows.push({
          id: `toplike-${post.id}-${k}`,
          postId: post.id,
          userId: uid,
          createdAt: new Date(now - ((pi * 13 + k * 5) % 72) * 3600000),
        })
        need -= 1
      }
      if (rows.length) newLikes += await insertTolerant(db.like, rows)
    }

    // --- top-up komentar ---
    let needC = MIN_POST_COMMENTS - (cmtCount[post.id] || 0)
    if (needC > 0) {
      const rows = []
      for (let k = 0; k < userIds.length && needC > 0; k++) {
        const uid = userIds[(pi * 11 + k * 5 + 1) % userIds.length]
        if (uid === post.userId) continue
        rows.push({
          id: `topcmt-${post.id}-${k}`,
          postId: post.id,
          userId: uid,
          text: TOPUP_COMMENTS[(pi + k) % TOPUP_COMMENTS.length],
          createdAt: new Date(now - ((pi * 9 + k * 7) % 48) * 3600000),
        })
        needC -= 1
      }
      if (rows.length) newCmts += await insertTolerant(db.comment, rows)
    }
  }
  if (newLikes || newCmts) console.log(`  TOP-UP komunitas: +${newLikes} suka, +${newCmts} komentar`)
}

async function topupMarket() {
  const [products, users, likes, comments] = await Promise.all([
    db.product.findMany({ select: { id: true, sellerId: true }, orderBy: { createdAt: 'asc' } }),
    db.user.findMany({ select: { id: true }, orderBy: { createdAt: 'asc' } }),
    db.productLike.findMany({ select: { productId: true, userId: true } }),
    db.productComment.findMany({ select: { productId: true } }),
  ])
  const userIds = users.map((u) => u.id)
  if (userIds.length === 0 || products.length === 0) return

  const likeCount = {}
  const likersOf = {}
  for (const l of likes) {
    likeCount[l.productId] = (likeCount[l.productId] || 0) + 1
    ;(likersOf[l.productId] = likersOf[l.productId] || new Set()).add(l.userId)
  }
  const cmtCount = {}
  for (const c of comments) cmtCount[c.productId] = (cmtCount[c.productId] || 0) + 1

  const now = Date.now()
  let newLikes = 0
  let newCmts = 0

  for (let pi = 0; pi < products.length; pi++) {
    const prod = products[pi]
    const taken = likersOf[prod.id] || new Set()

    let need = MIN_PRODUCT_LIKES - (likeCount[prod.id] || 0)
    if (need > 0) {
      const rows = []
      for (let k = 0; k < userIds.length && need > 0; k++) {
        const uid = userIds[(pi * 5 + k * 7) % userIds.length]
        if (uid === prod.sellerId || taken.has(uid)) continue
        taken.add(uid)
        rows.push({
          id: `topplike-${prod.id}-${k}`,
          productId: prod.id,
          userId: uid,
          createdAt: new Date(now - ((pi * 11 + k * 3) % 96) * 3600000),
        })
        need -= 1
      }
      if (rows.length) newLikes += await insertTolerant(db.productLike, rows)
    }

    let needC = MIN_PRODUCT_COMMENTS - (cmtCount[prod.id] || 0)
    if (needC > 0) {
      const rows = []
      for (let k = 0; k < userIds.length && needC > 0; k++) {
        const uid = userIds[(pi * 13 + k * 5 + 2) % userIds.length]
        if (uid === prod.sellerId) continue
        rows.push({
          id: `toppcmt-${prod.id}-${k}`,
          productId: prod.id,
          userId: uid,
          text: TOPUP_REVIEWS[(pi + k) % TOPUP_REVIEWS.length],
          rating: 4 + ((pi + k) % 2),
          createdAt: new Date(now - ((pi * 7 + k * 11) % 60) * 3600000),
        })
        needC -= 1
      }
      if (rows.length) newCmts += await insertTolerant(db.productComment, rows)
    }
  }
  if (newLikes || newCmts) console.log(`  TOP-UP pasar: +${newLikes} suka, +${newCmts} ulasan`)
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

  // Jaminan komunitas & pasar tidak pernah tampak kosong
  try {
    await topupCommunity()
  } catch (err) {
    console.error('  PERINGATAN: top-up komunitas gagal:', err.message)
  }
  try {
    await topupMarket()
  } catch (err) {
    console.error('  PERINGATAN: top-up pasar gagal:', err.message)
  }
}

main()
  .catch((e) => {
    // Jangan gagalkan build karena data — aplikasi tetap jalan walau restore gagal
    console.error('RESTORE ERROR (build tetap lanjut):', e)
  })
  .finally(() => db.$disconnect())
