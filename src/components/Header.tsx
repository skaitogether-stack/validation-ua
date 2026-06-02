'use client'

import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [switching, setSwitching] = useState(false)

  if (!session) return null

  const isTeacher = session.user?.role === 'teacher' || session.user?.role === 'admin'

  async function handleSwitchRole() {
    setSwitching(true)
    try {
      const res = await fetch('/api/user/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        window.location.reload()
      }
    } catch (e) {
      console.error('Error switching role:', e)
    } finally {
      setSwitching(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Логотип */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <span className="text-2xl">🇺🇦</span>
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-600 to-yellow-500 bg-clip-text text-transparent">
            Validation
          </span>
        </Link>

        {/* Навігація та статус користувача */}
        <div className="flex items-center gap-4">
          {/* Режими роботи / Шлях до кабінетів */}
          <div className="hidden sm:flex items-center gap-2">
            {isTeacher ? (
              <>
                <Link
                  href="/teacher"
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    pathname.startsWith('/teacher')
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  🏫 Кабінет вчителя
                </Link>
                <Link
                  href="/"
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    pathname === '/' || pathname.startsWith('/subjects')
                      ? 'bg-blue-50 text-blue-700 border border-blue-100'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  🎒 Перегляд учня
                </Link>
              </>
            ) : (
              <Link
                href="/"
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-100"
              >
                🎒 Навчальна панель
              </Link>
            )}
          </div>

          <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>

          {/* Інформація про роль */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-xs ${
                isTeacher
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}
            >
              {isTeacher ? '🎓 Вчитель' : '🎒 Учень'}
            </span>

            {/* Кнопка швидкої зміни ролі */}
            <button
              onClick={handleSwitchRole}
              disabled={switching}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50"
              title="Перемкнути роль"
            >
              <svg
                className={`w-4 h-4 ${switching ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.228 8H18.22m-14 4h2.582"
                />
              </svg>
            </button>
          </div>

          <div className="h-6 w-px bg-gray-200"></div>

          {/* Дані профілю */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right hidden md:flex">
              <span className="text-sm font-bold text-gray-800">{session.user?.name}</span>
              <span className="text-xs text-gray-400 font-medium">{session.user?.email}</span>
            </div>

            {session.user?.image ? (
              <img
                src={session.user.image}
                className="w-8 h-8 rounded-full border border-gray-100 object-cover"
                alt="Аватар"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                {session.user?.name?.slice(0, 2).toUpperCase() || 'U'}
              </div>
            )}

            {/* Вихід */}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="p-1.5 rounded-lg border border-red-100 hover:bg-red-50 text-red-500 transition-all hover:scale-105"
              title="Вийти з акаунту"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
