# 🌱 EcoDaur — Komunitas Daur Ulang Kreatif

Website komunitas karya EcoDaur milik **Rahil Azwar**. Dibangun dengan **Next.js 16 + TypeScript + Tailwind CSS + Prisma**.

Fitur utama:
- 🎬 Halaman loading sambutan dengan suara *"Welcome to EcoDaur"* (Web Speech API)
- 🔐 Login: password, **scan wajah biometrik** (signature 32×32 disimpan di database — bukan foto), Google (mock)
- 🛡️ **Portal Admin** (kode gerbang + khusus administrator)
- 🖼️ **Komunitas & Feed Karya** — unggah karya (foto jenis apa pun sampai 3 MB), suka, komentar
- 🏆 **Pameran Komunitas** di Beranda dengan podium **Juara 1 / 2 / 3** undian karya terbaik
- 📚 12 tutorial daur ulang, panduan jenis sampah, halaman Tentang (foto bisa dikelola admin)
- 📊 Konsol admin: statistik, kelola pengguna (paksa keluar), aktivitas terbaru

---

## 1. Menjalankan di Visual Studio Code

### Prasyarat
- **Node.js 20 atau lebih baru** → unduh di https://nodejs.org (cek dengan `node -v`)
- VS Code + terminal bawaan (Terminal → New Terminal)

### Langkah
```bash
# 1. Ekstrak ZIP ini, lalu buka foldernya di VS Code
# 2. Di terminal VS Code:
npm install                # pasang semua dependensi (5–10 menit pertama kali)
npx prisma generate        # siapkan klien database

# 3. Buat file .env (atau salin dari .env.example) berisi:
#    DATABASE_URL="file:../db/custom.db"

# 4. Jalankan:
npm run dev
```
Buka **http://localhost:3000** 🎉

> 💡 **Database sudah ikut dalam paket** (`db/custom.db`) lengkap dengan 28 pengguna,
> 18 karya, komentar, suka, dan semua gambar — jadi tidak perlu seed ulang.

### Akun untuk mencoba
| Akun | Username | Password | Keterangan |
|---|---|---|---|
| Administrator | `admin` | `admin123` | Masuk → langsung ke Portal Admin (menu Admin muncul) |
| Pengguna biasa | `rina_hijau` | `demo1234` | Contoh anggota komunitas |
| Kode gerbang Portal Admin | — | `RAHIL-ECO-777` | Diminta saat menekan tombol "Admin Portal" |

---

## 2. Database yang Dipakai?

**SQLite** — dikelola lewat **Prisma ORM**.

- Database-nya **satu berkas fisik**: `db/custom.db`
- Skema tabel ada di `prisma/schema.prisma` (User, Session, Post, Like, Comment, Activity, AboutPhoto, **Asset**)
- **Semua foto unggahan (karya, avatar) disimpan DI DALAM database** (tabel `Asset`, tipe BLOB)
  dan tersaji lewat `/api/assets/<id>` — bukan di folder `public/`. Inilah sebabnya gambar
  tidak akan rusak saat dipindah komputer maupun saat di-hosting: **cukup pindahkan 1 berkas
  `db/custom.db`, semua ikut.**
- Melihat isi database: pasang ekstensi VS Code **SQLite Viewer**, atau pakai
  [DB Browser for SQLite](https://sqlitebrowser.org/) (gratis).

Perintah Prisma yang berguna:
```bash
npx prisma studio        # buka GUI kelola database di browser
npx prisma db push       # terapkan perubahan skema ke db/custom.db
```

---

## 3. Cara Hosting

> ⚠️ Aturan penting: karena database-nya SQLite (berkas), hostingnya **harus punya
> penyimpanan persisten**. Pilih salah satu opsi di bawah.

### Opsi A — VPS (paling direkomendasikan: murah & SQLite aman)
Contoh VPS Ubuntu dari penyedia mana pun (Niagahoster, IDCloudHost, DigitalOcean, dst.):

```bash
# di VPS (Ubuntu):
sudo apt update && sudo apt install -y nodejs npm nginx
# Node 20+: https://github.com/nodesource/distributions/blob/master/README.md

# 1. unggah proyek (scp / git clone), lalu:
cd ecodaur
npm install
npx prisma generate
npm run build                       # hasilnya folder .next/standalone
PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js   # situs jalan di port 3000

# 2. biarkan jalan permanen dengan pm2:
sudo npm i -g pm2
pm2 start ".next/standalone/server.js" --name ecodaur -- --port 3000
pm2 save && pm2 startup

# 3. arahkan domain + SSL dengan nginx & certbot (reverse proxy ke port 3000)
```

### Opsi B — Railway / Render (tanpa VPS, ada disk persisten)
1. Push proyek ini ke **GitHub** (buat repo, upload folder ini).
2. Di **Railway** (railway.app) atau **Render**: New Project → Deploy from GitHub.
3. Build command: `npm install && npx prisma generate && npm run build`
   Start command: `node .next/standalone/server.js`
4. Tambahkan **Volume** yang di-mount ke `/app/db` (agar `db/custom.db` tidak hilang saat redeploy)
   dan set Environment Variable `DATABASE_URL=file:../db/custom.db`.
5. Deploy — dapat URL publik gratis (`.up.railway.app` / `.onrender.com`).

### Opsi C — Vercel / Netlify (gratis, tapi wajib ganti database)
SQLite tidak persisten di Vercel, jadi database dipindah ke **Postgres cloud gratis** (Neon/Supabase):
1. Buat database gratis di **neon.tech** → salin connection string.
2. Ubah `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"   // sebelumnya "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
3. Set `DATABASE_URL` di Vercel = connection string Neon, jalankan `npx prisma db push`, deploy.
   Karena gambar tersimpan **di dalam database** (tabel Asset), perpindahan ini mulus tanpa
   perlu penyimpanan file tambahan. (Catatan: data SQLite lama perlu dimigrasi sekali ke Postgres —
   bisa lewat `npx prisma studio` atau minta bantuan saya lagi 😄)

---

## 4. Struktur Proyek (ringkas)

```
ecodaur/
├── db/custom.db              ← DATABASE SQLite (semua data + gambar)
├── prisma/schema.prisma      ← skema tabel
├── public/gallery, hero      ← gambar statis bawaan
├── src/
│   ├── app/page.tsx          ← halaman utama (splash, view switching)
│   ├── app/api/              ← REST API (auth, posts, assets, profile, admin, …)
│   ├── components/ecodaur/   ← semua komponen UI (splash, komunitas, admin, dll.)
│   └── lib/                  ← auth, database, pengolahan gambar
├── scripts/                  ← util (seed data sosial, migrasi gambar)
├── .env                      ← DATABASE_URL
└── package.json
```

## 5. Catatan Teknis
- Unggahan gambar: maks 3 MB, semua format (`image/*`, termasuk GIF animasi & HEIC).
- Scan wajah **tidak menyimpan foto** — hanya vektor angka 32×32 (hash) di kolom `User.faceHash`.
- Suara sapaan memakai Web Speech API bawaan browser (Chrome/Edge paling bagus); bila browser
  memblokir autoplay, cukup ketuk layar sekali untuk mendengar sapaan.
- Gerbang admin: kode `RAHIL-ECO-777` → lalu login `admin / admin123`.
