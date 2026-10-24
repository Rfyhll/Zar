'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store'
import { toast } from 'sonner'
import HologramFace from './hologram-face'
import { GoogleG } from './google-dialog'
import {
  ScanFace, ScanEye, Loader2, KeyRound, ShieldCheck, User, Lock, Eye, EyeOff,
} from 'lucide-react'

type Tab = 'signin' | 'signup'

/** Halaman autentikasi penuh — persis situs lama (screenshot 134–136). */
export default function AuthView() {
  const { setUser, openFaceScan, openGoogle, openAdminGate, signupFaceSignature, setSignupFaceSignature } = useApp()
  const [tab, setTab] = useState<Tab>('signin')
  const [usePassword, setUsePassword] = useState(false)

  // form login
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [busy, setBusy] = useState(false)

  // form daftar
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [pwd1, setPwd1] = useState('')
  const [pwd2, setPwd2] = useState('')

  async function loginPassword() {
    setBusy(true)
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setUser(d.user)
      /* admin langsung dibawa ke Portal Admin */
      if ((d.user as { role?: string }).role === 'ADMIN') useApp.getState().setView('admin')
      toast.success('Signed in successfully. Welcome back!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Masuk gagal.')
    } finally {
      setBusy(false)
    }
  }

  async function createAccount() {
    if (pwd1 !== pwd2) {
      toast.error('Password confirmation does not match. Please try again.')
      return
    }
    setBusy(true)
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, password: pwd1, faceSignature: signupFaceSignature }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setUser(d.user)
      setSignupFaceSignature(null)
      toast.success('Your account has been created. Welcome to EcoDaur!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Pendaftaran gagal.')
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-emerald-50 via-emerald-50/70 to-white px-4 py-10">
      {/* logo */}
      <h1 className="text-3xl font-black tracking-tight text-emerald-950">
        Eco<span className="text-emerald-500">Daur</span>
      </h1>
      <p className="mt-2 text-center text-sm text-emerald-900/60">
        {tab === 'signin'
          ? 'Sign in with a face scan — fast, secure, password-free'
          : "Let's create your EcoDaur account — then enroll your face biometrics"}
      </p>

      {/* kartu */}
      <div className="mt-6 w-full max-w-xl rounded-3xl border border-emerald-100 bg-white p-6 shadow-xl shadow-emerald-900/5 sm:p-7">
        {/* tab */}
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-emerald-50 p-1">
          {(
            [
              { key: 'signin', label: 'Sign In' },
              { key: 'signup', label: 'Sign Up' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-xl py-2.5 text-sm font-bold transition ${
                tab === t.key ? 'bg-white text-emerald-800 shadow-md' : 'text-emerald-900/50 hover:text-emerald-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'signin' ? (
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-sm font-black text-emerald-950">
                <ScanEye className="size-4 text-emerald-600" /> Face Biometric Authentication
              </h2>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black tracking-wide text-emerald-700">
                PRIMARY
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="grid min-h-44 place-items-center rounded-2xl bg-[#0c1626] p-4 text-center">
                <div>
                  <ScanFace className="mx-auto size-10 text-emerald-400" strokeWidth={1.5} />
                  <p className="mt-3 text-xs leading-relaxed text-slate-200">
                    Face biometric authentication with liveness check
                  </p>
                </div>
              </div>
              <div className="relative min-h-44 overflow-hidden rounded-2xl bg-gradient-to-b from-[#0e1b2e] to-[#0a1220]">
                <span className="absolute left-3 top-2.5 z-10 text-[10px] font-black tracking-widest text-cyan-300">
                  HOLOGRAM
                </span>
                <span className="absolute right-3 top-3 z-10 size-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_2px_rgba(103,232,249,0.8)]" />
                <HologramFace />
                <p className="absolute bottom-2.5 left-3 right-3 z-10 text-[10px] leading-snug text-cyan-100/70">
                  3D projection of your face shape appears here in real-time.
                </p>
              </div>
            </div>

            <button
              onClick={() => openFaceScan('login')}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500"
            >
              <ScanFace className="size-4" /> Start Face Scan
            </button>

            {usePassword ? (
              <div className="mt-4 space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-900/40" />
                  <input
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Username"
                    className="w-full rounded-xl border border-emerald-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-900/40" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loginPassword()}
                    placeholder="Password"
                    className="w-full rounded-xl border border-emerald-200 bg-white py-2.5 pl-9 pr-10 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  />
                  <button
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-900/40 hover:text-emerald-700"
                    aria-label="Tampilkan password"
                  >
                    {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <button
                  onClick={loginPassword}
                  disabled={busy || !identifier || !password}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-black text-white transition hover:bg-emerald-500 disabled:opacity-60"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Masuk dengan Password
                </button>
              </div>
            ) : (
              <button
                onClick={() => setUsePassword(true)}
                className="mx-auto mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-600"
              >
                <KeyRound className="size-3.5" /> Use password instead
              </button>
            )}

            <p className="mt-4 text-center text-xs text-emerald-900/60">
              Don&apos;t have an account?{' '}
              <button onClick={() => setTab('signup')} className="font-black text-emerald-700 hover:underline">
                Sign up now
              </button>
            </p>
          </div>
        ) : (
          <div className="mt-5">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label className="text-xs font-black text-emerald-900/80">Full Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Budi Lestari"
                  className="mt-1.5 w-full rounded-xl border border-emerald-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="text-xs font-black text-emerald-900/80">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="e.g. budi_lr"
                  className="mt-1.5 w-full rounded-xl border border-emerald-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="text-xs font-black text-emerald-900/80">Password</label>
                <input
                  type="password"
                  value={pwd1}
                  onChange={(e) => setPwd1(e.target.value)}
                  placeholder="min. 6 characters"
                  className="mt-1.5 w-full rounded-xl border border-emerald-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="text-xs font-black text-emerald-900/80">Confirm Password</label>
                <input
                  type="password"
                  value={pwd2}
                  onChange={(e) => setPwd2(e.target.value)}
                  placeholder="repeat password"
                  className="mt-1.5 w-full rounded-xl border border-emerald-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                />
              </div>
            </div>

            {/* step 2 */}
            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
              <h3 className="inline-flex items-center gap-2 text-sm font-black text-emerald-950">
                <ScanEye className="size-4 text-emerald-600" /> Step 2 — Enroll Your Face Biometrics
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="grid min-h-40 place-items-center rounded-2xl bg-[#0c1626] p-4 text-center">
                  <div>
                    <ScanFace className="mx-auto size-9 text-emerald-400" strokeWidth={1.5} />
                    <p className="mt-3 text-xs leading-relaxed text-slate-200">
                      Enroll your face biometrics with liveness check
                    </p>
                  </div>
                </div>
                <div className="relative min-h-40 overflow-hidden rounded-2xl bg-gradient-to-b from-[#0e1b2e] to-[#0a1220]">
                  <span className="absolute left-3 top-2.5 z-10 text-[10px] font-black tracking-widest text-cyan-300">
                    HOLOGRAM
                  </span>
                  <span className="absolute right-3 top-3 z-10 size-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_2px_rgba(103,232,249,0.8)]" />
                  <HologramFace />
                  <p className="absolute bottom-2.5 left-3 right-3 z-10 text-[10px] leading-snug text-cyan-100/70">
                    3D projection of your face shape appears here in real-time.
                  </p>
                </div>
              </div>
              <button
                onClick={() => openFaceScan('capture')}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-sm font-black text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500"
              >
                <ScanFace className="size-4" />
                {signupFaceSignature ? 'Scan Ulang Wajah' : 'Enable Camera for Face Enrollment'}
              </button>
              {signupFaceSignature && (
                <p className="mt-2 text-center text-[11px] font-black text-emerald-700">
                  ✓ Wajah terdaftar — siap dibuat akunnya
                </p>
              )}
            </div>

            <button
              onClick={createAccount}
              disabled={busy || !name || !username || pwd1.length < 6}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <User className="size-4" />}
              Create Account
            </button>

            <p className="mt-3 text-center text-xs text-emerald-900/60">
              Already have an account?{' '}
              <button onClick={() => setTab('signin')} className="font-black text-emerald-700 hover:underline">
                Sign in here
              </button>
            </p>
          </div>
        )}

        {/* opsi lain */}
        <div className="mt-5">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-emerald-100" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-900/40">
              or other options
            </span>
            <span className="h-px flex-1 bg-emerald-100" />
          </div>
          <button
            onClick={() => openGoogle()}
            className="mt-3 flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
          >
            <GoogleG className="size-4" />
            Continue with Google
          </button>
          <button
            onClick={() => openAdminGate()}
            className="mx-auto mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-900/50 transition hover:text-emerald-700"
          >
            <ShieldCheck className="size-3.5" /> Admin Portal
          </button>
        </div>
      </div>

      {/* footer keamanan */}
      <p className="mx-auto mt-6 max-w-md text-center text-[11px] leading-relaxed text-emerald-900/40">
        Your face biometrics are stored as a unique hash code on the EcoDaur server
        <br />— never as a raw image — to keep your account safe.
      </p>
    </div>
  )
}
