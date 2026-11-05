'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Activity,
  CameraOff,
  CheckCircle2,
  Crosshair,
  ExternalLink,
  Eye,
  Fingerprint,
  Loader2,
  Lock,
  RefreshCw,
  ScanFace,
  ShieldCheck,
} from 'lucide-react'
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

/* ---------------------------------------------------------------------------
 * Keadaan mesin pemindai yang dibagikan ke hologram alas & HUD biometrik.
 * ------------------------------------------------------------------------- */
interface FaceMetrics {
  cx: number
  cy: number
  w: number
  h: number
  taper: number
}

interface EngineState {
  phase: Phase
  progress: number
  quality: number
  liveness: number
  grid: Float32Array | null
  metrics: FaceMetrics | null
}

/** daftar langkah pemindaian — ditampilkan sebagai panduan ke user */
const SCAN_STEPS = [
  { key: 'posisi', label: 'Posisi wajah di tengah bingkai', icon: ScanFace },
  { key: 'mesh', label: 'Kerangka wajah (face mesh)', icon: Crosshair },
  { key: 'gerak', label: 'Gerakan asli: kedipan & gerakan kepala', icon: Activity },
  { key: 'mata', label: 'Jarak antar mata, hidung & rahang', icon: Eye },
  { key: 'kulit', label: 'Tekstur & kontur permukaan kulit', icon: Fingerprint },
  { key: 'signature', label: 'Signature biometrik unik (bukan foto)', icon: ShieldCheck },
] as const

type StepState = { state: 'wait' | 'active' | 'done'; note: string }

function deriveSteps(phase: Phase, progress: number, quality: number): StepState[] {
  const wait = (note = 'menunggu'): StepState => ({ state: 'wait', note })
  const act = (note: string): StepState => ({ state: 'active', note })
  const ok = (): StepState => ({ state: 'done', note: 'selesai' })

  switch (phase) {
    case 'starting':
      return SCAN_STEPS.map(() => wait('menyiapkan kamera'))
    case 'detect':
      return [
        act('hadap kamera'),
        act(`memindai ${Math.round(Math.min(1, quality * 1.4) * 100)}%`),
        wait(),
        wait(),
        wait(),
        wait(),
      ]
    case 'liveness':
      return [ok(), ok(), act('kedip & gerakkan kepala'), wait(), wait(), wait()]
    case 'forming': {
      const p = progress / 100
      return [
        ok(),
        ok(),
        ok(),
        p >= 0.5 ? ok() : act(`memindai ${Math.round(Math.min(1, p / 0.5) * 100)}%`),
        p >= 0.85 ? ok() : p >= 0.5 ? act('memindai…') : wait(),
        act(`membentuk ${progress}%`),
      ]
    }
    case 'posting':
      return [ok(), ok(), ok(), ok(), ok(), act('memverifikasi…')]
    case 'done':
      return SCAN_STEPS.map(() => ok())
    default:
      return SCAN_STEPS.map(() => wait())
  }
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

/* ---------------------------------------------------------------------------
 * Metrik wajah dari grid tepi: pusat, lebar, tinggi, penyempitan rahang.
 * ------------------------------------------------------------------------- */
function computeFaceMetrics(grid: Float32Array): FaceMetrics | null {
  const colSum = new Float32Array(GRID_W)
  const rowSum = new Float32Array(GRID_H)
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const v = grid[y * GRID_W + x]
      colSum[x] += v
      rowSum[y] += v
    }
  }
  let maxCol = 0
  let maxRow = 0
  for (let x = 0; x < GRID_W; x++) maxCol = Math.max(maxCol, colSum[x])
  for (let y = 0; y < GRID_H; y++) maxRow = Math.max(maxRow, rowSum[y])
  if (maxCol <= 0.5 || maxRow <= 0.5) return null

  const ct = maxCol * 0.2
  const rt = maxRow * 0.2
  let x0 = -1
  let x1 = -1
  let y0 = -1
  let y1 = -1
  for (let x = 0; x < GRID_W; x++) if (colSum[x] > ct) { if (x0 < 0) x0 = x; x1 = x }
  for (let y = 0; y < GRID_H; y++) if (rowSum[y] > rt) { if (y0 < 0) y0 = y; y1 = y }
  if (x0 < 0 || y0 < 0 || x1 - x0 < 5 || y1 - y0 < 5) return null

  /** lebar wajah pada satu baris (sel dengan intensitas cukup) */
  const bandWidth = (y: number): number => {
    let minx = GRID_W
    let maxx = -1
    for (let x = 0; x < GRID_W; x++) if (grid[y * GRID_W + x] > 0.25) { if (x < minx) minx = x; if (x > maxx) maxx = x }
    return maxx >= minx ? (maxx - minx) / GRID_W : 0
  }

  const topBand = y0 + Math.round((y1 - y0) * 0.3)
  const botBand = y1 - Math.round((y1 - y0) * 0.1)
  let topW = 0
  let botW = 0
  for (let y = topBand; y <= Math.min(y1, topBand + 2); y++) topW = Math.max(topW, bandWidth(y))
  for (let y = Math.max(y0, botBand); y <= y1; y++) botW = Math.max(botW, bandWidth(y))
  const taper = topW > 0.02 ? Math.max(0.2, Math.min(1, botW / topW)) : 0.75

  return {
    cx: (x0 + x1) / 2 / GRID_W,
    cy: (y0 + y1) / 2 / GRID_H,
    w: (x1 - x0) / GRID_W,
    h: (y1 - y0) / GRID_H,
    taper,
  }
}

