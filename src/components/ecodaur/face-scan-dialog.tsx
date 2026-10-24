'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, ScanFace, ExternalLink, CameraOff, ShieldCheck, RefreshCw } from 'lucide-react'
import { useApp, type FaceScanMode } from '@/lib/store'
import type { SessionUser } from '@/lib/types'

type Phase = 'starting' | 'detect' | 'liveness' | 'forming' | 'posting' | 'done' | 'error'

interface CameraError {
  title: string
  steps: string[]
  canRetry: boolean
}

const GRID_W = 48
const GRID_H = 36
const PARTICLE_COUNT = 460
const MAX_EDGES = 420
const FACE_STABLE_MS = 900
const LIVENESS_WINDOW_MS = 9000
const FORMING_MS = 2600
const COLORS = ['103,232,249', '190,242,100', '255,255,255']

interface Particle {
  x: number
  y: number
  tx: number
  ty: number
  int: number
  ph: number
  cl: number
}

/** petunjuk khusus bila halaman dibuka tersemat di iframe / koneksi tak aman */
function useEmbedHint() {
  if (typeof window === 'undefined') return null
  if (window.self !== window.top) {
    return 'Kamu membuka EcoDaur di dalam frame tersemat. Browser sering memblokir kamera di mode ini — klik "Buka di Tab Baru" agar kamera diizinkan penuh.'
  }
  if (!window.isSecureContext) {
    return 'Halaman tidak dibuka lewat koneksi aman (HTTPS). Chrome hanya mengizinkan kamera pada koneksi aman.'
  }
  return null
}

function mapCameraError(err: unknown): CameraError {
  const e = err as { name?: string; message?: string }
  switch (e?.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return {
        title: 'Kamera belum diizinkan untuk situs ini',
        steps: [
          'Klik ikon kamera / ikon palang kecil di ujung kanan address bar Chrome.',
          'Ubah "Kamera" menjadi Izinkan, lalu klik Selesai.',
          'Kalau ikonnya tidak ada: buka chrome://settings/content/camera → pastikan situs ini masuk daftar "Diizinkan".',
          'Muat ulang halaman, lalu tekan "Coba Lagi".',
        ],
        canRetry: true,
      }
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return {
        title: 'Kamera tidak ditemukan',
        steps: ['Pastikan laptop/HP memiliki kamera.', 'Cek Device Manager / pengaturan privasi OS apakah kamera aktif.'],
        canRetry: true,
      }
    case 'NotReadableError':
    case 'TrackStartError':
      return {
        title: 'Kamera sedang dipakai aplikasi lain',
        steps: ['Tutup aplikasi yang memakai kamera (Zoom, Google Meet, OBS, dsb).', 'Lalu tekan "Coba Lagi".'],
        canRetry: true,
      }
    case 'OverconstrainedError':
      return {
        title: 'Kamera tidak mendukung resolusi yang diminta',
        steps: ['Coba lagi — EcoDaur akan memakai mode kamera dasar.'],
        canRetry: true,
      }
    case 'SecurityError':
      return {
        title: 'Koneksi tidak aman (bukan HTTPS)',
        steps: [
          'Chrome hanya mengizinkan kamera pada halaman HTTPS atau localhost.',
          'Buka EcoDaur lewat tautan pratinjau resmi (https://…) di tab baru.',
        ],
        canRetry: false,
      }
    default:
      return {
        title: 'Kamera gagal dinyalakan',
        steps: [e?.message || 'Terjadi kesalahan tak terduga.', 'Muat ulang halaman lalu coba lagi.'],
        canRetry: true,
      }
  }
}

