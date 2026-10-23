# PANDUAN HOSTING ECODAUR — Vercel + Neon (100% GRATIS, Data Permanen)

Panduan ini memindahkan EcoDaur dari SQLite ke PostgreSQL (Neon) dan hosting di Vercel.
Tidak perlu kartu kredit, tidak perlu bayar, data tidak hilang.

Yang kamu dapat setelah selesai:
- Website online dengan URL seperti `https://zar-xxx.vercel.app`
- Seluruh data lama otomatis ikut: 28 user, hash wajah yang sudah didaftarkan, 18 postingan, 295 like, 81 komentar
- Orang yang scan wajah / upload postingan baru → datanya TERSIMPAN PERMANEN di database Neon
- Tiap kali kamu upload kode baru ke GitHub → Vercel deploy otomatis

---

## File yang disediakan (di folder `ecodaur-vercel-update`)

| File | Upload ke mana di GitHub |
|------|--------------------------|
| `package.json` | folder utama (root) repo |
| `next.config.ts` | folder utama (root) repo |
| `prisma/schema.prisma` | folder `prisma` |
| `scripts/restore.cjs` | folder `scripts` |
| `scripts/backup.json` | folder `scripts` |

---

## LANGKAH A — Buat database gratis di Neon

1. Buka **https://neon.tech** → klik **Sign Up** → pilih **Continue with GitHub** (pakai akun GitHub-mu)
2. Setelah masuk, klik **Create project** (atau "New project")
   - Project name: `ecodaur`
   - Database name: biarkan default (`neondb`)
   - Region: biarkan default (US)
   - Klik **Create**
3. Akan muncul halaman koneksi (Connection string / "Connect").
   Di sana ada 2 jenis koneksi — kamu butuh KEDUANYA:
   - **POOLED connection** → host-nya mengandung tulisan `-pooler`
   - **DIRECT connection** → host-nya TANPA `-pooler`
4. Klik tombol copy di masing-masing, simpan sementara di Notepad:

   ```
   POOLED  = postgresql://user:password@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
   DIRECT  = postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

   Cara bedain: yang ada tulisan **-pooler** = POOLED, yang tidak ada = DIRECT.

> Jangan pernah bagikan connection string ini ke orang lain. Kalau bocor, ganti password di dashboard Neon (Reset password).

---

## LANGKAH B — Upload 5 file ke GitHub (repo Rfyhll/Zar)

Ekstrak dulu ZIP-nya. Lalu upload per folder — **masuk dulu ke foldernya di GitHub, baru drag file-nya**, supaya path-nya benar:

**B1. File root (2 file):**
1. Buka `github.com/Rfyhll/Zar`
2. Klik **Add file → Upload files**
3. Drag file `package.json` dan `next.config.ts` dari folder update
4. Klik **Commit changes**
   (GitHub otomatis menimpa file lama dengan yang baru)

**B2. Folder prisma (1 file):**
1. Di repo, buka folder **prisma** (klik nama foldernya)
2. Klik **Add file → Upload files**
3. Drag file `schema.prisma`
4. Klik **Commit changes**

**B3. Folder scripts (2 file):**
1. Kembali ke root repo, buka folder **scripts**
2. Klik **Add file → Upload files**
3. Drag file `restore.cjs` dan `backup.json`
4. Klik **Commit changes**

Selesai langkah B, di repo harus ada: `package.json` & `next.config.ts` (root, versi baru), `prisma/schema.prisma` (versi baru), `scripts/restore.cjs` dan `scripts/backup.json`.

---

## LANGKAH C — Deploy ke Vercel

1. Buka **https://vercel.com** → **Sign Up** → **Continue with GitHub** → izinkan akses ke repo
2. Di dashboard, klik **Add New → Project**
3. Cari repo **Zar** → klik **Import**
4. Biarkan semua setting default (Framework Preset otomatis terdeteksi: Next.js)
   - Root Directory: biarkan kosong
   - Build Command / Output: biarkan (otomatis dari package.json)
5. Buka bagian **Environment Variables**, isi 2 baris:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | (paste string POOLED dari Neon) |
   | `DIRECT_DATABASE_URL` | (paste string DIRECT dari Neon) |

6. Klik **Deploy**
7. Tunggu 2–5 menit. Build pertama akan otomatis:
   - Membuat semua tabel di Neon (`prisma db push`)
   - Memasukkan semua data lama dari `backup.json` (lihat di build log: "RESTORE DATA ECODAUR ... total 648 baris")
   - Build website
8. Kalau sukses, muncul tulisan **Congratulations!** + URL website-mu (misal `https://zar-xxx.vercel.app`)

---

## LANGKAH D — Tes website

1. Buka URL Vercel-mu
2. Login admin: gate **RAHIL-ECO-777** / user **admin** / pass **admin-admin123**
3. Cek galeri → 18 postingan lama harus muncul (termasuk gambarnya)
4. Upload 1 postingan baru dengan gambar → gambar harus tampil
5. Scan wajah dengan wajah yang sudah terdaftar → harus dikenali
6. Coba like + komentar → refresh halaman → datanya masih ada

Kalau semua jalan → **selesai! Data sekarang permanen di cloud, gratis.**

---

## Kalau ada error (Troubleshooting)

| Error di build log | Penyebab & solusi |
|---|---|
| `Environment variable not found: DIRECT_DATABASE_URL` | Env var belum diisi / salah ketik namanya. Cek persis: `DIRECT_DATABASE_URL` |
| `P1001: Can't reach database server` | Connection string salah salin. Salin ulang langsung dari Neon (jangan ketik manual). Pastikan diakhiri `?sslmode=require` |
| `P1003: Database does not exist` | Bagian akhir URL harus `neondb` — jangan sampai terpotong saat copy |
| RESTORE gagal / data kosong | Pastikan `backup.json` ada di folder `scripts` (bukan root). Cek di GitHub: `scripts/backup.json` |
| `Module not found` saat build | Ada file yang belum ke-upload. Cek 5 file di tabel atas |
| Website 500 semua | Tunggu 1 menit (koneksi pertama ke Neon agak lambat), lalu redeploy: tab Deployments → titik tiga → Redeploy |

---

## Catatan penting

- **Gratis selamanya untuk skala kamu**: Vercel Hobby + Neon Free. Tidak ada kartu kredit, tidak ada tagihan.
- **Neon Free tidak expired** (beda dengan database gratis Render yang mati 30 hari).
- **Update kode ke depannya**: tinggal upload/ubah file di GitHub → Vercel deploy otomatis. Tidak perlu deploy ulang manual.
- **Data baru orang-orang** (scan wajah, postingan, like, komentar) tersimpan di Neon dan **tidak hilang** walau website lama tidak dibuka berhari-hari.
- **Data lama di `db/custom.db`** di repo biarkan saja — itu cadangan (archive), aplikasi tidak memakainya lagi.
- **Jalankan di VS Code lokal tetap bisa**: isi `.env` dengan `DATABASE_URL` dan `DIRECT_DATABASE_URL` (string DIRECT dari Neon), lalu `npm install`, `npx prisma generate`, `npm run dev`. Database lokal dan cloud jadi satu dan sama.
- Website lama `hil200906.space-z.ai` tetap online sebagai cadangan sampai kapan pun.
