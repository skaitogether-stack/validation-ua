'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { MIN_PLAYERS } from '../../../../lib/games/mafia/engine'
import type { Settings } from '../../../../lib/games/mafia/types'
import { Btn } from '../ui'
import { JoinByCode } from './JoinByCode'
import { setRoomToken } from './useRoom'

const MAX_NAME = 12

// Створення онлайн-кімнати: ведучий вводить своє ім'я, решта налаштувань — уже в кімнаті
export function CreateRoom({ settings }: { settings: Settings }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [name, setName] = useState(() => (session?.user?.name ?? '').split(' ')[0].slice(0, MAX_NAME))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmed = name.trim()

  const create = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/games/mafia/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, lobby: { settings, customSetup: null } })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Не вдалося створити кімнату')
      setRoomToken(data.code, data.token)
      router.push(`/games/mafia/room/${data.code}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не вдалося створити кімнату')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
      <div className="text-center">
        <div className="text-5xl">🌐</div>
        <h1 className="mt-2 text-2xl font-extrabold">Гра на різних телефонах</h1>
        <p className="mt-1 text-gray-600">
          Створіть кімнату й надішліть друзям запрошення. Кожен грає зі свого телефона — можна навіть з різних місць, якщо
          ви на дзвінку. Потрібно щонайменше {MIN_PLAYERS} гравців.
        </p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-semibold">Твоє ім’я в грі</span>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={MAX_NAME}
          placeholder="Ім’я або нікнейм"
          className="min-h-12 rounded-xl border border-gray-200 px-4 text-lg focus:border-indigo-400 focus:outline-none"
        />
      </label>
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
      <Btn disabled={!trimmed || busy} onClick={create}>
        {busy ? 'Створюємо…' : 'Створити кімнату'}
      </Btn>

      <div className="flex flex-col gap-2 border-t border-gray-100 pt-5">
        <span className="font-semibold">Маєш код кімнати від друзів?</span>
        <JoinByCode embedded />
      </div>
    </div>
  )
}
