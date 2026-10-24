/**
 * Seed sosial EcoDaur — menambah banyak pengguna baru, karya, suka, dan
 * komentar bergaya netizen Indonesia (bahasa gaul) supaya komunitas terasa
 * hidup. Dijalankan sekali: bun scripts/seed-social.ts
 */
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const db = new PrismaClient({ log: [] })

/* ---------------- helpers ---------------- */
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

/** signature wajah dummy (vektor 32x32) — hanya untuk demo "wajah terdaftar" */
function dummyFace(seed: number): string {
  const rnd = crypto.createHash('sha256').update(String(seed)).digest()
  let s = seed
  const vec: number[] = []
  for (let i = 0; i < 1024; i++) {
    s = (s * 1103515245 + 12345) % 2147483648
    vec.push(Math.round((((s / 2147483648) * 2 - 1) + (rnd[i % rnd.length] - 128) / 255) * 100) / 100)
  }
  return JSON.stringify({ w: 32, h: 32, vec })
}

const daysAgo = (d: number, hourOffset = 0) => new Date(Date.now() - d * 86400000 + hourOffset * 3600000)
const minsAgo = (m: number) => new Date(Date.now() - m * 60000)

/* ---------------- 22 pengguna baru ---------------- */
const NEW_USERS: { username: string; name: string; bio: string; face?: number; lastSeenMin: number }[] = [
  { username: 'dimas.prakoso', name: 'Dimas Prakoso', bio: 'Pengrajin lampu dadakan. Kaleng bekas = canvas.', face: 1, lastSeenMin: 4 },
  { username: 'nadya.puspita', name: 'Nadya Puspita', bio: 'Pecinta kertas. Koran lama jangan dibuang dulu!', face: 2, lastSeenMin: 26 },
  { username: 'bima.saputra', name: 'Bima Saputra', bio: 'Siswa SMK otomotif, hobi bikin mainan dari botol.', lastSeenMin: 120 },
  { username: 'citra.larasati', name: 'Citra Larasati', bio: 'Ngajar PAUD siang, berkarya malam. Aesthetic-on-budget.', face: 3, lastSeenMin: 8 },
  { username: 'fajar.nugroho', name: 'Fajar Nugroho', bio: 'Bank sampah RW 05. Datang banyak, pulang bawa karya.', lastSeenMin: 2880 },
  { username: 'indah.permata', name: 'Indah Permatasari', bio: 'Zero waste enthusiast. Kantong kresek? No.', lastSeenMin: 720 },
  { username: 'yoga.adi', name: 'Yoga Adiputra', bio: 'Ojol siang, crafter malam. Sawah juga guru daur ulang.', lastSeenMin: 45 },
  { username: 'mega.silvi', name: 'Mega Silviana', bio: 'Baru gabung tapi udah kecanduan bikin ecobrick.', lastSeenMin: 1500 },
  { username: 'rizky.febr', name: 'Rizky Febrian', bio: 'Bokek itu mitos kalau kamu bisa bikin sendiri.', lastSeenMin: 500 },
  { username: 'tania.wijaya', name: 'Tania Wijaya', bio: 'Ibu rumah tangga 3 anak. Dapur = workshop.', face: 4, lastSeenMin: 18 },
  { username: 'andi.mlana', name: 'Andi Maulana', bio: 'Fotografer amatiran yang suka motret karya bekas.', lastSeenMin: 4000 },
  { username: 'ratih.kumala', name: 'Ratih Kumalasari', bio: 'Jahit itu terapi. Jeans tua = bahan seumur hidup.', face: 5, lastSeenMin: 60 },
  { username: 'bagas.setia', name: 'Bagas Setiawan', bio: 'Tukang sol sepatu sekaligus tukang bikin rak kardus.', lastSeenMin: 900 },
  { username: 'lisa.arna', name: 'Lisa Arnawati', bio: 'Mahasiswi desain. Tugas akhir: upcycling fashion.', lastSeenMin: 200 },
  { username: 'habib.r', name: 'Habibur Rahman', bio: 'Pesantren boy. Lumbung sampah punya cerita.', lastSeenMin: 3400 },
  { username: 'sinta.nur', name: 'Sinta Nuriyah', bio: 'Suka bunga, suka bumi. Vas botol itu jodoh.', lastSeenMin: 55 },
  { username: 'eko.pras', name: 'Eko Prasetyo', bio: 'Bapak dua anak, kolektor tutup botol (bukannya pelit).', lastSeenMin: 110 },
  { username: 'wulan.safi', name: 'Wulan Safitri', bio: 'ESport player yang juga rajin compost. Balance.', lastSeenMin: 666 },
  { username: 'galih.perm', name: 'Galih Permana', bio: 'Komunitas sepeda. Spakbor dari kaleng itu keren tau.', lastSeenMin: 250 },
  { username: 'mira.aulia', name: 'Mira Aulia', bio: 'Penjual kopi, gelas plastik musuh bebuyutan.', face: 6, lastSeenMin: 12 },
  { username: 'taufik.h', name: 'Taufik Hidayat', bio: 'Guru prakarya. Murid-muridku juara lomba daur ulang.', lastSeenMin: 800 },
  { username: 'nazwa.nabila', name: 'Nazwa Nabila', bio: '15 tahun, suka seni, benci sampah nyampah sembarangan.', lastSeenMin: 95 },
]

