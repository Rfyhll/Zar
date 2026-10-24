'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useApp } from '@/lib/store'
import type { SessionUser } from '@/lib/types'

export function GoogleG({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z"
      />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1z" />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.6 4.58 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.87 8.87 4.76 12 4.76z"
      />
    </svg>
  )
}

/** Pemilih akun "Google" (simulasi untuk demo) — setelahnya WAJIB scan wajah. */
export function GoogleDialog() {
  const { googleOpen, closeGoogle, setUser } = useApp()
  const [step, setStep] = useState<'choose' | 'other'>('choose')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setStep('choose')
    setEmail('')
    setName('')
    setBusy(false)
  }

  const submit = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setUser(d.user as SessionUser)
      closeGoogle()
      reset()
      // perilaku situs asli: masuk langsung setelah memilih akun Google
      toast.success('Signed in with Google. Welcome to EcoDaur!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login Google gagal.')
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={googleOpen}
      onOpenChange={(o) => {
        if (!o) {
          closeGoogle()
          reset()
        }
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-sm overflow-y-auto rounded-3xl border border-gray-200 bg-white p-0 sm:rounded-3xl">
        <DialogHeader className="px-6 pb-2 pt-6">
          <div className="mb-3 flex justify-center">
            <GoogleG className="size-9" />
          </div>
          <DialogTitle className="text-center font-sans text-[22px] font-normal text-gray-800">
            {step === 'choose' ? 'Pilih akun' : 'Masukkan detail akun'}
          </DialogTitle>
          <DialogDescription className="mt-1 text-center text-[13.5px] text-gray-500">
            untuk melanjutkan ke <b className="text-gray-700">EcoDaur</b>
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          {step === 'choose' ? (
            <div className="space-y-2">
              <button
                onClick={() => setStep('other')}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 px-4 py-3.5 text-left transition hover:bg-gray-50"
              >
                <span className="grid size-9 place-items-center rounded-full bg-gray-100 text-lg">＋</span>
                <span className="text-[14px] font-medium text-gray-700">Gunakan akun lain</span>
              </button>
              <div className="rounded-xl bg-emerald-50 p-3.5 text-[12px] leading-relaxed text-emerald-800">
                Setelah memilih akun, kamu tetap wajib <b>scan wajah</b> sebagai verifikasi biometrik —
                aturan keamanan EcoDaur untuk semua metode masuk.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-gray-600">Alamat Gmail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="namakamu@gmail.com"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-gray-600">Nama Lengkap (sesuai akun)</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="cth: Budi Santoso"
                  maxLength={60}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                />
              </div>
              <button
                onClick={submit}
                disabled={busy || !email || !name}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1a73e8] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1765cc] disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null} Lanjutkan
              </button>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-[12px] text-gray-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="size-3.5" /> EcoDaur memakai data ini sesuai syaratnya
            </span>
            <button
              onClick={() => {
                closeGoogle()
                reset()
              toast.info('Buat akun lewat tab Sign Up ya.')
              }}
              className="font-semibold text-emerald-600 transition hover:underline"
            >
              Pakai email biasa
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
