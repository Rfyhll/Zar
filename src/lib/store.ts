'use client'

import { create } from 'zustand'
import type { SessionUser } from './types'

export type ViewName = 'beranda' | 'komunitas' | 'profil' | 'tentang' | 'admin'
export type FaceScanMode = 'login' | 'enroll' | 'capture'

interface AppState {
  user: SessionUser | null
  authReady: boolean
  /** tampilan aktif — SPA seperti situs lama */
  view: ViewName
  /** username profil anggota yang sedang dilihat (null = profil sendiri) */
  viewingUsername: string | null

  /** modal Portal Admin dari halaman auth */
  adminGateOpen: boolean
  /** signature wajah hasil capture saat pendaftaran (sebelum akun dibuat) */
  signupFaceSignature: string | null

  faceScanOpen: boolean
  faceScanMode: FaceScanMode
  googleOpen: boolean
  postsVersion: number

  setUser: (u: SessionUser | null) => void
  setAuthReady: (v: boolean) => void
  setView: (v: ViewName) => void
  openProfileOf: (username: string | null) => void

  openAdminGate: () => void
  closeAdminGate: () => void
  setSignupFaceSignature: (sig: string | null) => void

  openFaceScan: (mode: FaceScanMode) => void
  closeFaceScan: () => void
  openGoogle: () => void
  closeGoogle: () => void
  bumpPosts: () => void
}

export const useApp = create<AppState>((set) => ({
  user: null,
  authReady: false,
  view: 'beranda',
  viewingUsername: null,

  adminGateOpen: false,
  signupFaceSignature: null,

  faceScanOpen: false,
  faceScanMode: 'login',
  googleOpen: false,
  postsVersion: 0,

  setUser: (user) => set({ user }),
  setAuthReady: (authReady) => set({ authReady }),
  setView: (view) => set({ view }),
  openProfileOf: (viewingUsername) => set({ viewingUsername }),

  openAdminGate: () => set({ adminGateOpen: true }),
  closeAdminGate: () => set({ adminGateOpen: false }),
  setSignupFaceSignature: (signupFaceSignature) => set({ signupFaceSignature }),

  openFaceScan: (faceScanMode) => set({ faceScanOpen: true, faceScanMode }),
  closeFaceScan: () => set({ faceScanOpen: false }),
  openGoogle: () => set({ googleOpen: true }),
  closeGoogle: () => set({ googleOpen: false }),
  bumpPosts: () => set((s) => ({ postsVersion: s.postsVersion + 1 })),
}))