export function FaceScanDialog() {
  const { faceScanOpen, faceScanMode, closeFaceScan, user, setUser, setSignupFaceSignature } = useApp()
  const [phase, setPhase] = useState<Phase>('starting')
  const [camError, setCamError] = useState<CameraError | null>(null)
  const [progress, setProgress] = useState(0)
  const [mode, setMode] = useState<FaceScanMode>(faceScanMode)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef(0)
  const phaseRef = useRef<Phase>('starting')
  const particlesRef = useRef<Particle[]>([])
  const offRef = useRef<{ c: HTMLCanvasElement; ctx: CanvasRenderingContext2D; prev: Float32Array | null } | null>(null)
  const sigRef = useRef({ faceStableSince: 0, livenessEnergy: 0, livenessStart: 0, formingStart: 0, lastSample: 0, lost: false })
  const embedHint = useEmbedHint()

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  useEffect(() => {
    if (faceScanOpen) setMode(faceScanMode)
  }, [faceScanOpen, faceScanMode])

  /* ---------- signature biometrik: grid grayscale ternormalisasi (bukan foto) ---------- */
  const computeSignature = useCallback(() => {
    const v = videoRef.current
    if (!v || !v.videoWidth) return null
    const c = document.createElement('canvas')
    c.width = 32
    c.height = 32
    const ctx = c.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(v, 0, 0, 32, 32)
    const data = ctx.getImageData(0, 0, 32, 32).data
    const vec: number[] = []
    for (let i = 0; i < data.length; i += 4) vec.push(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114)
    const mean = vec.reduce((a, b) => a + b, 0) / vec.length
    const std = Math.sqrt(vec.reduce((a, b) => a + (b - mean) ** 2, 0) / vec.length) || 1
    return { w: 32, h: 32, vec: vec.map((x) => Math.round(((x - mean) / std) * 100) / 100) }
  }, [])

  const finish = useCallback(
    async (action: 'login' | 'enroll' | 'capture') => {
      const signature = computeSignature()
      if (!signature) {
        setCamError({ title: 'Gagal membaca wajah', steps: ['Coba lagi dengan pencahayaan lebih terang.'], canRetry: true })
        setPhaseBoth('error')
        return
      }

      /* mode capture (Step 2 pendaftaran): simpan signature di klien, kirim saat Create Account */
      if (action === 'capture') {
        setSignupFaceSignature(JSON.stringify(signature))
        setPhaseBoth('done')
        toast.success('Wajah terdaftar untuk pendaftaran — lanjutkan Create Account.')
        setTimeout(() => closeFaceScan(), 700)
        return
      }

      setPhaseBoth('posting')
      try {
        const res = await fetch('/api/auth/face', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: action, signature: JSON.stringify(signature) }),
        })
        const d = await res.json()
        if (!res.ok) throw new Error(d.error)
        if (action === 'login') {
          setUser(d.user as SessionUser)
          /* admin langsung dibawa ke Portal Admin */
          if ((d.user as { role?: string }).role === 'ADMIN') useApp.getState().setView('admin')
          toast.success(`Wajah dikenali — selamat datang, ${d.user.name}!`)
        } else {
          const me = await fetch('/api/auth/me').then((r) => r.json())
          if (me.user) setUser(me.user)
          toast.success('Wajah berhasil didaftarkan. Lain kali cukup scan! ✨')
        }
        setPhaseBoth('done')
        setTimeout(() => closeFaceScan(), 700)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Verifikasi gagal.')
        setCamError({ title: 'Verifikasi gagal', steps: [err instanceof Error ? err.message : ''], canRetry: true })
        setPhaseBoth('error')
      }
    },
    [computeSignature, closeFaceScan, setUser, setSignupFaceSignature]
  )
  const finishRef = useRef(finish)
  finishRef.current = finish

  /* ---------------------------- hologram engine ---------------------------- */
  const sampleVideo = useCallback(() => {
    const v = videoRef.current
    const off = offRef.current
    if (!v || !off || !v.videoWidth) return null
    const { ctx } = off
    ctx.drawImage(v, 0, 0, GRID_W, GRID_H)
    const px = ctx.getImageData(0, 0, GRID_W, GRID_H).data
    const lum = new Float32Array(GRID_W * GRID_H)
    for (let i = 0; i < lum.length; i++) lum[i] = px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114

    // deteksi tepi sederhana → titik kontur wajah
    const edges: { gx: number; gy: number; int: number }[] = []
    for (let y = 1; y < GRID_H; y++) {
      for (let x = 1; x < GRID_W; x++) {
        const i = y * GRID_W + x
        const e = Math.abs(lum[i] - lum[i - 1]) + Math.abs(lum[i] - lum[i - GRID_W])
        if (e > 30) edges.push({ gx: x / GRID_W, gy: y / GRID_H, int: Math.min(1, e / 110) })
      }
    }
    edges.sort((a, b) => b.int - a.int)

    // energi gerakan untuk liveness
    let motion = 0
    if (off.prev) {
      for (let i = 0; i < lum.length; i += 2) motion += Math.abs(lum[i] - off.prev[i])
      motion /= lum.length / 2
    }
    off.prev = lum
    return { edges: edges.slice(0, MAX_EDGES), motion }
  }, [])

  useEffect(() => {
    if (!faceScanOpen) return
    setPhaseBoth('starting')
    setProgress(0)
    setCamError(null)
    sigRef.current = { faceStableSince: 0, livenessEnergy: 0, livenessStart: 0, formingStart: 0, lastSample: 0, lost: false }

    let cancelled = false

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamError({
          title: 'Browser tidak mendukung akses kamera',
          steps: [
            window.isSecureContext
              ? 'Perbarui Chrome ke versi terbaru lalu muat ulang.'
              : 'Chrome hanya mengizinkan kamera pada halaman HTTPS. Buka EcoDaur lewat tautan pratinjau resmi di tab baru.',
          ],
          canRetry: window.isSecureContext,
        })
        setPhaseBoth('error')
        return
      }
      try {
        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          })
        } catch (e) {
          if ((e as { name?: string })?.name === 'OverconstrainedError') {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          } else throw e
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const v = videoRef.current!
        v.srcObject = stream
        await v.play().catch(() => undefined)

        // siapkan offscreen sampler
        const c = document.createElement('canvas')
        c.width = GRID_W
        c.height = GRID_H
        const ctx = c.getContext('2d', { willReadFrequently: true })!
        offRef.current = { c, ctx, prev: null }

        // seed partikel
        particlesRef.current = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
          x: Math.random(),
          y: Math.random(),
          tx: 0.5,
          ty: 0.5,
          int: 0.5,
          ph: Math.random() * Math.PI * 2,
          cl: i % 3,
        }))

        sigRef.current.livenessStart = 0
        setPhaseBoth('detect')
        rafRef.current = requestAnimationFrame(loop)
      } catch (err) {
        setCamError(mapCameraError(err))
        setPhaseBoth('error')
      }
    }

    let frame = 0
    const loop = (t: number) => {
      if (cancelled) return
      rafRef.current = requestAnimationFrame(loop)
      const canvas = canvasRef.current
      const video = videoRef.current
      if (!canvas || !video) return
      const W = canvas.width
      const H = canvas.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // sampling tiap ~120ms
      const s = sigRef.current
      let data: { edges: { gx: number; gy: number; int: number }[]; motion: number } | null = null
      if (t - s.lastSample > 120) {
        s.lastSample = t
        data = sampleVideo()
      }
      const ph = phaseRef.current
      const particles = particlesRef.current

      /* ----- mesin fase ----- */
      if (data) {
        if (ph === 'detect') {
          if (data.edges.length >= 60) {
            if (!s.faceStableSince) s.faceStableSince = t
            if (t - s.faceStableSince > FACE_STABLE_MS) {
              s.livenessStart = t
              s.livenessEnergy = 0
              setPhaseBoth('liveness')
            }
          } else {
            s.faceStableSince = 0
          }
        } else if (ph === 'liveness') {
          s.livenessEnergy += data.motion
          if (s.livenessEnergy > 260 || (data.motion > 0 && t - s.livenessStart > LIVENESS_WINDOW_MS && s.livenessEnergy > 120)) {
            s.formingStart = t
            setProgress(0)
            setPhaseBoth('forming')
          } else if (t - s.livenessStart > LIVENESS_WINDOW_MS + 4000) {
            // terlalu lama diam — ulangi deteksi
            s.faceStableSince = 0
            setPhaseBoth('detect')
          }
        } else if (ph === 'forming') {
          const p = Math.min(1, (t - s.formingStart) / FORMING_MS)
          setProgress(Math.round(p * 100))
          if (p >= 1) {
            finishRef.current(mode)
          }
        }
      }

      /* ----- peta target partikel ----- */
      const active = data?.edges ?? null
      const pull = ph === 'forming' ? 0.22 : ph === 'detect' ? 0.075 : 0.14
      const jitter = ph === 'forming' ? 0.0012 : 0.004
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const e = active && active.length > 0 ? active[i % active.length] : null
        if (e) {
          // mirror-x agar sesuai tampilan video yang dibalik
          p.tx = 1 - e.gx
          p.ty = e.gy
          p.int = e.int
        } else if (ph === 'detect') {
          p.tx = 0.5 + Math.cos(p.ph + t / 900) * 0.18
          p.ty = 0.42 + Math.sin(p.ph * 1.7 + t / 1100) * 0.16
          p.int = 0.25
        }
        p.x += (p.tx - p.x) * pull + (Math.random() - 0.5) * jitter
        p.y += (p.ty - p.y) * pull + (Math.random() - 0.5) * jitter
      }

      /* ----- gambar hologram ----- */
      ctx.clearRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'lighter'

      const scanY = ((t % 2600) / 2600) * H
      // garis pemindai + jejak
      const beamGrad = ctx.createLinearGradient(0, scanY - 70, 0, scanY)
      beamGrad.addColorStop(0, 'rgba(103,232,249,0)')
      beamGrad.addColorStop(1, 'rgba(103,232,249,0.16)')
      ctx.fillStyle = beamGrad
      ctx.fillRect(0, scanY - 70, W, 70)
      ctx.fillStyle = 'rgba(103,232,249,0.75)'
      ctx.shadowBlur = 16
      ctx.shadowColor = 'rgba(103,232,249,0.9)'
      ctx.fillRect(0, scanY, W, 2)
      ctx.shadowBlur = 0

      for (const p of particles) {
        const px = p.x * W
        const py = p.y * H
        const d = Math.abs(py - scanY)
        const near = Math.max(0, 1 - d / 60)
        const pulse = 0.5 + 0.5 * Math.sin(t / 300 + p.ph)
        const alpha = (ph === 'detect' ? 0.16 : 0.3) + p.int * 0.4 + near * 0.45 + pulse * 0.08
        const size = 1.1 + p.int * 1.4 + near * 2.1 + pulse * 0.4
        ctx.beginPath()
        ctx.fillStyle = `rgba(${COLORS[p.cl]},${Math.min(1, alpha)})`
        ctx.shadowBlur = 6 + near * 16 + (ph === 'forming' ? 8 : 0)
        ctx.shadowColor = `rgba(${COLORS[p.cl]},0.9)`
        ctx.arc(px, py, size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0
      ctx.globalCompositeOperation = 'source-over'
    }

    start()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      offRef.current = null
    }
  }, [faceScanOpen, mode])

  /* ---------- tutup pemindai ---------- */
  const handleCancel = useCallback(async () => {
    closeFaceScan()
  }, [closeFaceScan])

  const retry = () => {
    setCamError(null)
    setPhaseBoth('starting')
    // remount kamera dengan trik ganti mode → efek [faceScanOpen, mode] jalan lagi
    setMode((m) => (m === 'login' ? 'enroll' : 'login'))
    setTimeout(() => setMode(mode), 50)
  }

  const openTop = () => window.open(window.location.href, '_blank')

  const phaseText: Record<Phase, string> = {
    starting: 'Menyalakan kamera…',
    detect: 'Mengunci wajah — hadap kamera, wajah di tengah bingkai',
    liveness: 'Verifikasi keaslian: kedipkan mata & gerakkan kepala sedikit',
    forming: `Membentuk hologram wajah… ${progress}%`,
    posting: 'Memverifikasi biometrik…',
    done: '✓ Wajah cocok!',
    error: 'Terjadi kendala',
  }

  const modeLabel =
    mode === 'login' ? 'Login Bio-Wajah' : mode === 'enroll' ? 'Pendaftaran Wajah' : 'Pendaftaran Wajah — Akun Baru'

  return (
    <Dialog open={faceScanOpen} onOpenChange={(o) => !o && handleCancel()}>
      <DialogContent className="max-h-[94vh] max-w-lg overflow-y-auto rounded-3xl border-eco-border bg-eco-dark p-0 text-white sm:rounded-3xl">
        <DialogHeader className="border-b border-white/10 bg-gradient-to-br from-eco-dark to-[#0d2b1a] p-6 pb-5">
          <DialogTitle className="flex items-center gap-2 font-display text-lg font-bold">
            <ScanFace className="size-5 text-eco-lime" /> {modeLabel}
          </DialogTitle>
          <DialogDescription className="mt-1 text-[13px] text-eco-mist">
            Hologram akan membentuk siluet wajahmu secara real-time. Foto <b>tidak disimpan</b> — hanya
            signature matematis untuk mencocokkan wajah.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-5">
          {embedHint && phase !== 'done' && (
            <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-[12.5px] leading-relaxed text-amber-200">
              <b className="mb-1 block">Kemungkinan penyebab kamera ditolak:</b>
              {embedHint}
              <button
                onClick={openTop}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-1.5 text-[12px] font-bold text-black transition hover:brightness-110"
              >
                <ExternalLink className="size-3.5" /> Buka di Tab Baru
              </button>
            </div>
          )}

          {/* area kamera */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-eco-lime/25 bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className="size-full -scale-x-100 object-cover opacity-80"
            />
            <canvas ref={canvasRef} width={640} height={480} className="absolute inset-0 size-full" />

            {/* scanline halus */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.13]"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, rgba(103,232,249,0.6) 0 1px, transparent 1px 4px)',
              }}
            />
            {/* bracket sudut */}
            <div className="pointer-events-none absolute left-3 top-3 size-9 rounded-tl-lg border-l-2 border-t-2 border-eco-lime/80" />
            <div className="pointer-events-none absolute right-3 top-3 size-9 rounded-tr-lg border-r-2 border-t-2 border-eco-lime/80" />
            <div className="pointer-events-none absolute bottom-3 left-3 size-9 rounded-bl-lg border-b-2 border-l-2 border-eco-lime/80" />
            <div className="pointer-events-none absolute bottom-3 right-3 size-9 rounded-br-lg border-b-2 border-r-2 border-eco-lime/80" />

            {phase === 'error' && (
              <div className="absolute inset-0 grid place-items-center bg-black/80 p-5 text-center">
                <div>
                  <CameraOff className="mx-auto mb-2 size-8 text-red-400" />
                  <p className="text-sm font-bold">{camError?.title ?? 'Kamera gagal'}</p>
                </div>
              </div>
            )}
            {(phase === 'starting' || phase === 'posting') && (
              <div className="absolute inset-0 grid place-items-center bg-black/60">
                <Loader2 className="size-8 animate-spin text-eco-lime" />
              </div>
            )}
          </div>

          {/* status + progres */}
          {phase !== 'error' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[12.5px]">
                <span className={`font-semibold ${phase === 'done' ? 'text-eco-lime' : 'text-eco-mist'}`}>
                  {phaseText[phase]}
                </span>
                {phase === 'forming' && <span className="font-display font-bold text-eco-lime">{progress}%</span>}
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-eco-lime to-eco-emerald transition-all duration-200"
                  style={{ width: `${phase === 'forming' ? progress : phase === 'done' ? 100 : 12}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-red-400/30 bg-red-950/40 p-4">
              <p className="mb-2 text-sm font-bold text-red-200">{camError?.title}</p>
              <ol className="list-decimal space-y-1.5 pl-4 text-[12.5px] leading-relaxed text-red-100/90">
                {(camError?.steps ?? []).filter(Boolean).map((st, i) => (
                  <li key={i}>{st}</li>
                ))}
              </ol>
              <div className="mt-3 flex flex-wrap gap-2">
                {camError?.canRetry && (
                  <button
                    onClick={retry}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-eco-lime px-3.5 py-2 text-[12.5px] font-bold text-eco-dark transition hover:brightness-110"
                  >
                    <RefreshCw className="size-3.5" /> Coba Lagi
                  </button>
                )}
                <button
                  onClick={openTop}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 px-3.5 py-2 text-[12.5px] font-semibold text-white transition hover:bg-white/10"
                >
                  <ExternalLink className="size-3.5" /> Buka di Tab Baru
                </button>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/5 p-3.5 text-[11.5px] leading-relaxed text-eco-mist">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-eco-lime" />
            <span>
              Liveness aktif: sistem mendeteksi kedipan/gerakan kepala agar foto atau video tidak bisa menipu
              pemindai. EcoDaur hanya menyimpan <b>signature biometrik</b> — bukan gambar — dan foto profil
              kamu tetap avatar default.
            </span>
          </div>

          <button
            onClick={handleCancel}
            className="w-full rounded-2xl border border-white/15 py-3 text-sm font-semibold text-eco-mist transition hover:bg-white/5"
          >
            Tutup
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
