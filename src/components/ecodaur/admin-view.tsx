'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '@/lib/store'
import { timeAgo } from '@/lib/image'
import type { AdminOverview, AdminUser } from '@/lib/types'
import {
  Settings2, Loader2, LogOut, RefreshCw, Radio, Ban, ShieldCheck, KeyRound, Lock,
  LogIn, Users, Activity as ActivityIcon, FileText, Heart, MessageCircle,
  UserCheck, Fingerprint, Globe, Eye,
} from 'lucide-react'
import { toast } from 'sonner'

type Stage = 'gate' | 'login' | 'console'
type Tab = 'ringkasan' | 'pengguna' | 'aktivitas'

/** ikon aktivitas — persis gaya daftar situs lama */
function activityIcon(action: string) {
  if (action === 'ADMIN_LOGIN' || action === 'ADMIN_GATE') return ShieldCheck
  if (action === 'LOGOUT' || action === 'FORCE_LOGOUT') return LogOut
  if (action === 'POST_CREATE') return FileText
  if (action === 'LIKE' || action === 'UNLIKE') return Heart
  if (action === 'COMMENT') return MessageCircle
  if (action === 'REGISTER') return UserCheck
  if (action === 'LOGIN_GOOGLE') return Globe
  if (action === 'LOGIN_FACE') return Fingerprint
  if (action === 'PROFILE_UPDATE' || action === 'ABOUT_UPDATE') return Eye
  return ActivityIcon
}

