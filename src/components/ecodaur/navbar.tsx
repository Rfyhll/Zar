'use client'

import { useApp, type ViewName } from '@/lib/store'
import { Home, Sparkles, User, Info, Settings2, Recycle } from 'lucide-react'

const MENU: { key: ViewName; label: string; icon: typeof Home }[] = [
  { key: 'beranda', label: 'Beranda', icon: Home },
  { key: 'komunitas', label: 'Komunitas', icon: Sparkles },
  { key: 'profil', label: 'Profil', icon: User },
  { key: 'tentang', label: 'Tentang', icon: Info },
]

/** menu khusus administrator — hanya tampil bila yang masuk adalah admin */
const ADMIN_MENU: { key: ViewName; label: string; icon: typeof Home } = {
  key: 'admin',
  label: 'Admin',
  icon: Settings2,
}

export default function Navbar() {
  const view = useApp((s) => s.view)
  const setView = useApp((s) => s.setView)
  const user = useApp((s) => s.user)

  const menu = user?.role === 'ADMIN' ? [...MENU, ADMIN_MENU] : MENU

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-100/80 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <button onClick={() => setView('beranda')} className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30">
            <Recycle className="size-5" />
          </span>
          <span className="text-lg font-black tracking-tight text-emerald-950">
            Eco<span className="text-emerald-600">Daur</span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 md:flex">
          {menu.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                view === key
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  : 'text-emerald-900/70 hover:bg-emerald-50 hover:text-emerald-800'
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </nav>

        <button
          onClick={() => setView('profil')}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white py-1.5 pl-1.5 pr-4 transition hover:border-emerald-300 hover:shadow-sm"
        >
          {user?.avatarUrl ? (
             
            <img src={user.avatarUrl} alt="" className="size-7 rounded-full object-cover" />
          ) : (
            <span className="grid size-7 place-items-center rounded-full bg-emerald-600 text-xs font-black text-white">
              {(user?.name ?? 'A').charAt(0).toUpperCase()}
            </span>
          )}
          <span className="max-w-28 truncate text-sm font-semibold text-emerald-950">
            {user?.role === 'ADMIN' ? 'Administrator' : (user?.name ?? '')}
          </span>
        </button>
      </div>

      {/* menu mobile */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-emerald-100 px-3 py-2 md:hidden">
        {menu.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              view === key ? 'bg-emerald-600 text-white' : 'text-emerald-900/70 hover:bg-emerald-50'
            }`}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </nav>
    </header>
  )
}
