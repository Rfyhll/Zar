'use client'

import { useEffect, useRef } from 'react'

/**
 * HOLOGRAM — proyeksi 3D wajah berupa MESH KAWAT (wireframe) persis kartu
 * "HOLOGRAM" situs lama (screenshot 140): jaringan garis biru cyan menyusun
 * kepala 3D — kontur wajah, tonjolan hidung, mata, dan mulut — berputar halus
 * dengan perspektif dan kilau holografik.
 */
export default function HologramFace({ className = '' }: { className?: string }) {
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

    /* ---------- geometri kepala 3D (unit sphere → bentuk wajah) ---------- */
    const RX = 0.74 // lebar kepala
    const RY = 1.0 // tinggi kepala
    const RZ = 0.86 // kedalaman kepala

    interface V3 {
      x: number
      y: number
      z: number
    }

    /** permukaan kepala dari koordinat bola ternormalisasi + tonjolan hidung/dagu */
    function headPoint(sx: number, sy: number, sz: number): V3 {
      let x = sx
      const y = sy
      // rahang menyempit ke dagu
      if (y < 0) x *= 1 - 0.4 * Math.pow(-y, 1.5)
      // dahi sedikit melandai
      if (y > 0.55) x *= 1 - 0.12 * (y - 0.55)
      let z = sz
      // tonjolan hidung (hanya sisi depan)
      if (z > 0) {
        z += 0.16 * Math.exp(-(x * x * 130 + (y + 0.12) * (y + 0.12) * 70))
        z += 0.06 * Math.exp(-(x * x * 150 + (y + 0.74) * (y + 0.74) * 130)) // dagu
        z += 0.045 * Math.exp(-(x * x * 90 + (y - 0.34) * (y - 0.34) * 55)) // dahi depan
      }
      return { x: x * RX, y: y * RY, z: z * RZ }
    }

    const LON = 30
    const LAT = 18

    // cincin lintang (latitude) — dari ubun-ubun ke dagu
    const rings: V3[][] = []
    for (let j = 1; j < LAT; j++) {
      const v = (j / LAT) * Math.PI
      const sv = Math.sin(v)
      const cv = Math.cos(v)
      const ring: V3[] = []
      for (let i = 0; i <= LON; i++) {
        const u = (i / LON) * Math.PI * 2
        ring.push(headPoint(sv * Math.cos(u), cv, sv * Math.sin(u)))
      }
      rings.push(ring)
    }

    // garis bujur (longitude) — dari atas kepala ke bawah
    const meridians: V3[][] = []
    for (let i = 0; i < LON; i++) {
      const u = (i / LON) * Math.PI * 2
      const line: V3[] = []
      for (let j = 0; j <= LAT; j++) {
        const v = (j / LAT) * Math.PI
        line.push(headPoint(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)))
      }
      meridians.push(line)
    }

    // fitur wajah di permukaan depan: mata, mulut, garis hidung
    function faceFeature(pts: [number, number][]): V3[] {
      return pts.map(([xn, yn]) => {
        const rr = Math.min(1, (xn / RX) * (xn / RX) + (yn / RY) * (yn / RY))
        const z = Math.sqrt(1 - rr)
        const p = headPoint(xn, yn, z)
        p.z += 0.02 // melayang sedikit di atas permukaan
        return p
      })
    }

    const eyes: V3[][] = [-0.3, 0.3].map((ex) => {
      const pts: [number, number][] = []
      for (let i = 0; i <= 18; i++) {
        const t = (i / 18) * Math.PI * 2
        pts.push([ex + Math.cos(t) * 0.15, 0.22 + Math.sin(t) * 0.075])
      }
      return faceFeature(pts)
    })
    const pupils: V3[][] = [-0.3, 0.3].map((ex) => faceFeature([[ex, 0.22]]))

    const mouth: V3[] = faceFeature(
      Array.from({ length: 21 }, (_, i) => {
        const t = (i / 20) * Math.PI
        return [-0.2 * Math.cos(t), -0.42 - Math.sin(t) * 0.075] as [number, number]
      })
    )
    const noseLine: V3[] = faceFeature([
      [0, 0.16],
      [0, 0.04],
      [0, -0.08],
      [0.015, -0.16],
    ])

    // partikel debu holografik
    const dust = Array.from({ length: 46 }, () => ({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2.2 - 1.1,
      z: Math.random() * 1.6 - 0.8,
      ph: Math.random() * 6.28,
      s: 0.5 + Math.random(),
    }))

    const project = (p: V3, rotY: number, rotX: number, t: number, scale: number) => {
      // bob halus keseluruhan
      const fy = p.y + Math.sin(t * 0.0009) * 0.03
      const x1 = p.x * Math.cos(rotY) + p.z * Math.sin(rotY)
      const z1 = -p.x * Math.sin(rotY) + p.z * Math.cos(rotY)
      const y2 = fy * Math.cos(rotX) - z1 * Math.sin(rotX)
      const z2 = fy * Math.sin(rotX) + z1 * Math.cos(rotX)
      const persp = 2.6 / (2.6 - z2)
      return { x: w / 2 + x1 * persp * scale, y: h / 2 - y2 * persp * scale, z: z2, k: persp }
    }

    const strokePath = (pts: V3[], rotY: number, rotX: number, t: number, scale: number, baseAlpha: number, width: number) => {
      ctx.beginPath()
      let lastVisible = false
      for (const p of pts) {
        const q = project(p, rotY, rotX, t, scale)
        if (!lastVisible) ctx.moveTo(q.x, q.y)
        else ctx.lineTo(q.x, q.y)
        lastVisible = true
      }
      // kedalaman rata-rata → alpha depan terang, belakang redup
      const zAvg = pts.reduce((a, p) => a + p.z, 0) / pts.length
      const depth = 0.5 + 0.5 * (zAvg / RZ)
      ctx.strokeStyle = `rgba(103,232,249,${Math.min(1, baseAlpha * (0.35 + depth * 0.85))})`
      ctx.lineWidth = width
      ctx.shadowColor = 'rgba(34,211,238,0.85)'
      ctx.shadowBlur = 7
      ctx.stroke()
      ctx.shadowBlur = 0
    }

    const draw = (time: number) => {
      const t = time
      ctx.clearRect(0, 0, w, h)

      // glow latar
      const g = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, Math.min(w, h) * 0.64)
      g.addColorStop(0, 'rgba(34,211,238,0.13)')
      g.addColorStop(1, 'rgba(8,20,30,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      const rotY = -0.34 + Math.sin(t * 0.00032) * 0.24 // 3/4 view bergoyang halus
      const rotX = 0.06 + Math.sin(t * 0.00047) * 0.03
      const scale = Math.min(w, h) * 0.365

      ctx.save()
      ctx.translate(0, 0)
      ctx.scale(1, 1)
      ctx.globalCompositeOperation = 'lighter'

      // garis mesh
      for (const ring of rings) strokePath(ring, rotY, rotX, t, scale, 0.34, 1)
      for (const m of meridians) strokePath(m, rotY, rotX, t, scale, 0.3, 1)
      strokePath(mouth, rotY, rotX, t, scale, 0.7, 1.4)
      strokePath(noseLine, rotY, rotX, t, scale, 0.6, 1.3)
      for (const e of eyes) strokePath(e, rotY, rotX, t, scale, 0.85, 1.5)

      // titik simpul + pupil
      for (let j = 0; j < rings.length; j += 1) {
        const ring = rings[j]
        for (let i = 0; i < ring.length; i += 2) {
          const q = project(ring[i], rotY, rotX, t, scale)
          const depth = 0.5 + 0.5 * (ring[i].z / RZ)
          ctx.beginPath()
          ctx.arc(q.x, q.y, 0.9 * q.k, 0, 6.283)
          ctx.fillStyle = `rgba(165,243,252,${0.18 + depth * 0.4})`
          ctx.fill()
        }
      }
      for (const p of pupils) {
        const q = project(p[0], rotY, rotX, t, scale)
        ctx.beginPath()
        ctx.arc(q.x, q.y, 2.4 * q.k, 0, 6.283)
        ctx.fillStyle = 'rgba(207,250,254,0.95)'
        ctx.shadowColor = 'rgba(34,211,238,1)'
        ctx.shadowBlur = 12
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // debu melayang
      for (const d of dust) {
        const bob = Math.sin(t * 0.001 * d.s + d.ph) * 0.06
        const q = project({ x: d.x * 1.25, y: d.y + bob, z: d.z }, rotY * 0.4, rotX, t, scale)
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.0012 * d.s + d.ph))
        ctx.beginPath()
        ctx.arc(q.x, q.y, 1.1 * d.s, 0, 6.283)
        ctx.fillStyle = `rgba(103,232,249,${0.1 + tw * 0.28})`
        ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'
      ctx.restore()

      // garis pemindai vertikal
      const scanY = ((t % 3200) / 3200) * h
      const sg = ctx.createLinearGradient(0, scanY - 44, 0, scanY)
      sg.addColorStop(0, 'rgba(103,232,249,0)')
      sg.addColorStop(1, 'rgba(103,232,249,0.14)')
      ctx.fillStyle = sg
      ctx.fillRect(0, scanY - 44, w, 44)
      ctx.fillStyle = 'rgba(103,232,249,0.5)'
      ctx.fillRect(0, scanY, w, 1)

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={ref} className={`h-full w-full ${className}`} aria-hidden />
}