export default function AdminView() {
  const user = useApp((s) => s.user)
  const setUser = useApp((s) => s.setUser)

  const [stage, setStage] = useState<Stage>(() => (user?.role === 'ADMIN' ? 'console' : 'gate'))
  const [code, setCode] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [data, setData] = useState<AdminOverview | null>(null)
  const [tab, setTab] = useState<Tab>('ringkasan')
  const [live, setLive] = useState(true)
  const [target, setTarget] = useState<AdminUser | null>(null)
  const [kicking, setKicking] = useState(false)
  const liveRef = useRef(live)
  liveRef.current = live

  const isAdmin = user?.role === 'ADMIN'

  const loadOverview = useCallback(async (): Promise<boolean> => {
    try {
      const r = await fetch('/api/admin/overview')
      if (r.status === 403) {
        /* 403 sesaat (jaringan/DB sibuk) tidak boleh langsung menendang admin ke halaman login —
           verifikasi ulang sesi dulu; kalau benar-benar bukan admin baru keluar */
        const me = await fetch('/api/auth/me').then((x) => x.json()).catch(() => null)
        if (me?.user?.role === 'ADMIN') {
          setUser(me.user)
          const r2 = await fetch('/api/admin/overview')
          if (r2.ok) {
            setData(await r2.json())
            return true
          }
        }
        setUser(null)
        setStage('gate')
        return false
      }
      if (r.ok) {
        setData(await r.json())
        return true
      }
      return false
    } catch {
      return false
    }
  }, [setUser])

  useEffect(() => {
    if (stage === 'console') loadOverview()
  }, [stage, loadOverview])

  /* Live · update 12s — persis situs lama */
  useEffect(() => {
    if (stage !== 'console' || !live) return
    const t = setInterval(() => {
      if (liveRef.current) loadOverview()
    }, 12000)
    return () => clearInterval(t)
  }, [stage, live, loadOverview])

  async function openGate() {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/admin/gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setStage('login')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kode salah.')
    } finally {
      setBusy(false)
    }
  }

  async function loginAdmin() {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setUser(d.user)
      setStage('console')
      toast.success('Admin access granted. Welcome to the EcoDaur control panel.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kredensial salah.')
    } finally {
      setBusy(false)
    }
  }

  async function forceLogout(u: AdminUser) {
    setKicking(true)
    try {
      const r = await fetch('/api/admin/force-logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast.success(`${u.name} dipaksa keluar — ${d.removedSessions} sesi dihapus.`)
      setTarget(null)
      loadOverview()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal.')
    } finally {
      setKicking(false)
    }
  }

  async function exitConsole() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    setStage('gate')
    setCode('')
    setUsername('')
    setPassword('')
    setData(null)
    setTab('ringkasan')
  }

  /* ---------- gerbang (fallback bila sesi admin belum ada) ---------- */
  if (stage === 'gate')
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-xl shadow-emerald-900/5">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <KeyRound className="size-7" />
          </span>
          <h1 className="mt-4 text-xl font-black text-emerald-950">EcoDaur Admin Portal</h1>
          <p className="mt-2 text-xs leading-relaxed text-emerald-900/60">
            Area ini dilindungi kode enkripsi. Kode diverifikasi sebagai SHA-256 di server — tidak tersimpan
            dalam bentuk teks biasa.
          </p>
          <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-800">
            Area ini hanya untuk administrator EcoDaur.
          </p>
          <div className="mt-6 space-y-3 text-left">
            <label className="text-xs font-bold text-emerald-900/70">Kode Enkripsi</label>
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && openGate()}
              placeholder="• • • • • • • • • •"
              className="w-full rounded-xl border border-emerald-200 px-4 py-3 text-center font-mono text-sm tracking-widest outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}
            <button
              onClick={openGate}
              disabled={busy || !code}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-black text-white transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
              Buka Gerbang
            </button>
          </div>
        </div>
      </div>
    )

  if (stage === 'login')
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl shadow-emerald-900/5">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <ShieldCheck className="size-7" />
          </span>
          <h1 className="mt-4 text-center text-xl font-black text-emerald-950">EcoDaur Admin Portal</h1>
          <p className="mt-2 text-center text-xs text-emerald-900/60">
            Restricted area — monitor activity &amp; the user database
          </p>
          <div className="mt-6 space-y-3 text-left">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Admin Username"
              autoComplete="off"
              className="w-full rounded-2xl border border-emerald-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loginAdmin()}
              placeholder="Admin Password"
              className="w-full rounded-2xl border border-emerald-200 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>}
            <button
              onClick={loginAdmin}
              disabled={busy || !username || !password}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0b3d2e] py-3.5 text-sm font-black text-white transition hover:bg-[#0e4a38] disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              Enter Admin Portal
            </button>
            <button
              onClick={() => setStage('gate')}
              className="w-full text-center text-xs font-semibold text-emerald-900/50 hover:text-emerald-800"
            >
              ← kembali ke gerbang kode
            </button>
          </div>
        </div>
      </div>
    )

  /* ---------- PORTAL ADMIN (konsol) ---------- */
  const s = data?.stats
  const online5m = data
    ? data.users.filter((u) => u.activeSessions > 0 && Date.now() - new Date(u.lastSeenAt).getTime() < 5 * 60 * 1000)
        .length
    : 0

  const statCards = data && s
    ? [
        { icon: Users, value: s.totalUsers + s.totalAdmins, label: 'Total Pengguna', sub: `${s.faceRegistered} wajah terdaftar`, hi: false },
        { icon: Radio, value: online5m, label: 'Aktif 5 Menit', sub: 'pengguna online', hi: true },
        { icon: FileText, value: s.totalPosts, label: 'Karya Diunggah', sub: `${s.totalLikes} suka · ${s.totalComments} komentar`, hi: false },
        { icon: ActivityIcon, value: s.activities24h, label: 'Aktivitas 24 Jam', sub: 'seluruh aksi tercatat', hi: false },
      ]
    : []

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="inline-flex items-center gap-2 text-xl font-black text-emerald-950 sm:text-2xl">
            <Settings2 className="size-6 text-emerald-600" /> Portal Admin
          </h1>
          <p className="mt-1 text-xs text-emerald-900/60 sm:text-sm">
            Pemantauan aktivitas &amp; basis data akun pengguna EcoDaur
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setLive((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
              live
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-emerald-200 bg-white text-emerald-900/50'
            }`}
          >
            <Radio className={`size-3.5 ${live ? 'animate-pulse' : ''}`} /> Live · update 12s
          </button>
          <button
            onClick={loadOverview}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50"
          >
            <RefreshCw className="size-3.5" /> Segarkan
          </button>
          <button
            onClick={exitConsole}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
          >
            <LogOut className="size-3.5" /> Keluar
          </button>
        </div>
      </div>

      {/* tab */}
      <div className="mt-5 inline-flex rounded-2xl bg-emerald-50 p-1">
        {(
          [
            { key: 'ringkasan', label: 'Ringkasan' },
            { key: 'pengguna', label: 'Pengguna' },
            { key: 'aktivitas', label: 'Aktivitas' },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-6 py-2 text-xs font-black transition ${
              tab === t.key ? 'bg-white text-emerald-800 shadow-md' : 'text-emerald-900/50 hover:text-emerald-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="grid place-items-center py-16 text-emerald-700">
          <Loader2 className="size-7 animate-spin" />
        </div>
      ) : tab === 'ringkasan' ? (
        <>
          {/* 4 kartu statistik */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map(({ icon: Icon, value, label, sub, hi }) => (
              <div
                key={label}
                className={`relative rounded-3xl border p-5 shadow-sm transition ${
                  hi
                    ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-emerald-600/10'
                    : 'border-emerald-100 bg-white'
                }`}
              >
                <span
                  className={`grid size-10 place-items-center rounded-2xl ${
                    hi ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  <Icon className="size-5" />
                </span>
                <div className="mt-3 text-3xl font-black text-emerald-950">{value}</div>
                <div className="mt-0.5 text-sm font-black text-emerald-900">{label}</div>
                <div className="text-[11px] font-semibold text-emerald-900/50">{sub}</div>
                {hi && <Heart className="absolute right-4 top-4 size-4 text-emerald-300" />}
              </div>
            ))}
          </div>

          {/* aktivitas terbaru */}
          <div className="mt-6 rounded-3xl border border-emerald-100 bg-white shadow-sm">
            <h2 className="inline-flex items-center gap-2 px-5 pt-5 text-sm font-black text-emerald-950">
              <ActivityIcon className="size-4 text-emerald-600" /> Aktivitas Terbaru
            </h2>
            <ul className="max-h-96 space-y-2 overflow-y-auto p-4">
              {data.activities.slice(0, 20).map((a) => {
                const Icon = activityIcon(a.action)
                return (
                  <li
                    key={a.id}
                    className="flex items-start gap-3 rounded-2xl border border-emerald-50 bg-emerald-50/40 px-4 py-3"
                  >
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-white text-emerald-600 shadow-sm">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] leading-snug">
                        <span className="font-black text-emerald-950">
                          {a.actorName ?? 'Pengguna'}
                          {a.actorUsername ? ` @${a.actorUsername}` : ''}
                        </span>
                        {a.detail ? ` — ${a.detail}` : ''}
                      </p>
                      <p className="mt-0.5 text-[11px] text-emerald-900/50">
                        {a.actionLabel} · {timeAgo(a.createdAt)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      ) : tab === 'pengguna' ? (
        <div className="mt-5 overflow-x-auto rounded-3xl border border-emerald-100 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-emerald-100 bg-emerald-50/60 text-[10px] font-black uppercase tracking-wider text-emerald-900/60">
                <th className="px-4 py-3">Pengguna</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Metode</th>
                <th className="px-4 py-3">Wajah</th>
                <th className="px-4 py-3 text-center">Karya</th>
                <th className="px-4 py-3 text-center">Sesi</th>
                <th className="px-4 py-3">Terakhir Terlihat</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => {
                const online = u.activeSessions > 0 && Date.now() - new Date(u.lastSeenAt).getTime() < 5 * 60 * 1000
                return (
                  <tr key={u.id} className="border-b border-emerald-50 transition hover:bg-emerald-50/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatarUrl ? (
                           
                          <img src={u.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
                        ) : (
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-600 text-xs font-black text-white">
                            {u.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 truncate font-black text-emerald-950">
                            {u.name}
                            {u.role === 'ADMIN' && (
                              <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-black text-white">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <div className="truncate text-xs text-emerald-900/50">
                            @{u.username} · bergabung {timeAgo(u.createdAt)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-44 truncate px-4 py-3 text-xs text-emerald-900/70">{u.email || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                          u.provider === 'GOOGLE' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {u.provider === 'GOOGLE' ? 'GOOGLE' : 'EMAIL'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {u.faceRegistered ? (
                        <span className="font-bold text-emerald-600">✓ terdaftar</span>
                      ) : (
                        <span className="text-emerald-900/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs font-bold text-emerald-950">{u.postCount}</td>
                    <td className="px-4 py-3 text-center text-xs font-bold text-emerald-950">{u.activeSessions}</td>
                    <td className="px-4 py-3 text-xs text-emerald-900/60">{timeAgo(u.lastSeenAt)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-black ${
                          online ? 'text-emerald-600' : 'text-emerald-900/40'
                        }`}
                      >
                        <span className={`size-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-emerald-900/25'}`} />
                        {online ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.role === 'ADMIN' ? (
                        <span className="text-[11px] text-emerald-900/30">—</span>
                      ) : (
                        <button
                          onClick={() => setTarget(u)}
                          disabled={u.activeSessions === 0}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-[11px] font-black text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
                        >
                          <Ban className="size-3" /> Paksa Keluar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
          <ul className="divide-y divide-emerald-50">
            {data.activities.map((a) => {
              const Icon = activityIcon(a.action)
              return (
                <li key={a.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] leading-snug">
                      <span className="font-black text-emerald-950">
                        {a.actorName ?? 'Pengguna'}
                        {a.actorUsername ? ` @${a.actorUsername}` : ''}
                      </span>
                      {a.detail ? ` — ${a.detail}` : ''}
                    </p>
                    <p className="mt-0.5 text-[11px] text-emerald-900/50">
                      {a.actionLabel} · {timeAgo(a.createdAt)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* modal konfirmasi paksa keluar — fitur 6 */}
      {target && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-emerald-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-rose-100 text-rose-600">
              <Ban className="size-6" />
            </span>
            <h3 className="mt-3 text-lg font-black text-emerald-950">Paksa keluar akun ini?</h3>
            <p className="mt-2 text-xs leading-relaxed text-emerald-900/60">
              <b>{target.name}</b> (@{target.username}
              {target.email ? `, ${target.email}` : ''}) akan keluar dari semua perangkat ({target.activeSessions}{' '}
              sesi aktif). Tindakan untuk jaga-jaga keamanan — dia bisa masuk lagi kapan saja.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setTarget(null)}
                className="flex-1 rounded-xl border border-emerald-200 py-2.5 text-xs font-black text-emerald-800 hover:bg-emerald-50"
              >
                Batal
              </button>
              <button
                onClick={() => forceLogout(target)}
                disabled={kicking}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-black text-white transition hover:bg-rose-500 disabled:opacity-60"
              >
                {kicking ? 'Memproses…' : 'Ya, Keluarkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
