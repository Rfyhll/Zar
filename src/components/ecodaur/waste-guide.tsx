'use client'

import { useState } from 'react'
import {
  CupSoda, Newspaper, Wine, Cog, Shirt, Cpu, Recycle,
  ChevronDown, Droplets, Layers, Wind, Sparkles,
} from 'lucide-react'

interface JenisSampah {
  key: string
  title: string
  icon: typeof CupSoda
  level: string
  levelTone: string
  contoh: string[]
  ringkas: string
  redaksi: string[]
  jadi: string[]
  tips: string
}

const JENIS: JenisSampah[] = [
  {
    key: 'plastik',
    title: 'Plastik',
    icon: CupSoda,
    level: 'Mudah–Sedang',
    levelTone: 'bg-emerald-100 text-emerald-700',
    contoh: ['Botol air minum', 'Kemasan shampoo', 'Kresek', 'Wadah makanan'],
    ringkas:
      'Sampah paling banyak dijumpai sekaligus paling lama terurai — bisa ratusan tahun. Kuncinya: bersihkan, pilah berdasarkan jenisnya, dan jangan dicampur dengan sampah basah.',
    redaksi: [
      'Plastik adalah jenis sampah yang paling dominan kita temukan setiap hari, dan satu botol plastik butuh sekitar 450 tahun untuk terurai secara alami. Karena itu memilah plastik sejak dari rumah adalah langkah paling berdampak yang bisa kita lakukan.',
      'Cara memilahnya mudah: cuci botol dan wadah dari sisa isi sampai bersih, lalu lepas tutupnya karena tutup botol dan badan botol sering terbuat dari jenis plastik yang berbeda. Perhatikan juga angka daur ulang (1–7) di dasar kemasan — PET (1) dan HDPE (2) adalah jenis yang paling bernilai dan paling mudah didaur ulang.',
      'Kresek atau kantong plastik tipis justru tersulit diproses karena sering kotor dan tersangkut di mesin sortir, jadi lebih baik dikurangi penggunaannya atau dikumpulkan terpisah dalam kondisi bersih dan kering. Hindari menumpuk plastik bersama sisa makanan, karena satu kantong kotor bisa merusak tumpukan plastik bersih yang sudah dipilah.',
      'Setelah bersih dan kering, remukkan atau tumpuk botol agar menghemat tempat, lalu setorkan ke bank sampah atau bazar daur ulang terdekat. Plastik pilahan ini akan berubah menjadi bahan baku baru — bahkan menjadi media berkarya seperti pot gantung dan ecobrick yang sering kita bahas di EcoDaur.',
    ],
    jadi: ['Pot gantung', 'Ecobrick', 'Tas belanja', 'Pigura'],
    tips: 'Rempahkan botol sebelum disetor agar hemat tempat dan mudah diangkut.',
  },
  {
    key: 'kertas',
    title: 'Kertas & Kardus',
    icon: Newspaper,
    level: 'Mudah',
    levelTone: 'bg-lime-100 text-lime-700',
    contoh: ['Koran bekas', 'Buku lusuh', 'Kardus pengiriman', 'Dus makanan'],
    ringkas:
      'Jenis sampah paling ramah pemula — cukup keringkan, pipihkan, dan ikat. Kertas bisa didaur ulang 5–7 kali sebelum seratnya terlalu pendek.',
    redaksi: [
      'Kertas dan kardus adalah bahan daur ulang favorit pemula karena mudah dikumpulkan, tidak berbahaya, dan selalu ada permintaannya di bank sampah. Satu ton kertas daur ulang menyelamatkan sekitar 17 pohon dan ribuan liter air.',
      'Aturan utamanya cuma satu: jaga tetap kering. Kertas basah atau berminyak sulit diproses dan biasanya ditolak, jadi simpan di tempat tertutup sebelum disetorkan. Kardus sebaiknya dipipihkan dulu lalu diikat bertumpuk agar rapi dan hemat ruang.',
      'Pilah juga jenisnya: koran, buku, HVS, dan kardus dipisah karena nilai dan proses daur ulangnya berbeda. Kertas berlapis plastik (seperti kemasan susu UHT) atau kertas berlilin tidak masuk kategori ini — kumpulkan terpisah atau manfaatkan untuk kerajinan.',
      'Serat kertas akan semakin pendek setiap kali didaur ulang, sehingga kertas bisa "terlahir kembali" sekitar 5–7 kali sebelum akhirnya dikomposkan. Di EcoDaur, kertas bekas bahkan menjadi bahan karya favorit — dari mawar koran sampai dekorasi dinding berlapis-lapis.',
    ],
    jadi: ['Mawar koran', 'Kertas daur ulang', 'Kotak penyimpan', 'Dekorasi dinding'],
    tips: 'Lepas stapler dan selotip dari kardus sebelum disetorkan agar seratnya bersih.',
  },
  {
    key: 'kaca',
    title: 'Kaca',
    icon: Wine,
    level: 'Sedang',
    levelTone: 'bg-sky-100 text-sky-700',
    contoh: ['Botol saus', 'Toples selai', 'Gelas pecah', 'Botol kosmetik'],
    ringkas:
      'Kaca bisa didaur ulang tanpa batas tanpa menurunkan kualitas — tapi wajib dipisahkan warnanya dan ditangani hati-hati saat pecah.',
    redaksi: [
      'Kaca adalah bahan daur ulang yang benar-benar tak lekang oleh waktu: ia bisa melebur dan dibentuk ulang berkali-kali tanpa kehilangan kualitas sedikit pun. Karena itu sayang sekali jika botol dan toples kaca berakhir di TPA.',
      'Sebelum disetorkan, cuci bersih sisa isinya dan lepas tutup logam atau plastiknya karena tutup diolah di jalur berbeda. Pilah pula berdasarkan warnanya — bening, hijau, dan cokelat — karena campuran warna akan menurunkan mutu kaca daur ulang.',
      'Kalau ada pecahan, jangan langsung dibuang begitu saja: bungkus dengan kertas tebal atau kardus, beri tanda "pecahan", dan jangan campur dengan sampah lain agar petugas tidak terluka.',
      'Perlu diingat, kaca pyrex, keramik, dan kaca mobil tidak bisa ikut didaur bersama kaca kemasan karena titik lelehnya berbeda. Toples dan botol utuh justru lebih berharga — bisa langsung dipakai ulang jadi vas, lampu hias, atau wadah penyimpan sebelum akhirnya didaur.',
    ],
    jadi: ['Vas bunga', 'Lampu hias', 'Toples penyimpan', 'Ubin mozaik'],
    tips: 'Bungkus pecahan kaca dengan kardus dan beri label agar petugas aman.',
  },
  {
    key: 'logam',
    title: 'Logam',
    icon: Cog,
    level: 'Mudah–Sedang',
    levelTone: 'bg-amber-100 text-amber-700',
    contoh: ['Kaleng minuman', 'Kaleng susu', 'Tutup botol', 'Kawat & paku'],
    ringkas:
      'Paling bernilai ekonomis! Mendaur aluminium menghemat hingga 95% energi dibanding memproduksi yang baru.',
    redaksi: [
      'Logam adalah "harta karun" di antara sampah rumahan — aluminium dan besi begitu bernilai sehingga hampir semua bank sampah dan pemulung menerima jenis ini. Mendaur ulang aluminium hanya butuh sekitar 5% energi dibanding memproduksi aluminium baru dari bijihnya.',
      'Sebelum disetor, bilas kaleng minuman dan kaleng susu dari sisa isinya lalu keringkan. Kaleng bisa ditindih atau diremahkan agar hemat tempat, sementara tutup botol kecil dikumpulkan dalam kaleng bekas supaya tidak berserakan.',
      'Cara cepat membedakan jenisnya: tempelkan magnet — jika menempel berarti besi (ferro), jika tidak berarti aluminium atau logam non-ferro yang nilainya lebih tinggi. Kawat, paku, dan besi bekas juga termasuk kategori ini asal tidak menyatu dengan bahan lain.',
      'Hindari menyetorkan kaleng aerosol (semprot) yang masih berisi, baterai, atau kaleng berisi bahan kimia — itu masuk kategori B3 dan butuh jalur berbeda. Kaleng kosong yang bersih akan melebur kembali menjadi kaleng, rangka sepeda, bahkan lampu hias karya kreator EcoDaur.',
    ],
    jadi: ['Lampu kaleng', 'Pot bunga', 'Mainan roda', 'Bingkai foto'],
    tips: 'Tempel magnet untuk membedakan besi (menempel) dan aluminium (tidak).',
  },
  {
    key: 'tekstil',
    title: 'Tekstil',
    icon: Shirt,
    level: 'Sedang',
    levelTone: 'bg-rose-100 text-rose-700',
    contoh: ['Kaos lusuh', 'Jeans', 'Sprei', 'Kain perca'],
    ringkas:
      'Limbah tekstil menumpuk di TPA setiap tahun. Yang masih layak didonasikan, yang lusuh diubah jadi kain lap, tas, atau karpet.',
    redaksi: [
      'Industri fashion menghasilkan jutaan ton limbah tekstil setiap tahun, dan sebagian besar berakhir menumpuk di TPA karena orang bingung harus membuangnya ke mana. Padahal hampir semua kain masih punya nilai jika dipilah dengan benar.',
      'Aturan praktisnya: pakaian yang masih layak dipakai sebaiknya didonasikan atau dijual ulang, bukan didaur. Barulah yang benar-benar lusuh, robek, atau kena noda permanen yang masuk jalur daur ulang — diubah menjadi kain lap, isian bantal, atau bahan kerajinan.',
      'Sebelum mengumpulkan, cuci dulu dan pisahkan berdasarkan jenis kainnya: katun lebih mudah didaur dibanding campuran elastane atau polyester. Lepas juga kancing, zipper, dan aksesoris lain — bahan logam kecil ini bisa dipakai ulang untuk jahitan berikutnya.',
      'Di EcoDaur, tekstil bekas adalah bahan baku favorit: kaos lusuh bisa jadi tote bag tanpa jahitan, kain perca dianyam jadi karpet, dan jeans tua berubah jadi keset tebal yang tahan lama. Kreatif dulu, buang belakangan.',
    ],
    jadi: ['Tas kaos', 'Karpet perca', 'Keset jeans', 'Kain lap'],
    tips: 'Cuci dan keringkan dulu sebelum disimpan agar tidak bau dan berjamur.',
  },
  {
    key: 'elektronik',
    title: 'Elektronik & B3',
    icon: Cpu,
    level: 'Penanganan Khusus',
    levelTone: 'bg-red-100 text-red-700',
    contoh: ['HP rusak', 'Kabel & charger', 'Baterai', 'Lampu neon & aeresol'],
    ringkas:
      'Mengandung timbal, raksa, dan bahan berbahaya lain — jangan dibuang ke sampah biasa. Serahkan ke TPS B3 atau program drop-off resmi.',
    redaksi: [
      'Sampah elektronik (e-waste) dan B3 (Bahan Berbahaya dan Beracun) adalah kategori paling kritis: satu ponsel mengandung timbal, merkuri, dan kadmium yang bisa meresap ke tanah dan air kalau dibuang sembarangan. Di sisi lain, di dalamnya juga tersimpan logam berharga seperti emas, perak, dan tembaga yang layak dipulihkan.',
      'Karena itu prinsipnya jelas: jangan pernah dicampur ke sampah rumah biasa. Kumpulkan terpisah di wadah khusus, lalu serahkan ke TPS B3, bank sampah yang menerima e-waste, atau program drop-off yang sering diadakan produsen elektronik dan bank sampah besar.',
      'Untuk baterai dan power bank, hati-hati dengan risiko terbakar — tutup terminalnya dengan lakban dan jangan ditumpuk bersama benda logam. Kalau mau menyerahkan ponsel atau laptop, hapus dulu semua data pribadinya dan lakukan factory reset.',
      'Lampu neon, kaleng aerosol, obat kadaluarsa, dan cat sisa juga masuk kategori B3 dengan perlakuan serupa. Dengan menyerahkan ke jalur yang benar, komponen berharganya dipulihkan kembali dan bahan berbahayanya diisolasi — melindungi lingkungan sekaligus kesehatan petugas sampah.',
    ],
    jadi: ['Logam dipulihkan', 'Aksesori kabel', 'Komponen refurbished'],
    tips: 'Hapus data pribadi perangkat dulu sebelum diserahkan ke jalur daur ulang.',
  },
]