/* ---------------------------------------------------------------------------
 * HOLOPedestal — proyeksi hologram 3D bergaya "patung di atas alas kaca"
 * (referensi gambar kedua): kepala kawat menyala di atas silinder proyektor,
 * MATERIALIZASI mengikuti progres scan, dan BENTUKNYA menyesuaikan wajah user
 * (lebar, tinggi, taper rahang, modulasi permukaan dari mesh kamera).
 * ------------------------------------------------------------------------- */
function HoloPedestal({ engine }: { engine: { current: EngineState } }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let w = 0
    let h = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      w = Math.max(1, r.width)
      h = Math.max(1, r.height)
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    /* ---------- parameter bentuk kepala (dihaluskan tiap frame) ---------- */
    const P = { RX: 0.74, RY: 1.0, jaw: 0.4, ridge: 0.5 }

    interface V3 {
      x: number
      y: number
      z: number
    }

    /** permukaan kepala dari bola ternormalisasi — membaca P saat dipanggil */
    function headPoint(sx: number, sy: number, sz: number): V3 {
      let x = sx
      const y = sy
      if (y < 0) x *= 1 - P.jaw * Math.pow(-y, 1.5)
      if (y > 0.55) x *= 1 - 0.12 * (y - 0.55)
      let z = sz
      if (z > 0) {
        z += 0.16 * P.ridge * Math.exp(-(x * x * 130 + (y + 0.12) * (y + 0.12) * 70))
        z += 0.06 * P.ridge * Math.exp(-(x * x * 150 + (y + 0.74) * (y + 0.74) * 130))
        z += 0.045 * Math.exp(-(x * x * 90 + (y - 0.34) * (y - 0.34) * 55))
      }
      return { x: x * P.RX, y: y * P.RY, z: z * 0.86 }
    }

    const LON = 30
    const LAT = 18

    /* ---------- daftar titik + jalur (param bola → dihitung tiap frame) ---------- */
    const pts: { sx: number; sy: number; sz: number; feature: boolean }[] = []
    const ringsIdx: number[][] = []
    const meridiansIdx: number[][] = []
    const eyesIdx: number[][] = []
    const pupilsIdx: number[] = []
    const mouthIdx: number[] = []
    const noseIdx: number[] = []

    const addPt = (sx: number, sy: number, sz: number, feature = false): number => {
      pts.push({ sx, sy, sz, feature })
      return pts.length - 1
    }

    for (let j = 1; j < LAT; j++) {
      const v = (j / LAT) * Math.PI
      const sv = Math.sin(v)
      const cv = Math.cos(v)
      const ring: number[] = []
      for (let i = 0; i <= LON; i++) {
        const u = (i / LON) * Math.PI * 2
        ring.push(addPt(sv * Math.cos(u), cv, sv * Math.sin(u)))
      }
      ringsIdx.push(ring)
    }
    for (let i = 0; i < LON; i++) {
      const u = (i / LON) * Math.PI * 2
      const line: number[] = []
      for (let j = 0; j <= LAT; j++) {
        const v = (j / LAT) * Math.PI
        line.push(addPt(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)))
      }
      meridiansIdx.push(line)
    }
    /** titik fitur wajah di permukaan depan */
    const featurePt = (xn: number, yn: number): number => {
      const rr = Math.min(1, xn * xn + yn * yn)
      const z = Math.sqrt(1 - rr)
      return addPt(xn, yn, z, true)
    }
    for (const ex of [-0.3, 0.3]) {
      const eye: number[] = []
      for (let i = 0; i <= 18; i++) {
        const t = (i / 18) * Math.PI * 2
        eye.push(featurePt(ex + Math.cos(t) * 0.15, 0.22 + Math.sin(t) * 0.075))
      }
      eyesIdx.push(eye)
      pupilsIdx.push(featurePt(ex, 0.22))
    }
    for (let i = 0; i <= 20; i++) {
      const t = (i / 20) * Math.PI
      mouthIdx.push(featurePt(-0.2 * Math.cos(t), -0.42 - Math.sin(t) * 0.075))
    }
    for (const [nx, ny] of [[0, 0.16], [0, 0.04], [0, -0.08], [0.015, -0.16]] as [number, number][]) {
      noseIdx.push(featurePt(nx, ny))
    }

    /** modulasi permukaan dari mesh kamera — wajah user "mencetak" hologram */
    const surfaceMod = (wx: number, wy: number): number => {
      const g = engine.current.grid
      if (!g) return 0
      const nx = wx / P.RX
      const ny = wy / P.RY
      const col = Math.round(((1 - nx) / 2) * (GRID_W - 1))
      const row = Math.round(((1 - ny) / 2) * (GRID_H - 1))
      if (col < 0 || col >= GRID_W || row < 0 || row >= GRID_H) return 0
      const v = g[row * GRID_W + col]
      return Math.max(0, Math.min(1, (v - 0.15) * 1.5))
    }

    const project = (p: V3, rotY: number, rotX: number, t: number, scale: number) => {
      const fy = p.y + Math.sin(t * 0.0009) * 0.03
      const x1 = p.x * Math.cos(rotY) + p.z * Math.sin(rotY)
      const z1 = -p.x * Math.sin(rotY) + p.z * Math.cos(rotY)
      const y2 = fy * Math.cos(rotX) - z1 * Math.sin(rotX)
      const z2 = fy * Math.sin(rotX) + z1 * Math.cos(rotX)
      const persp = 2.6 / (2.6 - z2)
      return { x: w / 2 + x1 * persp * scale, y: h * 0.44 - y2 * persp * scale, z: z2, k: persp, wy: p.y }
    }

    const dust = Array.from({ length: 34 }, () => ({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2.2 - 1.1,
      z: Math.random() * 1.6 - 0.8,
      ph: Math.random() * 6.28,
      s: 0.5 + Math.random(),
    }))

    let smoothMetrics: FaceMetrics | null = null

    const draw = (time: number) => {
      const t = time
      ctx.clearRect(0, 0, w, h)

      const st = engine.current
      const ph = st.phase
      const buildP =
        ph === 'forming'
          ? Math.min(1, st.progress / 100)
          : ph === 'posting'
            ? 0.95
            : ph === 'done'
              ? 1
              : ph === 'liveness'
                ? 0.32
                : ph === 'detect'
                  ? 0.14
                  : 0.05

      /* ---- haluskan parameter bentuk kepala sesuai wajah user ---- */
      if (st.metrics) {
        if (!smoothMetrics) smoothMetrics = { ...st.metrics }
        const m = smoothMetrics
        m.cx += (st.metrics.cx - m.cx) * 0.05
        m.cy += (st.metrics.cy - m.cy) * 0.05
        m.w += (st.metrics.w - m.w) * 0.05
        m.h += (st.metrics.h - m.h) * 0.05
        m.taper += (st.metrics.taper - m.taper) * 0.05
        const tRX = Math.max(0.55, Math.min(1.02, 0.5 + m.w * 1.35))
        const tRY = Math.max(0.9, Math.min(1.22, 0.72 + m.h * 1.1))
        const tJaw = Math.max(0.14, Math.min(0.55, 0.66 - m.taper * 0.6))
        const tRidge = Math.max(0.35, Math.min(0.8, 0.95 - m.w * 0.75))
        P.RX += (tRX - P.RX) * 0.04
        P.RY += (tRY - P.RY) * 0.04
        P.jaw += (tJaw - P.jaw) * 0.04
        P.ridge += (tRidge - P.ridge) * 0.04
      }

      /* ---- cahaya latar ---- */
      const g = ctx.createRadialGradient(w / 2, h * 0.42, 4, w / 2, h * 0.42, Math.min(w, h) * 0.7)
      g.addColorStop(0, 'rgba(34,211,238,0.14)')
      g.addColorStop(1, 'rgba(8,20,30,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      const rotY = -0.3 + Math.sin(t * 0.0004) * 0.2
      const rotX = 0.05 + Math.sin(t * 0.00047) * 0.03
      const scale = Math.min(w, h) * 0.3

      const flicker = ph === 'liveness' ? 0.75 + 0.25 * Math.abs(Math.sin(t / 90)) : 1
      const ghostMul = ph === 'detect' ? 0.4 : 1

      /* garis materialisasi (dunia kepala): dari atas kepala turun ke dagu */
      const scanWorldY = 1.15 - buildP * 2.5

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'

      /* ---------- garis mesh kepala ---------- */
      const strokeIdx = (idx: number[], baseAlpha: number, width: number) => {
        // dua lintasan: redup (belum termaterialisasi) & terang (sudah)
        ctx.lineWidth = width
        for (const pass of [0, 1]) {
          ctx.beginPath()
          let pen = false
          for (const i of idx) {
            const raw = pts[i]
            let p = headPoint(raw.sx, raw.sy, raw.sz)
            if (!raw.feature) {
              const mod = surfaceMod(p.x, p.y)
              if (mod > 0) {
                p = { x: p.x * (1 + mod * 0.09), y: p.y * (1 + mod * 0.035), z: p.z * (1 + mod * 0.09) }
              }
            }
            const q = project(p, rotY, rotX, t, scale)
            const built = q.wy >= scanWorldY
            if ((pass === 1) === built) {
              if (!pen) ctx.moveTo(q.x, q.y)
              else ctx.lineTo(q.x, q.y)
              pen = true
            } else pen = false
          }
          const alpha = (pass === 1 ? baseAlpha : baseAlpha * 0.16) * flicker * ghostMul
          ctx.strokeStyle = `rgba(103,232,249,${Math.min(1, alpha)})`
          ctx.shadowColor = 'rgba(34,211,238,0.85)'
          ctx.shadowBlur = pass === 1 ? 7 : 0
          ctx.stroke()
          ctx.shadowBlur = 0
        }
      }

      for (const ring of ringsIdx) strokeIdx(ring, 0.3, 1)
      for (const m of meridiansIdx) strokeIdx(m, 0.26, 1)
      strokeIdx(mouthIdx, 0.62, 1.4)
      strokeIdx(noseIdx, 0.55, 1.3)
      for (const e of eyesIdx) strokeIdx(e, 0.8, 1.5)

      /* ---------- titik simpul + pupil ---------- */
      for (const ring of ringsIdx) {
        for (let i = 0; i < ring.length; i += 2) {
          const raw = pts[ring[i]]
          const p = headPoint(raw.sx, raw.sy, raw.sz)
          const q = project(p, rotY, rotX, t, scale)
          const built = q.wy >= scanWorldY
          ctx.beginPath()
          ctx.arc(q.x, q.y, 0.9 * q.k, 0, 6.283)
          ctx.fillStyle = `rgba(165,243,252,${(built ? 0.4 : 0.1) * flicker * ghostMul})`
          ctx.fill()
        }
      }
      for (const i of pupilsIdx) {
        const raw = pts[i]
        const p = headPoint(raw.sx, raw.sy, raw.sz)
        const q = project(p, rotY, rotX, t, scale)
        const built = q.wy >= scanWorldY
        ctx.beginPath()
        ctx.arc(q.x, q.y, 2.4 * q.k, 0, 6.283)
        ctx.fillStyle = `rgba(207,250,254,${built ? 0.95 : 0.18})`
        ctx.shadowColor = 'rgba(34,211,238,1)'
        ctx.shadowBlur = built ? 12 : 0
        ctx.fill()
        ctx.shadowBlur = 0
      }

      /* ---------- garis pemindai mengikuti progres ---------- */
      if (ph === 'forming' || ph === 'liveness') {
        const q = project({ x: 0, y: scanWorldY, z: 0 }, rotY, rotX, t, scale)
        const sg = ctx.createLinearGradient(0, q.y - 30, 0, q.y)
        sg.addColorStop(0, 'rgba(103,232,249,0)')
        sg.addColorStop(1, 'rgba(103,232,249,0.2)')
        ctx.fillStyle = sg
        ctx.fillRect(w * 0.1, q.y - 30, w * 0.8, 30)
        ctx.fillStyle = `rgba(190,242,100,${0.6 * flicker})`
        ctx.shadowColor = 'rgba(190,242,100,0.9)'
        ctx.shadowBlur = 10
        ctx.fillRect(w * 0.1, q.y, w * 0.8, 1.5)
        ctx.shadowBlur = 0
      }

      /* ---------- debu holografik ---------- */
      for (const d of dust) {
        const bob = Math.sin(t * 0.001 * d.s + d.ph) * 0.06
        const q = project({ x: d.x * 1.25, y: d.y + bob, z: d.z }, rotY * 0.4, rotX, t, scale)
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.0012 * d.s + d.ph))
        ctx.beginPath()
        ctx.arc(q.x, q.y, 1.1 * d.s, 0, 6.283)
        ctx.fillStyle = `rgba(103,232,249,${(0.08 + tw * 0.24) * ghostMul})`
        ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'
      ctx.restore()

      /* ---------- alas proyektor (silinder kaca + emitter) ---------- */
      const baseY = h * 0.845
      const baseW = Math.min(w * 0.32, 110)
      const baseH = baseW * 0.24

      // kerucut cahaya dari emitter ke atas
      const cone = ctx.createLinearGradient(0, baseY - baseH * 2.6, 0, baseY)
      cone.addColorStop(0, 'rgba(103,232,249,0)')
      cone.addColorStop(1, 'rgba(103,232,249,0.1)')
      ctx.fillStyle = cone
      ctx.beginPath()
      ctx.moveTo(w / 2 - baseW * 0.34, baseY)
      ctx.lineTo(w / 2 + baseW * 0.34, baseY)
      ctx.lineTo(w / 2 + baseW * 0.16, baseY - baseH * 2.6)
      ctx.lineTo(w / 2 - baseW * 0.16, baseY - baseH * 2.6)
      ctx.closePath()
      ctx.fill()

      // silinder kaca
      ctx.strokeStyle = 'rgba(103,232,249,0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.ellipse(w / 2, baseY, baseW, baseH, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(w / 2, baseY - baseH * 1.15, baseW * 0.92, baseH * 0.9, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(w / 2 - baseW, baseY)
      ctx.lineTo(w / 2 - baseW * 0.92, baseY - baseH * 1.15)
      ctx.moveTo(w / 2 + baseW, baseY)
      ctx.lineTo(w / 2 + baseW * 0.92, baseY - baseH * 1.15)
      ctx.stroke()

      // emitter + cincin dasar
      const pulse = 0.6 + 0.4 * Math.sin(t / 260)
      const eg = ctx.createRadialGradient(w / 2, baseY, 1, w / 2, baseY, baseW * 0.7)
      eg.addColorStop(0, `rgba(190,242,100,${0.5 * pulse})`)
      eg.addColorStop(1, 'rgba(190,242,100,0)')
      ctx.fillStyle = eg
      ctx.beginPath()
      ctx.ellipse(w / 2, baseY, baseW * 0.7, baseH * 0.7, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(w / 2, baseY, baseW * 0.24, baseH * 0.2, 0, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(207,250,254,${0.7 + 0.3 * pulse})`
      ctx.shadowColor = 'rgba(190,242,100,1)'
      ctx.shadowBlur = 14
      ctx.fill()
      ctx.shadowBlur = 0

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [engine])

  return <canvas ref={ref} className="h-full w-full" aria-hidden />
}

/* ---------------------------------------------------------------------------
 * Mesh wajah di atas video (referensi gambar pertama): poligon mengikuti kontur
 * ------------------------------------------------------------------------- */
function drawFaceMesh(
  ctx: CanvasRenderingContext2D,
  grid: Float32Array,
  W: number,
  H: number,
  alphaMul: number,
) {
  ctx.save()
  ctx.lineWidth = 1
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      const i = y * GRID_W + x
      const v = grid[i]
      if (v < 0.28) continue
      const px = (1 - (x + 0.5) / GRID_W) * W
      const py = ((y + 0.5) / GRID_H) * H
      // sambungkan ke tetangga kanan & bawah bila keduanya tepi
      if (x + 1 < GRID_W && grid[i + 1] >= 0.28) {
        ctx.strokeStyle = `rgba(103,232,249,${v * 0.42 * alphaMul})`
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo((1 - (x + 1.5) / GRID_W) * W, py)
        ctx.stroke()
      }
      if (y + 1 < GRID_H && grid[i + GRID_W] >= 0.28) {
        ctx.strokeStyle = `rgba(103,232,249,${v * 0.42 * alphaMul})`
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(px, ((y + 1.5) / GRID_H) * H)
        ctx.stroke()
      }
      ctx.fillStyle = `rgba(190,242,100,${Math.min(0.9, v * 0.75 * alphaMul)})`
      ctx.beginPath()
      ctx.arc(px, py, 1 + v * 1.1, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

/* =========================================================================== */

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

  /* mesin dibagi ke hologram alas + HUD */
  const gridRef = useRef<Float32Array>(new Float32Array(GRID_W * GRID_H))
  const engineRef = useRef<EngineState>({
    phase: 'starting',
    progress: 0,
    quality: 0,
    liveness: 0,
    grid: null,
    metrics: null,
  })

  /* data HUD (diperbarui ringan tiap ~200ms) */
  const [hud, setHud] = useState({ mesh: 0, iris: 0, motion: 0, bin: '01000100', ring: 0 })
  useEffect(() => {
    if (!faceScanOpen) return
    const id = setInterval(() => {
      const st = engineRef.current
      const meshPct = Math.round(Math.min(1, st.quality * 1.25) * 100)
      const irisPct = st.phase === 'starting' ? 0 : Math.round(78 + Math.sin(Date.now() / 640) * 8 + st.quality * 10)
      const motionPct = Math.round(Math.min(1, st.liveness * 1.1) * 100)
      const bin = Array.from({ length: 18 }, () => (Math.random() > 0.5 ? '1' : '0')).join('')
      const ringPct =
        st.phase === 'forming'
          ? Math.round(st.progress)
          : st.phase === 'done'
            ? 100
            : st.phase === 'posting'
              ? 96
              : st.phase === 'liveness'
                ? 35
                : st.phase === 'detect'
                  ? 12 + Math.round(st.quality * 14)
                  : 0
      setHud({ mesh: meshPct, iris: Math.min(97, irisPct), motion: motionPct, bin, ring: ringPct })
    }, 200)
    return () => clearInterval(id)
  }, [faceScanOpen])

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p
    engineRef.current.phase = p
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

    const grid = gridRef.current
    grid.fill(0)
    // deteksi tepi sederhana → titik kontur wajah + grid untuk mesh/hologram
    const edges: { gx: number; gy: number; int: number }[] = []
    for (let y = 1; y < GRID_H; y++) {
      for (let x = 1; x < GRID_W; x++) {
        const i = y * GRID_W + x
        const e = Math.abs(lum[i] - lum[i - 1]) + Math.abs(lum[i] - lum[i - GRID_W])
        if (e > 30) {
          const inten = Math.min(1, e / 110)
          edges.push({ gx: x / GRID_W, gy: y / GRID_H, int: inten })
          grid[i] = inten
        }
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

    const eng = engineRef.current
    eng.grid = grid
    eng.quality = Math.min(1, edges.length / MAX_EDGES)
    eng.metrics = computeFaceMetrics(grid)
    return { edges: edges.slice(0, MAX_EDGES), motion }
  }, [])

  useEffect(() => {
    if (!faceScanOpen) return
    setPhaseBoth('starting')
    setProgress(0)
    setCamError(null)
    sigRef.current = { faceStableSince: 0, livenessEnergy: 0, livenessStart: 0, formingStart: 0, lastSample: 0, lost: false }
    engineRef.current = { phase: 'starting', progress: 0, quality: 0, liveness: 0, grid: null, metrics: null }

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
      // progres forming dihitung TIAP frame (bukan hanya saat sampling)
      // agar hologram alas materialisasi mulus tanpa kedipan
      const liveP = ph === 'forming' ? Math.min(1, (t - s.formingStart) / FORMING_MS) : 0
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
          setProgress(Math.round(liveP * 100))
          if (liveP >= 1) {
            finishRef.current(mode)
          }
        }
      }

      /* ----- sinkronkan keadaan ke hologram alas + HUD ----- */
      engineRef.current.phase = phaseRef.current
      engineRef.current.progress = Math.round(liveP * 100)
      engineRef.current.liveness = Math.min(1, s.livenessEnergy / 260)

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

      /* ----- gambar hologram partikel di atas video ----- */
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

      /* ----- mesh biometrik di atas video (gambar 1) ----- */
      if (engineRef.current.grid && (ph === 'detect' || ph === 'liveness' || ph === 'forming')) {
        drawFaceMesh(ctx, engineRef.current.grid, W, H, ph === 'forming' ? 0.9 : 0.55)
      }

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
  }, [faceScanOpen, mode, sampleVideo])

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
    forming: `Membentuk hologram 3D… ${progress}%`,
    posting: 'Memverifikasi biometrik…',
    done: '✓ Wajah cocok!',
    error: 'Terjadi kendala',
  }

  const modeLabel =
    mode === 'login' ? 'Login Bio-Wajah' : mode === 'enroll' ? 'Pendaftaran Wajah' : 'Pendaftaran Wajah — Akun Baru'

  const steps = deriveSteps(phase, progress, engineRef.current.quality)
  const lockOk = phase === 'forming' || phase === 'posting' || phase === 'done'
  const shieldOk = phase === 'done'
  const ringCirc = 2 * Math.PI * 26

  return (
    <Dialog open={faceScanOpen} onOpenChange={(o) => !o && handleCancel()}>
      <DialogContent className="max-h-[94vh] max-w-lg overflow-y-auto rounded-3xl border-eco-border bg-eco-dark p-0 text-white sm:max-w-2xl sm:rounded-3xl">
        <DialogHeader className="border-b border-white/10 bg-gradient-to-br from-eco-dark to-[#0d2b1a] p-6 pb-5">
          <DialogTitle className="flex items-center gap-2 font-display text-lg font-bold">
            <ScanFace className="size-5 text-eco-lime" /> {modeLabel}
          </DialogTitle>
          <DialogDescription className="mt-1 text-[13px] text-eco-mist">
            Hologram 3D di sebelah kanan akan <b>membentuk siluet wajahmu</b> secara real-time dan menyesuaikan
            bentuk kepalamu. Ikuti panduan langkah di bawah — foto <b>tidak disimpan</b>, hanya signature matematis.
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

          {/* area kamera + hologram alas (dua panel) */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* panel kamera */}
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

              {/* ------- HUD sensor biometrik (gambar 1) ------- */}
              <div className="pointer-events-none absolute left-3.5 top-[52px] flex items-center gap-1.5 rounded-lg border border-cyan-300/30 bg-black/55 px-2 py-1 font-mono text-[9.5px] font-bold tracking-wider text-cyan-200 backdrop-blur-sm">
                <Crosshair className="size-3 animate-pulse" /> IRIS {hud.iris}%
              </div>
              <div className="pointer-events-none absolute right-3.5 top-[52px] flex items-center gap-1.5 rounded-lg border border-cyan-300/30 bg-black/55 px-2 py-1 font-mono text-[9.5px] font-bold tracking-wider text-cyan-200 backdrop-blur-sm">
                MESH {hud.mesh}% <Fingerprint className="size-3 animate-pulse" />
              </div>
              <div className="pointer-events-none absolute bottom-3.5 left-3.5 flex items-center gap-2">
                <span className="rounded-lg border border-eco-lime/30 bg-black/55 px-2 py-1 font-mono text-[9.5px] text-eco-lime backdrop-blur-sm">
                  {hud.bin}
                </span>
                <span className="rounded-lg border border-white/15 bg-black/55 px-2 py-1 font-mono text-[9.5px] text-cyan-200/90 backdrop-blur-sm">
                  GERAK {hud.motion}%
                </span>
              </div>
              <div className="pointer-events-none absolute bottom-3.5 right-3.5 flex items-center gap-1.5">
                <span
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1 font-mono text-[9.5px] font-bold backdrop-blur-sm transition-colors ${
                    lockOk ? 'border-eco-lime/60 bg-eco-lime/15 text-eco-lime' : 'border-white/15 bg-black/55 text-white/40'
                  }`}
                >
                  <Lock className="size-3" /> {lockOk ? 'OK' : '..'}
                </span>
                <span
                  className={`flex items-center gap-1 rounded-lg border px-2 py-1 font-mono text-[9.5px] font-bold backdrop-blur-sm transition-colors ${
                    shieldOk ? 'border-eco-lime/60 bg-eco-lime/15 text-eco-lime' : 'border-white/15 bg-black/55 text-white/40'
                  }`}
                >
                  <ShieldCheck className="size-3" /> {shieldOk ? 'OK' : '..'}
                </span>
              </div>
              {/* cincin progres bulat */}
              <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2">
                <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
                  <circle cx="32" cy="32" r="26" fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    fill="none"
                    stroke="rgba(103,232,249,0.9)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={`${(hud.ring / 100) * ringCirc} ${ringCirc}`}
                    style={{ filter: 'drop-shadow(0 0 4px rgba(103,232,249,0.9))' }}
                  />
                </svg>
                <span className="absolute inset-0 grid place-items-center font-display text-[13px] font-bold text-cyan-100">
                  {hud.ring}%
                </span>
              </div>

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

            {/* panel hologram alas proyektor (gambar 2) */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-cyan-300/25 bg-gradient-to-b from-[#04121d] via-[#02101a] to-[#010a12]">
              <HoloPedestal engine={engineRef} />
              {/* bracket sudut cyan */}
              <div className="pointer-events-none absolute left-2.5 top-2.5 size-7 rounded-tl-lg border-l-2 border-t-2 border-cyan-300/50" />
              <div className="pointer-events-none absolute right-2.5 top-2.5 size-7 rounded-tr-lg border-r-2 border-t-2 border-cyan-300/50" />
              <div className="pointer-events-none absolute bottom-2.5 left-2.5 size-7 rounded-bl-lg border-b-2 border-l-2 border-cyan-300/50" />
              <div className="pointer-events-none absolute bottom-2.5 right-2.5 size-7 rounded-br-lg border-b-2 border-r-2 border-cyan-300/50" />
              {/* label panel */}
              <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-cyan-300/30 bg-black/55 px-2 py-1 font-mono text-[9.5px] font-bold tracking-widest text-cyan-200 backdrop-blur-sm">
                PROYEKSI 3D
              </div>
              <div className="pointer-events-none absolute right-3 top-3 rounded-lg border border-cyan-300/30 bg-black/55 px-2 py-1 font-mono text-[9.5px] text-cyan-200/90 backdrop-blur-sm">
                MODEL: WAJAHMU
              </div>
              <div className="pointer-events-none absolute bottom-3 left-1/2 w-[86%] -translate-x-1/2 text-center">
                <div className="truncate font-mono text-[9px] tracking-[0.18em] text-cyan-300/50">
                  {phase === 'detect' ? '>> KUNCI WAJAH UNTUK MEMULAI PROYEKSI <<' : `>> MATERIALISASI ${hud.ring}% — BENTUK MENYESUAIKAN WAJAH ANDA <<`}
                </div>
              </div>
            </div>
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

          {/* ------- panduan: apa saja yang dipindai ------- */}
          <div className="rounded-2xl border border-eco-lime/20 bg-eco-lime/[0.05] p-4">
            <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-eco-lime">
              <Activity className="size-3.5" /> Proses pemindaian — apa saja yang diperiksa
            </p>
            <ul className="space-y-1.5">
              {SCAN_STEPS.map((st, i) => {
                const s = steps[i]
                const Icon = st.icon
                return (
                  <li key={st.key} className="flex items-center gap-2.5 text-[12px]">
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-full border ${
                        s.state === 'done'
                          ? 'border-eco-lime/60 bg-eco-lime/15 text-eco-lime'
                          : s.state === 'active'
                            ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-200'
                            : 'border-white/15 text-white/30'
                      }`}
                    >
                      {s.state === 'done' ? (
                        <CheckCircle2 className="size-3.5" />
                      ) : s.state === 'active' ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Icon className="size-3" />
                      )}
                    </span>
                    <span className={s.state === 'wait' ? 'text-white/40' : 'text-white/90'}>{st.label}</span>
                    <span
                      className={`ml-auto shrink-0 font-mono text-[10px] ${
                        s.state === 'done' ? 'text-eco-lime' : s.state === 'active' ? 'text-cyan-200' : 'text-white/25'
                      }`}
                    >
                      {s.note}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

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
