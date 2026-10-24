'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/store'
import { TUTORIALS } from '@/data/tutorials'
import type { FeedPost } from '@/lib/types'
import { Sparkles, ArrowRight, Search, Play, Recycle, Users, Leaf, Heart, MessageCircle, Crown, Medal, Award } from 'lucide-react'
import TutorialDialog from './tutorial-dialog'
import WasteGuide from './waste-guide'

const CATEGORIES = ['Semua', 'Dekorasi', 'Kertas', 'Lampu', 'Furnitur', 'Lingkungan', 'Fashion', 'Dapur', 'Berkebun', 'Alat Tulis']

export default function BerandaView() {
  const setView = useApp((s) => s.setView)
  const postsVersion = useApp((s) => s.postsVersion)
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('Semua')
  const [openSlug, setOpenSlug] = useState<string | null>(null)
  const [pameran, setPameran] = useState<FeedPost[]>([])

  useEffect(() => {
    let alive = true
    fetch('/api/posts')
      .then((r) => r.json())
      .then((d) => {
        if (alive) setPameran(d.posts ?? [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [postsVersion])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return TUTORIALS.filter(
      (t) =>
        (cat === 'Semua' || t.category === cat) &&
        (!q ||
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.materials.some((m) => m.toLowerCase().includes(q)))
    )
  }, [query, cat])

  /* undian juara — karya dengan suka terbanyak menjadi Juara 1, dst. */
  const ranked = useMemo(
    () => [...pameran].sort((a, b) => b.likeCount - a.likeCount || b.comments.length - a.comments.length),
    [pameran]
  )
  const winners = ranked.slice(0, 3)
  const others = ranked.slice(3, 7)
  const RANK = [
    { label: 'Juara 1', Icon: Crown, badge: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-950 shadow-amber-500/40', ring: 'ring-2 ring-amber-400', bar: 'h-3 from-yellow-400 to-amber-500', elevate: 'md:-mt-5 md:order-2 z-10' },
    { label: 'Juara 2', Icon: Medal, badge: 'bg-gradient-to-r from-slate-200 to-slate-400 text-slate-800 shadow-slate-400/40', ring: 'ring-1 ring-slate-300', bar: 'h-2 from-slate-300 to-slate-400', elevate: 'md:mt-4 md:order-1' },
    { label: 'Juara 3', Icon: Award, badge: 'bg-gradient-to-r from-orange-300 to-amber-600 text-amber-950 shadow-amber-600/40', ring: 'ring-1 ring-orange-300', bar: 'h-1.5 from-orange-300 to-amber-600', elevate: 'md:mt-6 md:order-3' },
  ]

  return (
    <div className="pb-0">
      {/* ---------- HERO ---------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50 via-emerald-50/60 to-white">
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <Sparkles className="size-3.5" /> Komunitas Daur Ulang Kreatif
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.1] tracking-tight text-emerald-950 sm:text-5xl lg:text-[3.4rem]">
              Sampah Hari Ini,{' '}
              <span className="relative inline-block text-emerald-600">
                Karya Bikin Kaget
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 220 10" fill="none" aria-hidden>
                  <path d="M3 7C60 2 160 2 217 6" stroke="#34d399" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>{' '}
              Besok
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-emerald-900/70">
              EcoDaur adalah rumah bagi para kreator yang mengubah botol, kardus, dan koran bekas menjadi karya
              bernilai. Belajar dari video tutorial asli, bagikan karyamu, dan ajak sekitarmu peduli bumi.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                onClick={() => document.getElementById('tutorial')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:-translate-y-0.5 hover:bg-emerald-500"
              >
                Jelajahi Tutorial <ArrowRight className="size-4" />
              </button>
              <button
                onClick={() => setView('komunitas')}
                className="rounded-xl border-2 border-emerald-200 bg-white px-6 py-3.5 text-sm font-bold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                Lihat Pameran Komunitas
              </button>
              <button
                onClick={() => document.getElementById('jenis-sampah')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-3.5 text-sm font-bold text-emerald-700 underline-offset-4 transition hover:text-emerald-600 hover:underline"
              >
                Kenali Jenis Sampah <ArrowRight className="size-4" />
              </button>
            </div>
            <div className="mt-9 grid max-w-md grid-cols-3 gap-3">
              {[
                { icon: Recycle, value: '3,4 ton', label: 'Sampah Terolah' },
                { icon: Users, value: '856+', label: 'Anggota Aktif' },
                { icon: Leaf, value: '1,2 rb', label: 'Karya Dibuat' },
              ].map(({ icon: Icon, value, label }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-emerald-100 bg-white/70 p-3 text-center shadow-sm"
                >
                  <Icon className="mx-auto size-4 text-emerald-600" />
                  <div className="mt-1 text-lg font-black text-emerald-950">{value}</div>
                  <div className="text-[11px] font-medium text-emerald-900/60">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* kolase foto asli */}
          <div className="relative mx-auto hidden h-[420px] w-full max-w-lg sm:block">
            {[
              { src: '/hero/hero-1.png', cap: 'Sukarelawan memilah botol plastik', cls: 'left-0 top-6 w-[62%] -rotate-6 z-10' },
              { src: '/hero/hero-2.png', cap: 'Merangkai karya dari botol bekas', cls: 'right-0 top-0 w-[46%] rotate-3 z-20' },
              { src: '/hero/hero-3.png', cap: 'Pameran karya daur ulang komunitas', cls: 'bottom-0 left-1/4 w-[58%] rotate-1 z-30' },
            ].map(({ src, cap, cls }) => (
              <figure
                key={src}
                className={`absolute overflow-hidden rounded-2xl border-4 border-white bg-white shadow-2xl shadow-emerald-900/20 transition duration-300 hover:z-40 hover:rotate-0 hover:scale-[1.03] ${cls}`}
              >
                { }
                <img src={src} alt={cap} className="h-full w-full object-cover" />
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- TUTORIAL ---------- */}
      <section id="tutorial" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">
              Tutorial Video Asli
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-emerald-900/70">
              12 video tutorial kurasi untuk mengolah barang bekas jadi karya — dari level pemula sampai
              menantang.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-900/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari tutorial atau bahan…"
              className="w-64 rounded-xl border border-emerald-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                cat === c
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <button
              key={t.slug}
              onClick={() => setOpenSlug(t.slug)}
              className="group overflow-hidden rounded-2xl border border-emerald-100 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/10"
            >
              <div className="relative aspect-video overflow-hidden bg-emerald-950">
                { }
                <img
                  src={`https://i.ytimg.com/vi/${t.youtubeId}/hqdefault.jpg`}
                  alt={t.title}
                  loading="lazy"
                  className="h-full w-full object-cover opacity-90 transition group-hover:scale-105 group-hover:opacity-100"
                />
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid size-12 place-items-center rounded-full bg-emerald-600/90 text-white shadow-lg transition group-hover:scale-110">
                    <Play className="ml-0.5 size-5 fill-current" />
                  </span>
                </span>
                <span className="absolute bottom-2 left-2 rounded-md bg-emerald-950/80 px-2 py-1 text-[10px] font-bold text-emerald-100">
                  {t.category} · {t.difficulty}
                </span>
              </div>
              <div className="p-4">
                <h3 className="line-clamp-1 font-bold text-emerald-950">{t.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-emerald-900/60">{t.description}</p>
                <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-emerald-700">
                  <span>{t.duration}</span>
                  <span>▶ {t.views} tayangan</span>
                </div>
              </div>
            </button>
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="mt-10 text-center text-sm text-emerald-900/50">
            Tidak ada tutorial yang cocok. Coba kata kunci lain.
          </p>
        )}
      </section>

      {/* ---------- JENIS SAMPAH ---------- */}
      <WasteGuide />

      {/* ---------- PAMERAN + UNDIAN JUARA 1/2/3 ---------- */}
      <section className="border-y border-emerald-100 bg-gradient-to-b from-emerald-50/70 to-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
              <Crown className="size-3.5" /> Hasil Undian Karya Terbaik
            </span>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">Pameran Komunitas</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-emerald-900/70">
              Pengumuman juara 1, 2, dan 3 karya komunitas — ditentukan dari jumlah suka terbanyak. Klik untuk
              melihat lebih dekat.
            </p>
          </div>

          {winners.length > 0 ? (
            <div className="mt-8 grid items-start gap-5 md:grid-cols-3">
              {winners.map((p, idx) => {
                const r = RANK[idx]
                return (
                  <button
                    key={p.id}
                    onClick={() => setView('komunitas')}
                    className={`group relative overflow-hidden rounded-3xl border border-emerald-100 bg-white text-left shadow-xl shadow-emerald-900/10 transition hover:-translate-y-1 hover:shadow-2xl ${r.ring} ${r.elevate}`}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-emerald-50">
                      <img
                        src={p.imageUrl}
                        alt={p.caption}
                        loading="lazy"
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                      <span
                        className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wide shadow-lg ${r.badge}`}
                      >
                        <r.Icon className="size-3.5" /> {r.label}
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2">
                        {p.user.avatarUrl ? (
                          <img src={p.user.avatarUrl} alt="" className="size-8 rounded-full object-cover ring-2 ring-emerald-100" />
                        ) : (
                          <span className="grid size-8 place-items-center rounded-full bg-emerald-600 text-xs font-black text-white">
                            {p.user.name.charAt(0)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-emerald-950">{p.user.name}</div>
                          <div className="truncate text-[11px] font-semibold text-emerald-700">@{p.user.username}</div>
                        </div>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-emerald-900/60">{p.caption}</p>
                      <div className="mt-2.5 flex items-center gap-3 text-[11px] font-bold text-emerald-700">
                        <span className="inline-flex items-center gap-1">
                          <Heart className="size-3.5 fill-current" /> {p.likeCount} suka
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="size-3.5" /> {p.comments.length}
                        </span>
                      </div>
                      <div className={`mt-3 h-1.5 w-full rounded-full bg-gradient-to-r ${r.bar}`} />
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="mt-10 text-center text-sm text-emerald-900/50">
              Belum ada karya untuk dinilai. Jadilah yang pertama membagikan karyamu!
            </p>
          )}

          {others.length > 0 && (
            <div className="mt-10">
              <h3 className="text-sm font-black uppercase tracking-wide text-emerald-900/60">Karya Lainnya</h3>
              <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {others.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setView('komunitas')}
                    className="group overflow-hidden rounded-2xl border border-emerald-100 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="aspect-square overflow-hidden bg-emerald-50">
                      <img
                        src={p.imageUrl}
                        alt={p.caption}
                        loading="lazy"
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    </div>
                    <div className="p-3">
                      <div className="flex items-center gap-2">
                        {p.user.avatarUrl ? (
                          <img src={p.user.avatarUrl} alt="" className="size-6 rounded-full object-cover" />
                        ) : (
                          <span className="grid size-6 place-items-center rounded-full bg-emerald-600 text-[10px] font-black text-white">
                            {p.user.name.charAt(0)}
                          </span>
                        )}
                        <span className="truncate text-xs font-bold text-emerald-950">{p.user.name}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-xs text-emerald-900/60">{p.caption}</p>
                      <div className="mt-2 flex items-center gap-3 text-[11px] font-semibold text-emerald-700">
                        <span className="inline-flex items-center gap-1">
                          <Heart className="size-3" /> {p.likeCount}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="size-3" /> {p.comments.length}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 px-8 py-12 text-center text-white shadow-2xl shadow-emerald-900/30">
          <div className="pointer-events-none absolute -left-16 -top-16 size-56 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 size-64 rounded-full bg-emerald-300/20 blur-3xl" />
          <h2 className="text-2xl font-black sm:text-3xl">Punya karya dari barang bekas?</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-emerald-50/90">
            Bagikan ke komunitas, kumpulkan suka, dan inspirasi orang lain untuk mulai mengelola sampah dari
            rumah.
          </p>
          <button
            onClick={() => setView('komunitas')}
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-black text-emerald-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"
          >
            Bagikan Karyamu <ArrowRight className="size-4" />
          </button>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="border-t border-emerald-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-10 text-center">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
              <Recycle className="size-4" />
            </span>
            <span className="font-black text-emerald-950">
              Eco<span className="text-emerald-600">Daur</span>
            </span>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-emerald-900/60">
            Platform komunitas untuk mengelola sampah dan mengubahnya menjadi karya bernilai. Mulai dari rumah,
            berdampak untuk bumi.
          </p>
          <p className="mt-2 text-[11px] text-emerald-900/40">
            EcoDaur — Karya Rahil Azwar · Sampah hari ini adalah bahan karya besok.
          </p>
        </div>
      </footer>

      {openSlug && <TutorialDialog slug={openSlug} onClose={() => setOpenSlug(null)} />}
    </div>
  )
}
