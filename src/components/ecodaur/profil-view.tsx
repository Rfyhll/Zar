'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '@/lib/store'
import { fileToResizedDataUrl, timeAgo } from '@/lib/image'
import type { FeedPost, SessionUser } from '@/lib/types'
import { Camera, Loader2, LogOut, Pencil, Heart, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

export default function ProfilView() {
  const user = useApp((s) => s.user)
  const setUser = useApp((s) => s.setUser)
  const openFaceScan = useApp((s) => s.openFaceScan)
  const postsVersion = useApp((s) => s.postsVersion)

  const [posts, setPosts] = useState<FeedPost[]>([])
  const [stats, setStats] = useState({ postCount: 0, likeCount: 0, commentCount: 0 })
  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    if (!user) return
    setName(user.name)
    setBio(user.bio ?? '')
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.user) return
        setStats({ postCount: d.user.postCount, likeCount: d.user.likeCount, commentCount: d.user.commentCount })
        setUser(d.user as SessionUser)
      })
      .catch(() => {})
    fetch(`/api/posts?username=${encodeURIComponent(user.username)}`)
      .then((r) => r.json())
      .then((d) => setPosts(d.posts ?? []))
      .catch(() => {})
  }, [user, setUser])

  useEffect(load, [load, postsVersion])

  async function saveProfile() {
    setSaving(true)
    try {
      const r = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Gagal menyimpan.')
      setUser(d.user)
      setEditOpen(false)
      toast.success('Profil diperbarui.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  async function changeAvatar(f: File | undefined) {
    if (!f) return
    setUploading(true)
    try {
      const avatarUrl = await fileToResizedDataUrl(f, 256, 0.85)
      const r = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Gagal mengganti foto.')
      setUser(d.user)
      toast.success('Foto profil diperbarui.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengganti foto.')
    } finally {
      setUploading(false)
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    toast.success('Sampai jumpa! Kamu sudah keluar.')
  }

  if (!user)
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-black text-emerald-950">Profil</h1>
        <p className="mt-3 text-sm text-emerald-900/60">
          Masuk dulu untuk melihat profil, karyamu, dan pengaturan akun.
        </p>
        <button
          onClick={() => toast.info('Masuk dulu untuk melihat profil.')}
          className="mt-6 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-500"
        >
          Masuk Sekarang
        </button>
      </div>
    )

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative">
            {user.avatarUrl ? (
               
              <img src={user.avatarUrl} alt="" className="size-20 rounded-2xl object-cover" />
            ) : (
              <span className="grid size-20 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-3xl font-black text-white">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-2 -right-2 grid size-8 place-items-center rounded-full bg-white text-emerald-700 shadow-md ring-1 ring-emerald-100 transition hover:bg-emerald-50"
              aria-label="Ubah foto profil"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.heic,.heif,.avif"
              className="hidden"
              onChange={(e) => changeAvatar(e.target.files?.[0])}
            />
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black text-emerald-950">{user.name}</h1>
            <p className="text-sm text-emerald-900/50">@{user.username}</p>
            <p className="mt-1 text-sm text-emerald-900/70">{user.bio || 'Belum ada bio — ceritakan dirimu!'}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                {user.provider === 'GOOGLE' ? 'Akun Google' : 'Akun Email'}
              </span>
              {user.role === 'ADMIN' && (
                <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-white">Administrator</span>
              )}
              <span
                className={`rounded-full px-2.5 py-1 ${
                  user.faceRegistered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {user.faceRegistered ? 'Wajah terdaftar' : 'Wajah belum terdaftar'}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 px-4 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50"
            >
              <Pencil className="size-3.5" /> Ubah Profil
            </button>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-100 px-4 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
            >
              <LogOut className="size-3.5" /> Keluar
            </button>
          </div>
        </div>

        {!user.faceRegistered && (
          <button
            onClick={() => openFaceScan('enroll')}
            className="mt-5 w-full rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/60 px-4 py-3 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50"
          >
            🔐 Daftarkan wajah untuk login tanpa password — data biometrik tersimpan sebagai kode hash
          </button>
        )}

        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Karya', value: stats.postCount },
            { label: 'Suka diterima', value: stats.likeCount },
            { label: 'Komentar', value: stats.commentCount },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-emerald-50/70 py-3">
              <div className="text-xl font-black text-emerald-900">{s.value}</div>
              <div className="text-[11px] font-semibold text-emerald-900/60">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-black text-emerald-950">Karya Saya</h2>
      {posts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/50 py-12 text-center text-sm text-emerald-900/60">
          Pengguna ini belum membagikan karya.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {posts.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
              { }
              <img src={p.imageUrl} alt={p.caption} className="aspect-square w-full object-cover" />
              <div className="p-2.5">
                <p className="line-clamp-2 text-xs text-emerald-900/70">{p.caption}</p>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] font-bold text-emerald-700">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="size-3" /> {p.likeCount}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="size-3" /> {p.comments.length}
                  </span>
                  <span className="ml-auto text-emerald-900/40">{timeAgo(p.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* dialog ubah profil */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Ubah Profil</DialogTitle>
            <DialogDescription>Change your profile photo, name, and bio.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-emerald-900/70">Nama</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-emerald-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-emerald-900/70">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={300}
                placeholder="Ceritakan dirimu…"
                className="mt-1 w-full resize-none rounded-xl border border-emerald-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
