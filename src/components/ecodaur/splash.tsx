'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Recycle, Volume2, VolumeX } from 'lucide-react'

const SPEECH = 'Welcome to EcoDaur. We are ready to guide you in managing your waste.'
const LOADING_STEPS = [
  'Preparing the recycling environment...',
  'Loading creative tutorials...',
  'Connecting the community...',
  'Calibrating face biometrics...',
  'Almost ready!',
]

/**
 * Halaman loading pembuka — persis permintaan user:
 * setiap kali masuk website, halaman LOADING tampil disertai UCAPAN
 * selamat datang "Welcome to EcoDaur. We are ready to guide you in
 * managing your waste." — diketik di layar dan diUCAPKAN dengan suara.
 * - Suara otomatis saat halaman terbuka; bila browser memblokir suara
 *   otomatis, ketukan/ketikan pertama di mana saja memicunya (ada petunjuk).
 * - Progress bar berjalan → masuk otomatis ke website.
 * - Tombol volume kanan-atas untuk membisukan/menyuarakan.
 */
export default function Splash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState(LOADING_STEPS[0])
  const [typed, setTyped] = useState('')
  const [muted, setMuted] = useState(false)
  const [needTap, setNeedTap] = useState(false)
  const doneRef = useRef(false)
  const spokenRef = useRef(false)
  const mutedRef = useRef(false)
  mutedRef.current = muted

  /* panaskan daftar voice browser agar ucapannya tidak terpotong */
  useEffect(() => {
    try {
      const synth = window.speechSynthesis
      if (!synth) return
      synth.getVoices()
      synth.onvoiceschanged = () => synth.getVoices()
    } catch {}
    return () => {
      try {
        if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null
      } catch {}
    }
  }, [])

  const speak = useCallback(() => {
    if (spokenRef.current || mutedRef.current) return
    try {
      if (!('speechSynthesis' in window)) return
      const synth = window.speechSynthesis
      synth.cancel()
      const u = new SpeechSynthesisUtterance(SPEECH)
      u.lang = 'en-US'
      u.rate = 0.95
      u.pitch = 1
      u.volume = 1
      const voices = synth.getVoices()
      const v =
        voices.find((x) => /^en(-|_)?US/i.test(x.lang) && /google|natural|samantha|aria|zira/i.test(x.name)) ||
        voices.find((x) => /^en(-|_)?US/i.test(x.lang)) ||
        voices.find((x) => /^en/i.test(x.lang))
      if (v) u.voice = v
      u.onstart = () => {
        spokenRef.current = true
        setNeedTap(false)
      }
      synth.speak(u)
      /* bila 900ms belum mulai (suara otomatis diblokir browser), minta satu ketukan */
      setTimeout(() => {
        if (!spokenRef.current && !mutedRef.current) setNeedTap(true)
      }, 900)
    } catch {
      // suara opsional
    }
  }, [])

  /* UCAPAN selamat datang: suara + teks diketik sejak halaman loading tampil */
  useEffect(() => {
    speak()
    let i = 0
    const typer = setInterval(() => {
      i += 1
      setTyped(SPEECH.slice(0, i))
      if (i >= SPEECH.length) clearInterval(typer)
    }, 30)
    return () => clearInterval(typer)
  }, [speak])

  /* fallback satu ketukan/ketikan — untuk browser yang memblokir suara otomatis */
  useEffect(() => {
    const tap = () => {
      if (!spokenRef.current && !mutedRef.current) {
        setNeedTap(false)
        try {
          window.speechSynthesis?.cancel()
        } catch {}
        spokenRef.current = false
        speak()
      }
    }
    window.addEventListener('pointerdown', tap)
    window.addEventListener('keydown', tap)
    return () => {
      window.removeEventListener('pointerdown', tap)
      window.removeEventListener('keydown', tap)
    }
  }, [speak])

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    /* ucapannya dibiarkan selesai sendiri — tidak dipotong saat masuk website */
    setLeaving(true)
    setTimeout(onDone, 650)
  }, [onDone])

  /* progress bar loading → selesai otomatis masuk website */
  useEffect(() => {
    const start = Date.now()
    const DURATION = 5200
    const ticker = setInterval(() => {
      const p = Math.min(100, Math.round(((Date.now() - start) / DURATION) * 100))
      setProgress(p)
      setStep(LOADING_STEPS[Math.min(LOADING_STEPS.length - 1, Math.floor((p / 100) * LOADING_STEPS.length))])
      if (p >= 100) {
        clearInterval(ticker)
        finish()
      }
    }, 90)
    return () => clearInterval(ticker)
  }, [finish])

  function toggleMute() {
    const next = !muted
    setMuted(next)
    if (next) {
      try {
        speechSynthesis?.cancel()
      } catch {}
    } else {
      spokenRef.current = false
      setNeedTap(false)
      speak()
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#04231a] transition-opacity duration-700 ${
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      aria-label="EcoDaur welcome screen"
    >
      {/* daun jatuh + glow */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="absolute block text-emerald-400/25 animate-[falling_9s_linear_infinite]"
            style={{
              left: `${(i * 83) % 100}%`,
              animationDelay: `${i * 0.9}s`,
              animationDuration: `${7 + (i % 4)}s`,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
            </svg>
          </span>
        ))}
        <div className="absolute left-1/2 top-1/3 size-72 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[110px]" />
      </div>

      {/* tombol volume kanan-atas */}
      <button
        onClick={toggleMute}
        className="absolute right-6 top-6 z-10 grid size-11 place-items-center rounded-full border border-emerald-300/30 bg-emerald-400/10 text-emerald-200 backdrop-blur transition hover:bg-emerald-400/20"
        aria-label={muted ? 'Nyalakan suara' : 'Bisukan suara'}
      >
        {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
      </button>

      <div className="relative flex w-full max-w-xl flex-col items-center px-6 text-center">
        <div className="relative mb-7 grid size-24 place-items-center rounded-full border border-emerald-300/40 bg-emerald-400/10 shadow-[0_0_60px_-10px_rgba(52,211,153,0.7)]">
          <Recycle className="size-10 text-emerald-300" strokeWidth={1.6} />
          <span className="absolute -right-1 top-1 text-lg">🍃</span>
        </div>

        <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
          Welcome to Eco<span className="text-emerald-400">Daur</span>
        </h1>
        <p className="mt-3 text-xs font-semibold tracking-[0.35em] text-emerald-300/90">
          RECYCLE · CREATE · COMMUNITY
        </p>

        {/* ucapan selamat datang — diketik seperti halaman menyapa user */}
        <p className="mt-8 flex min-h-12 max-w-md items-start justify-center text-sm leading-relaxed text-emerald-100/90">
          <span>
            {typed}
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-emerald-300 align-middle" />
          </span>
        </p>

        {needTap && !muted && (
          <p className="mt-2 animate-pulse text-xs font-bold text-emerald-300">
            🔊 Ketuk di mana saja untuk mendengar sapaan
          </p>
        )}

        {/* progress loading */}
        <div className="mt-7 w-full max-w-md">
          <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-950/70">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-200/60">
            <span>{step}</span>
            <span>{progress}%</span>
          </div>
        </div>
      </div>

      <style>{`@keyframes falling{0%{transform:translateY(-6vh) rotate(0);opacity:0}8%{opacity:.7}100%{transform:translateY(106vh) rotate(300deg);opacity:0}}`}</style>
    </div>
  )
}