/* ---------------- 13 karya baru ---------------- */
const NEW_POSTS: { img: string; caption: string; by: string; days: number }[] = [
  { img: '/gallery/tempat-pensil.jpg', caption: 'Tempat pensil dari botol bekas buat adik kelas. Dicat pakai cat air sisa tugas seni, lumayan lah ya buat pertama kali 😄', by: 'bima.saputra', days: 1 },
  { img: '/gallery/lampu-kaleng.jpg', caption: 'Lampu tidur dari kaleng susu + pola bintang dilubangin pakai paku. Malam-malam ruangannya langsung beda vibes. Tutorial lampu sendok di sini emang keren, aku modif versi kaleng.', by: 'dimas.prakoso', days: 2 },
  { img: '/gallery/tampah-koran.jpg', caption: 'Tampah buah dari koran lama yang dianyam. Awalnya buat ngisi waktu, sekarang malah dipakai tiap pagi belanja di pasar 🍎', by: 'tania.wijaya', days: 3 },
  { img: '/gallery/dompet-jeans.jpg', caption: 'Dompet mini dari celana jeans yang udah compang-camping. Saku belakangnya jadi tempat kartu. Jahitan pertama agak berantakan, yang kedua makin rapi!', by: 'ratih.kumala', days: 5 },
  { img: '/gallery/hiasan-kardus.jpg', caption: 'Dinding kamar akhirnya nggak kosong — bunga-bunga dari kardus sisa pindahan, dicat pastel. Modal: lem, cat, dan sabar 🌸', by: 'citra.larasati', days: 6 },
  { img: '/gallery/organizer-meja.jpg', caption: 'Organizer meja belajar dari gulungan kardus dibungkus komik lama. Pulpen, gunting, spidol semua kelihatan. Nggak beli apa-apa, 100% dari rumah.', by: 'nazwa.nabila', days: 8 },
  { img: '/gallery/mainan-botol.jpg', caption: 'Mobil-mobilan dari botol aqua buat adik adik sebelah rumah. Roda dari tutup botol, susur dari kardus. Mereka lomba sampe berantem wkwk', by: 'yoga.adi', days: 10 },
  { img: '/gallery/eco-brick.png', caption: 'Progres ecobrick minggu ini: 17 botol terisi! Bareng anak-anak karang taruna. Semangat pilah sampahnya, bumi nunggu 💪🌏', by: 'fajar.nugroho', days: 12 },
  { img: '/gallery/vase-kaca.png', caption: 'Vas ombre dari botol kaca sisa saus. Kuncup melati dari halaman langsung cantik. Kamar nyaman, dompet aman 🌿', by: 'sinta.nur', days: 15 },
  { img: '/gallery/keranjang-tenun.png', caption: 'Sesi anyam koran bareng anak-anak LesKa. Ribet di awal, ketawa di tengah, bangga di akhir. Ini hasil pertama kami!', by: 'taufik.h', days: 18 },
  { img: '/gallery/tote-bag.png', caption: 'Update tote bag kaos: sekarang ada saku dalam + tali serut. Langkah jahitnya ngikutin tutorial di EcoDaur, tinggal tambah imajinasi.', by: 'lisa.arna', days: 22 },
  { img: '/gallery/rak-kardus.png', caption: 'Rak komik v2. Lebih kuat karena pakai kardus dobel + lem tembak. Kardus pindahan ternyata lumbung furnitur 📚', by: 'bagas.setia', days: 27 },
  { img: '/gallery/pot-gantung.png', caption: 'Batch kedua pot gantung botol — kali ini 10 pot buat taman bibit komunitas. Pohon jeruk pertama udah masuk! 🌱', by: 'rina_hijau', days: 33 },
]

