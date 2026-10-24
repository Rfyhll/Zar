'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '@/lib/store'
import { fileToResizedDataUrl, timeAgo } from '@/lib/image'
import type { FeedPost } from '@/lib/types'
import { Heart, MessageCircle, ImagePlus, Loader2, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

export default function KomunitasView() {
  const user = useApp((s) => s.user)
  const postsVersion = useApp((s) => s.postsVersion)
  const bumpPosts = useApp((s) => s.bumpPosts)
  const setView = useApp((s) => s.setView)

  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [caption, setCaption] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/posts')
      .then((r) => r.json())
      .then((d) => setPosts(d.posts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load, postsVersion])

  async function pickImage(f: File | undefined) {
    if (!f) return
    try {
      setImage(await fileToResizedDataUrl(f, 1200, 0.82))
    } catch {
      toast.error('Gagal membaca gambar.')
    }
  }

  async function submit() {
    if (!user) {
      toast.info('Masuk dulu untuk membagikan karyamu.')
      return
    }
    if (!image || !caption.trim()) {
      toast.error('Lengkapi foto dan cerita karyamu.')
      return
    }
    setSubmitting(true)
    try {
      const r = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, caption: caption.trim() }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Gagal membagikan.')
      toast.success('Karya berhasil dibagikan! 🎉')
      setCaption('')
      setImage(null)
      bumpPosts()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal membagikan.')
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleLike(p: FeedPost) {
    if (!user) {
      toast.info('Masuk dulu untuk menyukai karya.')
      return
    }
    const r = await fetch(`/api/posts/${p.id}/like`, { method: 'POST' })
    if (r.ok) {
      const d = await r.json()
      setPosts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, likedByMe: d.liked, likeCount: d.likeCount } : x))
      )
    }
  }

  async function sendComment(p: FeedPost) {
    if (!user) {
      toast.info('Masuk dulu untuk berkomentar.')
      return
    }
    const text = (commentDraft[p.id] ?? '').trim()
    if (!text) return
    const r = await fetch(`/api/posts/${p.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (r.ok) {
      const d = await r.json()
      setPosts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, comments: [...x.comments, d.comment] } : x))
      )
      setCommentDraft((prev) => ({ ...prev, [p.id]: '' }))
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">
          Komunitas & Feed Karya
        </h1>
        <p className="mt-1.5 text-sm text-emerald-900/60">Galeri karya terbaru dari seluruh anggota</p>
      </div>

      {/* kotak bagikan */}
      <div className="mb-7 rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Ceritakan karya daur ulangmu... dari apa, jadi apa, dan bagaimana cara membuatnya!"
          rows={2}
          className="w-full resize-none rounded-xl border-0 bg-transparent p-2 text-sm outline-none placeholder:text-emerald-900/40 focus:ring-0"
        />
        {image && (
          <div className="relative mx-2 mb-2 overflow-hidden rounded-xl border border-emerald-100">
            { }
            <img src={image} alt="" className="max-h-72 w-full object-cover" />
            <button
              onClick={() => setImage(null)}
              className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-emerald-950/70 text-xs text-white"
              aria-label="Hapus gambar"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-emerald-50 px-1 pt-3">
          <button
            onClick={() => (user ? fileRef.current?.click() : toast.info('Masuk dulu untuk membagikan karyamu.'))}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
          >
            <ImagePlus className="size-4" /> Pilih Foto Karya
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-xs font-black text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Bagikan
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.heic,.heif,.avif"
          className="hidden"
          onChange={(e) => pickImage(e.target.files?.[0])}
        />
      </div>

      {/* feed */}
      {loading ? (
        <div className="grid place-items-center py-16 text-emerald-700">
          <Loader2 className="size-7 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/50 py-14 text-center">
          <p className="text-sm font-semibold text-emerald-800">Belum ada karya. Jadilah yang pertama membagikan!</p>
          <p className="mt-1 text-xs text-emerald-900/50">
            Belum ada karya — yuk bagikan kreasi daur ulang pertamamu di tab Komunitas!
          </p>
          <button
            onClick={() => setView('beranda')}
            className="mt-4 rounded-full bg-emerald-600 px-5 py-2 text-xs font-black text-white"
          >
            Lihat Tutorial Dulu
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((p) => (
            <article key={p.id} className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
              <div className="flex items-center gap-3 px-4 py-3">
                {p.user.avatarUrl ? (
                   
                  <img src={p.user.avatarUrl} alt="" className="size-10 rounded-full object-cover" />
                ) : (
                  <span className="grid size-10 place-items-center rounded-full bg-emerald-600 text-sm font-black text-white">
                    {p.user.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-emerald-950">{p.user.name}</div>
                  <div className="truncate text-xs text-emerald-900/50">
                    @{p.user.username} · {timeAgo(p.createdAt)}
                  </div>
                </div>
              </div>

              { }
              <img src={p.imageUrl} alt={p.caption} className="max-h-[540px] w-full bg-emerald-50/50 object-cover" />

              <div className="px-4 py-3">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleLike(p)}
                    className="group inline-flex items-center gap-1.5 transition"
                    aria-label={p.likedByMe ? 'Batal suka' : 'Sukai karya'}
                  >
                    <Heart
                      className={`size-6 transition ${
                        p.likedByMe ? 'fill-rose-500 text-rose-500' : 'text-emerald-900/70 group-hover:text-rose-400'
                      }`}
                    />
                    <span className="text-sm font-bold text-emerald-950">{p.likeCount}</span>
                  </button>
                  <span className="inline-flex items-center gap-1.5 text-sm text-emerald-900/70">
                    <MessageCircle className="size-5" />
                    <span className="font-bold text-emerald-950">{p.comments.length}</span>
                  </span>
                </div>

                <p className="mt-2 text-sm leading-relaxed text-emerald-950/90">
                  <span className="font-black">{p.user.name}</span>{' '}
                  {p.caption}
                </p>

                {p.comments.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {p.comments.map((c) => (
                      <p key={c.id} className="text-sm leading-relaxed">
                        <span className="font-black text-emerald-950">{c.user.name}</span>{' '}
                        <span className="text-emerald-950/85">{c.text}</span>
                      </p>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2 rounded-full bg-emerald-50/70 px-3 py-2">
                  <input
                    value={commentDraft[p.id] ?? ''}
                    onChange={(e) => setCommentDraft((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && sendComment(p)}
                    placeholder={user ? 'Tulis komentar…' : 'Masuk untuk berkomentar…'}
                    className="w-full bg-transparent text-sm outline-none placeholder:text-emerald-900/40"
                  />
                  <button
                    onClick={() => sendComment(p)}
                    className="text-emerald-600 transition hover:text-emerald-500"
                    aria-label="Kirim komentar"
                  >
                    <Send className="size-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
