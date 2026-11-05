'use client'

/**
 * Error boundary tingkat app — jika ada crash JavaScript, tampilkan layar
 * ramah dengan tombol muat ulang, BUKAN layar error gelap bawaan Chrome
 * ("This page couldn't load") yang bikin user panik.
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-screen place-items-center bg-emerald-50 px-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-4">
        <div className="grid size-16 place-items-center rounded-full bg-emerald-100 text-3xl">🌱</div>
        <h1 className="text-xl font-black text-emerald-950">Ada kendala kecil di halaman ini</h1>
        <p className="text-sm leading-relaxed text-emerald-900/60">
          Tenang, datamu aman. Coba muat ulang halaman — kalau masih gagal, bersihkan cache
          browser lalu buka lagi.
        </p>
        <button
          onClick={reset}
          className="mt-2 h-11 rounded-full bg-emerald-600 px-8 text-sm font-black text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500"
        >
          Muat Ulang
        </button>
      </div>
    </div>
  )
}