/* ---------------- komentar bahasa gaul netizen Indonesia ---------------- */
const COMMENTS: string[] = [
  'GOKIL BANGET SIH INI 🔥🔥🔥',
  'keren kak, minta tutornya dong step by step',
  'wkwkwk kreatif parah, otak ini isi apaan sih 😂👍',
  'aku udah nyoba, hasilnya 90% mirip (sisanya gagal 😭)',
  'mantap jiwa, langsung aku save',
  'asekkk baru tau ternyata segampang itu',
  'halu banget, ini beneran dari botol bekas?? ga nyangka',
  'worth it banget, akhirnya kresek di rumah ada gunanya',
  'gabut kemana-mana akhirnya nemu vibes gini, ikut gas 🔥',
  'sumpah aesthetic banget, izin repost ya kak',
  'kakak keren, adik iri, mama bangga 😭🙏',
  'bahan aja udah ada di rumah, tinggal eksekusi malam ini juga',
  'sadarsekarang sampah itu mahal ya kalau pintar ngelola',
  'tutorialnya jelas, bahkan abang-abang ojol bisa ikut 😂',
  'aku bikin versi pink, dijamin lebih cakep',
  'wih komunitasnya solid banget!',
  'next bikin apa lagi kak? penasaran 🤔',
  'ini potensi juara lomba, gas daftar dong',
  'alhamdulillah nemu ide buat tugas prakarya',
  'ini mah bukan sekadar daur ulang, ini seni',
  'yuk rame-rame jaga bumi 🌍💚',
  'baru gabung tapi udah fall in love sama feed sini',
  'siapa bilang barang bekas tak berguna? tunjukin deh 😤',
  'rapi banget jahitannya, tangan emas ini mah',
  'ini sih udah level buka lapak, gas jual kak 🤑',
  'semangat buat yang baru mulai daur ulang 💪',
  'namanya juga karya, kan bisa dari apa aja. keren!',
  'akhirnya ada yang relate sama hobi anehku 😭🤝',
  'coba bikin versi gede, pasti makin keren',
  'bookmark dulu, weekend ini eksekusi',
  'foto hasilnya cakep, backgroundnya juga estetik',
  'kuota ku habis gara-gara scroll feed ini, gpp sih 😂',
  'bikinin dong kak, bayar pake es teh 🥤',
  'ide bagus, ikut menyebar ke grup keluarga dulu',
  'semoga feed seperti ini yang rame di medsos, bukan drama',
  'keren, tapi saranku: hati-hati pakai gunung lem panas ya 🔥',
]

const ACTIVITY_LIKE = 'LIKE', ACTIVITY_COMMENT = 'COMMENT', ACTIVITY_POST = 'POST_CREATE'
const ACTIVITY_VIEW = 'VIEW_PAGE', ACTIVITY_TUTORIAL = 'TUTORIAL_VIEW', ACTIVITY_LOGIN = 'LOGIN_PASSWORD'

