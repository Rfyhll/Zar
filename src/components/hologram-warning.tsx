'use client'

import { useEffect, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

const warningText = 'Warning. This is a fictional prop exchange. All profiles, metrics, and transactions are simulated. No real weapons or operations are involved.'

export default function HologramWarning() {
  const [speaking, setSpeaking] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  const toggleWarning = () => {
    if (!('speechSynthesis' in window)) {
      setSupported(false)
      return
    }

    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }

    const utterance = new SpeechSynthesisUtterance(warningText)
    utterance.lang = 'en-US'
    utterance.pitch = 0.48
    utterance.rate = 0.78
    utterance.volume = 0.9
    const voices = window.speechSynthesis.getVoices()
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith('en-us')) ?? voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ?? null
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.cancel()
    setSpeaking(true)
    try {
      window.speechSynthesis.speak(utterance)
    } catch {
      setSpeaking(false)
      setSupported(false)
    }
  }

  return <aside lang="en" className="hologram-warning relative mt-6 overflow-hidden border border-cyan-400/30 bg-[#071013] p-4 sm:p-5" aria-labelledby="hologram-warning-title">
    <div className="hologram-grid pointer-events-none absolute inset-0" aria-hidden="true" />
    <div className="relative flex items-center gap-4 sm:gap-6">
      <div className="hologram-skull-frame relative grid size-20 shrink-0 place-items-center border border-cyan-300/30 bg-cyan-300/[0.04] sm:size-28">
        <span className="hologram-ring absolute inset-2 rounded-full border border-cyan-300/20" aria-hidden="true" />
        <img src="/skull-hologram.png" alt="Holographic skull warning projection" className="hologram-skull size-[72px] object-contain sm:size-24" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[8px] tracking-[.22em] text-cyan-200/75">SYSTEM BROADCAST / FICTION ONLY</p>
        <h2 id="hologram-warning-title" className="mt-1 font-mono text-sm font-semibold tracking-[.12em] text-cyan-100 sm:text-base">WARNING: SIMULATED ENVIRONMENT</h2>
        <p className="mt-2 max-w-3xl text-[11px] leading-5 text-cyan-50/70 sm:text-xs">This is a fictional prop exchange. All profiles, metrics, and transactions are simulated. No real weapons or operations are involved.</p>
        <button type="button" onClick={toggleWarning} disabled={!supported} aria-pressed={speaking} className="mt-3 inline-flex min-h-10 items-center gap-2 border border-cyan-300/35 bg-cyan-300/[0.06] px-3 font-mono text-[9px] tracking-[.12em] text-cyan-100 transition hover:bg-cyan-300/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-50">
          {speaking ? <VolumeX size={14} aria-hidden="true"/> : <Volume2 size={14} aria-hidden="true"/>}
          {supported ? speaking ? 'STOP VOICE WARNING' : 'PLAY DEEP VOICE WARNING' : 'VOICE WARNING UNAVAILABLE'}
        </button>
        <span className="sr-only" aria-live="polite">{speaking ? 'The English voice warning is playing.' : ''}</span>
      </div>
    </div>
  </aside>
}
