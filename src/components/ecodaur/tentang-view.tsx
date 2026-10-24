'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '@/lib/store'
import { fileToResizedDataUrl } from '@/lib/image'
import { User as UserIcon, Camera, Loader2, Recycle, Heart, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

interface AboutPhoto {
  slot: number
  dataUrl: string | null
}

const CAPTIONS = ['Mengelola sampah', 'Berkarya dari bekas', 'Menginspirasi komunitas']

const CERITA =
  'EcoDaur lahir dari kebiasaan sederhana: menolong tetangga memilah botol plastik dan kardus bekas, lalu berpikir — "kenapa tidak diubah menjadi sesuatu yang berguna?" Dari satu pot botol, lampu tidur sendok, hingga tas tote kertas kaus tua, EcoDaur tumbuh jadi komunitas kreatif yang percaya bumi bisa diselamatkan satu karya demi satu karya.'

const MISI =
  'Misi pemilik website adalah membuat pengelolaan sampah terasa mudah, menyenangkan, dan bisa dimulai dari rumah — lewat tutorial nyata, pameran karya komunitas, dan fitur berbagi karya ala media sosial. Harapannya: setiap pengunjung pergi membawa setidaknya satu ide daur ulang yang siap dipraktikkan hari ini juga.'

export default function TentangView() {
  const user = useApp((s) => s.user)
  const [photos, setPhotos] = useState<AboutPhoto[]>([])
  const [busySlot, setBusySlot] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const activeSlot = useRef<number>(1)

  const load = useCallback(() => {
    fetch('/api/about')
      .then((r) => r.json())
      .then((d) => setPhotos(d.photos ?? []))
      .catch(() => {})
  }, [])

  useEffect(load, [load])

  async function upload(slot: number, f?: File) {
    if (!f) return
    setBusySlot(slot)
    try {
      const dataUrl = await fileToResizedDataUrl(f, 900, 0.8)
      const r = await fetch('/api/about', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot, dataUrl }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Gagal mengunggah.')
      toast.success('Foto pemilik website diperbarui.')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengunggah.')
    } finally {
      setBusySlot(null)
    }
  }

  const isAdmin = user?.role === 'ADMIN'
  const tilts = ['-rotate-2', 'rotate-1', '-rotate-1']

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
          <UserIcon className="size-6" />
        </span>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">
          Tentang Pemilik Website
        </h1>
        <p className="mt-2 text-sm text-emerald-900/60">
          Orang, cerita, dan nilai di balik EcoDaur — komunitas daur ulang kreatif.
        </p>
      </div>

      {isAdmin && (
        <p className="mx-auto mt-6 max-w-xl rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-xs font-semibold text-emerald-800">
          <Camera className="mr-1 inline size-3.5" />
          <b>Mode Admin:</b> klik ikon kamera pada foto untuk memasang foto pemilik asli (otomatis ter-crop &amp;
          dikompresi).
        </p>
      )}

      {/* tiga foto pemilik — kartu polaroid seperti situs lama */}
      <div className="mt-8 flex flex-wrap items-end justify-center gap-5">
        {[1, 2, 3].map((slot, i) => {
          const photo = photos.find((p) => p.slot === slot)
          return (
            <figure key={slot} className={`relative ${tilts[i]}`}>
              <button
                onClick={() => {
                  if (!isAdmin) return
                  activeSlot.current = slot
                  fileRef.current?.click()
                }}
                className={`relative block h-56 w-44 overflow-hidden rounded-2xl border-2 shadow-lg shadow-emerald-900/10 transition hover:z-10 hover:rotate-0 hover:scale-[1.04] sm:h-64 sm:w-52 ${
                  photo?.dataUrl
                    ? 'border-white bg-white'
                    : 'border-emerald-100 bg-gradient-to-br from-emerald-100 via-teal-50 to-lime-50'
                } ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {photo?.dataUrl ? (
                   
                  <img src={photo.dataUrl} alt={CAPTIONS[i]} className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full place-items-center">
                    <span className="flex flex-col items-center gap-2 text-emerald-500/70">
                      <ImageIcon className="size-8" />
                      <span className="text-[11px] font-semibold">Foto pemilik website</span>
                    </span>
                  </span>
                )}
                {busySlot === slot && (
                  <span className="absolute inset-0 grid place-items-center bg-emerald-950/40 text-white">
                    <Loader2 className="size-6 animate-spin" />
                  </span>
                )}
                {isAdmin && busySlot !== slot && (
                  <span className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-full bg-emerald-600 text-white shadow-md transition hover:bg-emerald-500">
                    <Camera className="size-4" />
                  </span>
                )}
              </button>
              <figcaption className="mt-2 text-center text-xs font-semibold text-emerald-900/70">
                {CAPTIONS[i]}
              </figcaption>
            </figure>
          )
        })}
      </div>

      {/* cerita + misi */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-6 shadow-sm">
          <h2 className="inline-flex items-center gap-2 text-sm font-black text-emerald-900">
            <Recycle className="size-4 text-emerald-600" /> Awal Cerita EcoDaur
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed text-emerald-900/75">{CERITA}</p>
        </div>
        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-6 shadow-sm">
          <h2 className="inline-flex items-center gap-2 text-sm font-black text-emerald-900">
            <Heart className="size-4 text-emerald-600" /> Misi &amp; Harapan
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed text-emerald-900/75">{MISI}</p>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.heic,.heif,.avif"
        className="hidden"
        onChange={(e) => upload(activeSlot.current, e.target.files?.[0])}
      />
    </div>
  )
}