async function main() {
  /* 0. bersihkan sisa user uji sebelumnya */
  const stale = await db.user.findMany({ where: { username: { startsWith: 'wajhtest' } } })
  for (const u of stale) {
    await db.like.deleteMany({ where: { userId: u.id } })
    await db.comment.deleteMany({ where: { userId: u.id } })
    await db.session.deleteMany({ where: { userId: u.id } })
    await db.activity.deleteMany({ where: { userId: u.id } })
    await db.post.deleteMany({ where: { userId: u.id } })
    await db.user.delete({ where: { id: u.id } })
  }
  if (stale.length) console.log(`bersihkan ${stale.length} user uji lama`)

  /* 1. idempoten: lewati kalau seed sudah pernah jalan */
  const exists = await db.user.findUnique({ where: { username: NEW_USERS[0].username } })
  if (exists) {
    console.log('seed-social sudah pernah dijalankan — lewati.')
    return
  }

  /* 2. buat user baru */
  const users: Record<string, { id: string; name: string; username: string }> = {}
  for (const u of NEW_USERS) {
    const created = await db.user.create({
      data: {
        username: u.username,
        name: u.name,
        email: null,
        passwordHash: hashPassword('demo1234'),
        role: 'USER',
        provider: 'CREDENTIALS',
        faceHash: u.face ? dummyFace(u.face * 7919) : null,
        bio: u.bio,
        createdAt: daysAgo(60 - NEW_USERS.indexOf(u)),
        lastSeenAt: minsAgo(u.lastSeenMin),
      },
    })
    users[u.username] = { id: created.id, name: created.name, username: created.username }
  }
  console.log(`+${NEW_USERS.length} user baru`)

  // user lama juga boleh ikut berkomentar
  for (const un of ['rina_hijau', 'adit.lampu', 'puji.kertas', 'sari.jarit', 'anwarkarawang133']) {
    const u = await db.user.findUnique({ where: { username: un } })
    if (u) users[un] = { id: u.id, name: u.name, username: u.username }
  }
  const allUsernames = Object.keys(users)

  /* 3. buat karya baru */
  const postIds: string[] = []
  for (const p of NEW_POSTS) {
    const createdAt = daysAgo(p.days, -Math.floor(Math.random() * 10))
    const post = await db.post.create({
      data: { imageUrl: p.img, caption: p.caption, userId: users[p.by].id, createdAt },
    })
    postIds.push(post.id)
    await db.activity.create({
      data: {
        action: ACTIVITY_POST,
        actionLabel: 'Unggah Karya',
        detail: `Membagikan karya baru: "${p.caption.slice(0, 60)}${p.caption.length > 60 ? '…' : ''}"`,
        userId: users[p.by].id,
        actorName: users[p.by].name,
        createdAt,
      },
    })
  }
  console.log(`+${NEW_POSTS.length} karya baru`)

  /* 4. suka — tiap karya 8-45 suka dari user acak */
  let likeCount = 0
  const existingLikes = new Set<string>()
  for (let i = 0; i < postIds.length; i++) {
    const postCreatedAt = daysAgo(NEW_POSTS[i].days)
    const shuffled = [...allUsernames].sort(() => Math.random() - 0.5)
    const n = 8 + Math.floor(Math.random() * 38)
    for (const un of shuffled.slice(0, n)) {
      const key = `${postIds[i]}:${users[un].id}`
      if (existingLikes.has(key)) continue
      existingLikes.add(key)
      try {
        const likedAt = new Date(postCreatedAt.getTime() + Math.random() * 3 * 86400000)
        await db.like.create({
          data: { postId: postIds[i], userId: users[un].id, createdAt: likedAt > new Date() ? new Date() : likedAt },
        })
        likeCount++
      } catch {
        /* unique constraint — aman diabaikan */
      }
    }
  }
  console.log(`+${likeCount} suka`)

  /* 5. komentar bahasa gaul — tiap karya 3-8 komentar */
  let commentCount = 0
  let commentSeed = 0
  for (let i = 0; i < postIds.length; i++) {
    const postCreatedAt = daysAgo(NEW_POSTS[i].days)
    const n = 3 + Math.floor(Math.random() * 6)
    const shuffled = [...allUsernames].sort(() => Math.random() - 0.5)
    for (let k = 0; k < n; k++) {
      const un = shuffled[k % shuffled.length]
      const text = COMMENTS[(commentSeed * 7 + k * 3 + i) % COMMENTS.length]
      commentSeed++
      const createdAt = new Date(postCreatedAt.getTime() + (0.5 + Math.random() * 4) * 86400000)
      if (createdAt > new Date()) continue
      await db.comment.create({
        data: { postId: postIds[i], userId: users[un].id, text, createdAt },
      })
      commentCount++
    }
  }
  console.log(`+${commentCount} komentar`)

  /* 6. jejak aktivitas — sebagian dalam 24 jam terakhir biar statistik hidup */
  const pageViews = ['/beranda', '/komunitas', '/profil', '/tentang']
  const tutorialTitles = ['Pot Gantung Botol Bekas', 'Lampu Sendok', 'Mawar Koran', 'Tote Bag Kaos', 'Ecobrick', 'Rak Kardus']
  for (let i = 0; i < 24; i++) {
    const un = allUsernames[Math.floor(Math.random() * allUsernames.length)]
    const u = users[un]
    const r = Math.random()
    const recent = i < 14 // 14 aktivitas dalam 24 jam terakhir
    const createdAt = recent ? minsAgo(10 + Math.floor(Math.random() * 1380)) : daysAgo(1 + Math.floor(Math.random() * 5))
    let data
    if (r < 0.4) {
      data = { action: ACTIVITY_LIKE, actionLabel: 'Suka Karya', detail: 'Menyukai karya di pameran komunitas', userId: u.id, actorName: u.name }
    } else if (r < 0.7) {
      data = { action: ACTIVITY_COMMENT, actionLabel: 'Komentar', detail: 'Memberi komentar pada karya komunitas', userId: u.id, actorName: u.name }
    } else if (r < 0.85) {
      data = { action: ACTIVITY_TUTORIAL, actionLabel: 'Lihat Tutorial', detail: `Menonton tutorial: ${tutorialTitles[i % tutorialTitles.length]}`, userId: u.id, actorName: u.name }
    } else if (r < 0.95) {
      data = { action: ACTIVITY_VIEW, actionLabel: 'Jelajah Halaman', detail: pageViews[i % pageViews.length], path: pageViews[i % pageViews.length], userId: u.id, actorName: u.name }
    } else {
      data = { action: ACTIVITY_LOGIN, actionLabel: 'Masuk (Password)', detail: `@${un} masuk lewat password`, userId: u.id, actorName: u.name }
    }
    await db.activity.create({ data: { ...data, createdAt } })
  }
  console.log('+24 jejak aktivitas')

  console.log('SEED SOSIAL SELESAI ✔')
  const total = {
    users: await db.user.count(),
    posts: await db.post.count(),
    likes: await db.like.count(),
    comments: await db.comment.count(),
  }
  console.log('TOTAL:', total)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