const LANGKAH = [
  { icon: Droplets, title: 'Bersihkan', desc: 'Bilas botol, kaleng, dan wadah dari sisa isi sampai bebas kotoran.' },
  { icon: Layers, title: 'Pilah', desc: 'Pisahkan berdasarkan jenis dan warnanya — jangan dicampur dalam satu kantong.' },
  { icon: Wind, title: 'Keringkan', desc: 'Simpan dalam kondisi kering agar tidak berjamur dan nilainya tetap tinggi.' },
  { icon: Recycle, title: 'Setorkan', desc: 'Antar ke bank sampah, bazar daur ulang, atau TPS B3 sesuai jenisnya.' },
]

/** Section "Kenali Jenis Sampah" — panduan pilah sebelum didaur ulang di Beranda. */
export default function WasteGuide() {
  const [open, setOpen] = useState<string | null>('plastik')

  return (
    <section id="jenis-sampah" className="scroll-mt-20 border-t border-emerald-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            <Recycle className="size-3.5" /> Panduan Memilah
          </span>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">
            Kenali Jenis Sampahmu Sebelum Didaur Ulang
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-emerald-900/70">
            Daur ulang yang berhasil dimulai dari satu kebiasaan sederhana: memilah dengan benar. Setiap jenis
            sampah punya aturan mainnya sendiri — kenali dulu, baru olah. Klik kartu di bawah untuk membaca
            penjelasan lengkapnya.
          </p>
        </div>

        {/* 4 langkah persiapan */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LANGKAH.map(({ icon: Icon, title, desc }, i) => (
            <div key={title} className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/25">
                  <Icon className="size-4" />
                </span>
                <div>
                  <div className="text-sm font-black text-emerald-950">
                    {i + 1}. {title}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Langkah {i + 1}</div>
                </div>
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-emerald-900/65">{desc}</p>
            </div>
          ))}
        </div>

        {/* 6 kartu jenis */}
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {JENIS.map((j) => {
            const expanded = open === j.key
            const Icon = j.icon
            return (
              <div
                key={j.key}
                className={`flex flex-col rounded-3xl border bg-white p-5 shadow-sm transition ${
                  expanded ? 'border-emerald-300 shadow-lg shadow-emerald-900/10' : 'border-emerald-100 hover:border-emerald-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/25">
                    <Icon className="size-5" />
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${j.levelTone}`}>{j.level}</span>
                </div>
                <h3 className="mt-3 text-base font-black text-emerald-950">{j.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-emerald-900/65">{expanded ? '' : j.ringkas}</p>

                {!expanded && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {j.contoh.slice(0, 3).map((c) => (
                      <span key={c} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                {expanded && (
                  <div className="mt-2 space-y-2.5">
                    {j.redaksi.map((par, i) => (
                      <p key={i} className="text-xs leading-relaxed text-emerald-900/75">
                        {par}
                      </p>
                    ))}
                    <div className="rounded-2xl bg-emerald-50/70 p-3">
                      <p className="text-[11px] font-black text-emerald-800">Daur ulang jadi…</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {j.jadi.map((x) => (
                          <span key={x} className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-emerald-700 shadow-sm">
                            {x}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="flex items-start gap-1.5 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/30 p-3 text-[11px] leading-relaxed text-emerald-800">
                      <Sparkles className="mt-0.5 size-3.5 shrink-0" /> {j.tips}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setOpen(expanded ? null : j.key)}
                  className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-black text-emerald-600 transition hover:text-emerald-500"
                >
                  {expanded ? 'Tutup penjelasan' : 'Baca penjelasan lengkap'}
                  <ChevronDown className={`size-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
            )
          })}
        </div>

        <p className="mt-6 rounded-2xl bg-emerald-50/60 px-4 py-3 text-center text-xs leading-relaxed text-emerald-900/60">
          Masih ragu jenis sampahmu masuk kategori mana? Coba cari di{' '}
          <button
            onClick={() => document.getElementById('tutorial')?.scrollIntoView({ behavior: 'smooth' })}
            className="font-black text-emerald-700 hover:underline"
          >
            tutorial EcoDaur
          </button>{' '}
          — atau tanyakan di komunitas, anggota kami siap membantu memilah dengan benar.
        </p>
      </div>
    </section>
  )
}
