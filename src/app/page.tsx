'use client'

import { useEffect, useRef, useState } from 'react'
import Navbar from '@/components/ecodaur/navbar'
import Splash from '@/components/ecodaur/splash'
import AuthView from '@/components/ecodaur/auth-view'
import BerandaView from '@/components/ecodaur/beranda-view'
import KomunitasView from '@/components/ecodaur/komunitas-view'
import PasarView from '@/components/ecodaur/pasar-view'
import ProfilView from '@/components/ecodaur/profil-view'
import TentangView from '@/components/ecodaur/tentang-view'
import AdminView from '@/components/ecodaur/admin-view'
import { FaceScanDialog } from '@/components/ecodaur/face-scan-dialog'
import { GoogleDialog } from '@/components/ecodaur/google-dialog'
import { AdminGateDialog } from '@/components/ecodaur/admin-gate-dialog'
import { useApp, type ViewName } from '@/lib/store'

const VIEW_PATH: Record<ViewName, string> = {
  beranda: '/beranda',
  komunitas: '/komunitas',
  pasar: '/pasar',
  profil: '/profil',
  tentang: '/tentang',
  admin: '/admin',
}

/** layar menunggu sesi dicek — mencegah halaman login berkedip saat refresh */
function AuthLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-emerald-50/40">
      <div className="flex flex-col items-center gap-4">
        <span className="size-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
        <p className="text-sm font-bold text-emerald-800">Memuat sesi kamu…</p>
      </div>
    </div>
  )
}

export default function Home() {
  const setUser = useApp((s) => s.setUser)
  const setAuthReady = useApp((s) => s.setAuthReady)
  const setView = useApp((s) => s.setView)
  const view = useApp((s) => s.view)
  const user = useApp((s) => s.user)
  const authReady = useApp((s) => s.authReady)

  const [showSplash, setShowSplash] = useState<boolean | null>(null)
  const lastView = useRef<ViewName | null>(null)

  /* splash halaman loading — tampil SETIAP kali masuk website (permintaan user) */
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(true), 0)
    return () => clearTimeout(t)
  }, [])

  /* pulihkan posisi halaman terakhir saat refresh — pakai localStorage agar
     bertahan walau tab/browser ditutup lalu dibuka lagi (bukan cuma per sesi tab) */
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ecodaur-view') as ViewName | null
      if (saved && ['beranda', 'komunitas', 'pasar', 'profil', 'tentang', 'admin'].includes(saved)) {
        setView(saved)
        lastView.current = saved
      }
    } catch {}
  }, [setView])

  /* simpan posisi halaman setiap kali berpindah */
  useEffect(() => {
    try {
      localStorage.setItem('ecodaur-view', view)
    } catch {}
  }, [view])

  /* pulihkan sesi dari cookie — login bertahan lintas hari/restart server */
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setUser(d.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setAuthReady(true))
  }, [setUser, setAuthReady])

  /* catat jejak jelajah (VIEW_PAGE) seperti situs lama */
  useEffect(() => {
    if (!user || lastView.current === view) return
    lastView.current = view
    if (view === 'admin') return
    fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'VIEW_PAGE', detail: VIEW_PATH[view], path: VIEW_PATH[view] }),
    }).catch(() => {})
  }, [view, user])

  /* halaman admin hanya untuk administrator — pengguna biasa otomatis kembali ke beranda */
  useEffect(() => {
    if (view === 'admin' && user && user.role !== 'ADMIN') setView('beranda')
  }, [view, user, setView])

  const showMain = Boolean(user)
  const showAuth = showSplash === false && authReady && !showMain

  return (
    <div className="min-h-screen bg-emerald-50/40">
      {showSplash !== false && <Splash onDone={() => setShowSplash(false)} />}

      {showMain ? (
        <>
          <Navbar />
          <main>
            {view === 'beranda' && <BerandaView />}
            {view === 'komunitas' && <KomunitasView />}
            {view === 'pasar' && <PasarView />}
            {view === 'profil' && <ProfilView />}
            {view === 'tentang' && <TentangView />}
            {view === 'admin' && user?.role === 'ADMIN' && <AdminView />}
            {view === 'admin' && user?.role !== 'ADMIN' && <BerandaView />}
          </main>
        </>
      ) : showAuth ? (
        <AuthView />
      ) : (
        showSplash === false && <AuthLoading />
      )
      }

      <FaceScanDialog />
      <GoogleDialog />
      <AdminGateDialog />
    </div>
  )
}
