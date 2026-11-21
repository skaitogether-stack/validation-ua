'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CODE_LENGTH = 5

export function normalizeInput(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH)
}

// Поле «Маю код кімнати»
export function JoinByCode({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const ready = code.length === CODE_LENGTH

  const form = (
    <form
      onSubmit={e => {
        e.preventDefault()
        if (ready) router.push(`/games/mafia/room/${code}`)
      }}
      className="flex gap-2"
    >
      <input
        value={code}
        onChange={e => setCode(normalizeInput(e.target.value))}
        placeholder="КОД"
        aria-label="Код кімнати"
        autoCapitalize="characters"
        autoComplete="off"
        className="min-h-12 w-full min-w-0 rounded-xl border border-gray-200 px-4 text-center font-mono text-2xl font-bold uppercase tracking-[0.3em] focus:border-indigo-400 focus:outline-none"
      />
      <button type="submit" disabled={!ready} className="min-h-12 shrink-0 rounded-xl bg-indigo-600 px-5 font-bold text-white disabled:bg-indigo-300">
        Увійти
      </button>
    </form>
  )

  if (embedded) return form

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-10">
      <div className="flex flex-col gap-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="text-center">
          <div className="text-5xl">🔑</div>
          <h1 className="mt-2 text-2xl font-extrabold">Приєднатися до гри</h1>
          <p className="mt-1 text-gray-600">Введіть код кімнати з {CODE_LENGTH} символів, який вам надіслав ведучий.</p>
        </div>
        {form}
      </div>
    </main>
  )
}
