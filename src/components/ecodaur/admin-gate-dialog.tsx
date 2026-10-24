'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ShieldCheck, Loader2, KeyRound, Lock } from 'lucide-react'
import { useApp } from '@/lib/store'
import type { SessionUser } from '@/lib/types'

/**
 * Modal Portal Admin dari halaman autentikasi — layout persis situs lama
 * (screenshot 137), tetapi sesuai fitur keenam: diawal KODE ENKRIPSI dan
 * TANPA petunjuk "Demo credentials".
 */
export function AdminGateDialog() {
  const { adminGateOpen, closeAdminGate, setUser } = useApp()
  const [stage, setStage] = useState<'gate' | 'login'>('gate')
  const [code, setCode] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setStage('gate')
    setCode('')
    setUsername('')
    setPassword('')
    setBusy(false)
    setError('')
  }

  const close = () => {
    closeAdminGate()
    reset()
  }

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

  async function enterPortal() {
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
      setUser(d.user as SessionUser)
      useApp.getState().setView('admin') // langsung dibawa ke konsol admin
      toast.success('Admin access granted. Welcome to the EcoDaur control panel.')
      close()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kredensial salah.')
      setBusy(false)
    }
  }

  return (
    <Dialog open={adminGateOpen} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-sm rounded-3xl border-emerald-100 p-6">
        <DialogHeader className="sr-only">
          <DialogTitle>EcoDaur Admin Portal</DialogTitle>
          <DialogDescription>Restricted area — monitor activity &amp; the user database</DialogDescription>
        </DialogHeader>

        <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
            <ShieldCheck className="size-7" />
          </span>
          <h2 className="mt-3 text-lg font-black text-emerald-950">EcoDaur Admin Portal</h2>
          <p className="mt-1 text-xs text-emerald-900/60">
            Restricted area — monitor activity &amp; the user database
          </p>
        </div>

        <div className="mt-5 space-y-3 text-left">
          {stage === 'gate' ? (
            <>
              <div>
                <label className="text-xs font-black text-emerald-900/80">Kode Enkripsi</label>
                <div className="relative mt-1.5">
                  <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-900/40" />
                  <input
                    type="password"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && openGate()}
                    placeholder="• • • • • • • • • •"
                    className="w-full rounded-2xl border border-emerald-200 py-3 pl-9 pr-3 text-center font-mono text-sm tracking-widest outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>
              <button
                onClick={openGate}
                disabled={busy || !code}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0b3d2e] py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-[#0e4a38] disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
                Buka Gerbang Kode
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs font-black text-emerald-900/80">Admin Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="off"
                  className="mt-1.5 w-full rounded-2xl border border-emerald-200 px-3.5 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="text-xs font-black text-emerald-900/80">Admin Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && enterPortal()}
                  placeholder="••••••••"
                  className="mt-1.5 w-full rounded-2xl border border-emerald-200 px-3.5 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                />
              </div>
              <button
                onClick={enterPortal}
                disabled={busy || !username || !password}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0b3d2e] py-3.5 text-sm font-black text-white shadow-lg transition hover:bg-[#0e4a38] disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                Enter Admin Portal
              </button>
            </>
          )}

          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-center text-xs font-bold text-rose-600">{error}</p>
          )}

          <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-center text-[11px] font-bold text-emerald-800">
            Area ini hanya untuk administrator EcoDaur.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
