import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

/** Bentuk /api/auth/me sama seperti situs lama. */
export async function GET() {
  const user = await getCurrentUser()
  return NextResponse.json({ user })
}

export const dynamic = 'force-dynamic'
