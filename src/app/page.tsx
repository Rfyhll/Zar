'use client'

import { useEffect, useRef, useState } from 'react'
import Navbar from '@/components/ecodaur/navbar'
import Splash from '@/components/ecodaur/splash'
import AuthView from '@/components/ecodaur/auth-view'
import BerandaView from '@/components/ecodaur/beranda-view'
import KomunitasView from '@/components/ecodaur/komunitas-view'
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
  profil: '/profil',
  tentang: '/tentang',
  admin: '/admin',
}

export default function Home() {
  const setUser = useApp((s) => s.setUser)
  const setAuthReady = useApp((s) => s.setAuthReady)
  const setView = useApp((s) => s.setView)
  const view = useApp((s) => s.view)
  const user = useApp((s) => s.user)

  const [showSplash, setShowSplash] = useState<boolean | null>(null)
  const lastView = useRef<ViewName | null>(null)

  /* splash halaman loading — tampil SETIAP kali masuk website (permintaan user) */
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(true), 0)
    return () => clearTimeout(t)
  }, [])

  /* pulihkan posisi halaman terakhir saat refresh (SPA view tersimpan per sesi tab) */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('ecodaur-view') as ViewName | null
      if (saved && ['beranda', 'komunitas', 'profil', 'tentang', 'admin'].includes(saved)) {
        setView(saved)
        lastView.current = saved
      }
    } catch {}
  }, [setView])

  /* simpan posisi halaman setiap kali berpindah */
  useEffect(() => {
    try {
      sessionStorage.setItem('ecodaur-view', view)
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

  return (
    <div className="min-h-screen bg-emerald-50/40">
      {showSplash !== false && <Splash onDone={() => setShowSplash(false)} />}

      {showMain ? (
        <>
          <Navbar />
          <main>
            {view === 'beranda' && <BerandaView />}
            {view === 'komunitas' && <KomunitasView />}
            {view === 'profil' && <ProfilView />}
            {view === 'tentang' && <TentangView />}
            {view === 'admin' && user?.role === 'ADMIN' && <AdminView />}
            {view === 'admin' && user?.role !== 'ADMIN' && <BerandaView />}
          </main>
        </>
      ) : (
        showSplash === false && <AuthView />
      )}

      <FaceScanDialog />
      <GoogleDialog />
      <AdminGateDialog />
    </div>
  )
}
