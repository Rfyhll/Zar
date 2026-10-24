'use client'

import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Play, X, Wrench, Clock, Eye, ExternalLink, Youtube } from 'lucide-react'
import { TUTORIALS } from '@/data/tutorials'

const LEVEL_STYLE: Record<string, string> = {
  Mudah: 'bg-emerald-100 text-emerald-700',
  Sedang: 'bg-amber-100 text-amber-700',
  Menantang: 'bg-rose-100 text-rose-700',
}

export default function TutorialDialog({ slug, onClose }: { slug: string; onClose: () => void }) {
  const tutorial = TUTORIALS.find((t) => t.slug === slug)
  const [playing, setPlaying] = useState(false)
  const loggedRef = useRef(false)

  useEffect(() => {
    if (slug && !loggedRef.current) {
      loggedRef.current = true
      fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TUTORIAL_VIEW', detail: slug }),
      }).catch(() => {})
    }
  }, [slug])

  if (!tutorial) return null

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg overflow-hidden rounded-3xl border-emerald-100 p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{tutorial.title}</DialogTitle>
          <DialogDescription>{tutorial.description}</DialogDescription>
        </DialogHeader>

        <div className="relative aspect-video bg-emerald-950">
          {playing ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${tutorial.youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
              title={tutorial.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          ) : (
            <button
              onClick={() => setPlaying(true)}
              className="group relative block h-full w-full"
              aria-label={`Putar video ${tutorial.title}`}
            >
              { }
              <img
                src={`https://i.ytimg.com/vi/${tutorial.youtubeId}/hqdefault.jpg`}
                alt=""
                className="h-full w-full object-cover"
              />
              <span className="absolute inset-0 grid place-items-center bg-emerald-950/20 transition group-hover:bg-emerald-950/30">
                <span className="grid size-16 place-items-center rounded-full bg-emerald-600 text-white shadow-2xl transition group-hover:scale-110">
                  <Play className="ml-1 size-7 fill-current" />
                </span>
              </span>
            </button>
          )}
        </div>

        <div className="max-h-[42vh] overflow-y-auto p-6 pt-4">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className={`rounded-full px-2.5 py-1 ${LEVEL_STYLE[tutorial.difficulty] ?? 'bg-emerald-100 text-emerald-700'}`}>
              {tutorial.difficulty}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
              <Clock className="size-3" /> {tutorial.duration}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
              <Eye className="size-3" /> {tutorial.views} tayangan
            </span>
          </div>

          <h3 className="mt-3 text-lg font-black text-emerald-950">{tutorial.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-emerald-900/70">{tutorial.description}</p>

          <div className="mt-4 rounded-2xl bg-emerald-50/70 p-4">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-emerald-800">
              <Wrench className="size-3.5" /> Alat & Bahan
            </div>
            <ul className="mt-2 grid gap-1.5 text-sm text-emerald-900/80">
              {tutorial.materials.map((m) => (
                <li key={m} className="flex items-start gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                  {m}
                </li>
              ))}
            </ul>
          </div>

          <a
            href={`https://www.youtube.com/watch?v=${tutorial.youtubeId}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-600 hover:underline"
          >
            <Youtube className="size-4" /> Tonton di YouTube <ExternalLink className="size-3" />
          </a>
        </div>

        <button
          onClick={onClose}
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-emerald-950/60 text-white transition hover:bg-emerald-950/80"
          aria-label="Tutup"
        >
          <X className="size-4" />
        </button>
      </DialogContent>
    </Dialog>
  )
}
