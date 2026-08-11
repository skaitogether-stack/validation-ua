'use client'

import { useState } from 'react'
import { signIn, signOut } from 'next-auth/react'

interface Props {
  token: string
  schoolName: string
  roleLabel: string
  classLabels: string[]
  inviteEmail: string
  sessionEmail: string | null
}

export function InviteAcceptClient({
  token,
  schoolName,
  roleLabel,
  classLabels,
  inviteEmail,
  sessionEmail,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const callbackUrl = `/invite/${token}`
  const emailMatches = sessionEmail?.toLowerCase() === inviteEmail.toLowerCase()

  async function handleAccept() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/invite/${token}/accept`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Не вдалося прийняти запрошення')
        setLoading(false)
        return
      }
      window.location.href = data.role === 'student' ? '/' : '/teacher'
    } catch (e) {
      setError('Не вдалося прийняти запрошення. Спробуйте ще раз.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-linear-to-br from-blue-50 via-slate-50 to-emerald-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl border border-gray-100 shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">✉️</div>
          <h1 className="text-xl font-extrabold text-gray-800">Запрошення до Validation</h1>
          <p className="text-gray-500 text-sm mt-1">{schoolName}</p>
        </div>

        <div className="bg-slate-50 rounded-2xl border border-gray-100 p-5 mb-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Email</span>
            <span className="font-semibold text-gray-700">{inviteEmail}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Роль</span>
            <span className="font-semibold text-gray-700">{roleLabel}</span>
          </div>
          {classLabels.length > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">{classLabels.length > 1 ? 'Класи' : 'Клас'}</span>
              <span className="font-semibold text-gray-700">{classLabels.join(', ')}</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {!sessionEmail && (
          <button
            onClick={() => signIn('google', { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-bold text-sm shadow-md shadow-blue-200 hover:shadow-lg cursor-pointer"
          >
            Увійти через Google, щоб прийняти
          </button>
        )}

        {sessionEmail && !emailMatches && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 text-center">
              Ви увійшли як <span className="font-semibold">{sessionEmail}</span>, а запрошення
              надіслано на <span className="font-semibold">{inviteEmail}</span>.
            </p>
            <button
              onClick={() => signOut({ callbackUrl })}
              className="w-full py-3.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition-all font-bold text-sm cursor-pointer"
            >
              Вийти і увійти іншим акаунтом
            </button>
          </div>
        )}

        {sessionEmail && emailMatches && (
          <button
            onClick={handleAccept}
            disabled={loading}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all font-bold text-sm shadow-md shadow-emerald-200 hover:shadow-lg cursor-pointer disabled:opacity-60 disabled:cursor-default"
          >
            {loading ? 'Приймаємо…' : 'Прийняти запрошення →'}
          </button>
        )}
      </div>
    </main>
  )
}
