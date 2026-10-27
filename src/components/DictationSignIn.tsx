'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import type { InAppBrowser } from '../lib/inAppBrowser'

const STEPS = [
  { icon: '📷', title: 'Сфотографуйте слова', text: 'Сторінку підручника чи зошита — або просто вставте список текстом.' },
  { icon: '🌐', title: 'Отримайте переклад', text: 'Ми розпізнаємо слова й одразу додамо найуживаніший переклад.' },
  { icon: '✍️', title: 'Тренуйтеся до нуля помилок', text: 'Спершу пишете слово, потім переклад — доки все не буде без помилок.' }
]

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" className="flex-shrink-0 fill-current">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

// Посилання, яке просить систему відкрити сторінку у звичайному браузері
function externalBrowserUrl(platform: InAppBrowser['platform']): string {
  const { href, host, pathname, search } = window.location
  if (platform === 'android') {
    return `intent://${host}${pathname}${search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(href)};end`
  }
  if (platform === 'ios') return `x-safari-${href}`
  return href
}

// Google блокує вхід у вбудованих браузерах соцмереж, тож спершу переводимо людину у звичайний браузер
function InAppBrowserNotice({ inApp }: { inApp: InAppBrowser }) {
  const [copied, setCopied] = useState(false)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
    } catch {
      window.prompt('Скопіюйте посилання:', window.location.href)
    }
  }

  const menuHint =
    inApp.platform === 'ios'
      ? 'натисніть «⋯» угорі праворуч → «Відкрити в зовнішньому браузері»'
      : 'натисніть «⋮» угорі праворуч → «Відкрити в браузері»'

  return (
    <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left">
      <div className="font-bold text-amber-900">Відкрийте сторінку у браузері</div>
      <p className="mt-1 text-sm text-amber-800">
        Ви переглядаєте сторінку всередині {inApp.app}, а Google не дозволяє входити звідси. Відкрийте її в{' '}
        {inApp.platform === 'ios' ? 'Safari' : 'Chrome'} — або {menuHint}.
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <a
          href="#"
          onClick={e => {
            e.preventDefault()
            window.location.href = externalBrowserUrl(inApp.platform)
          }}
          className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm text-center shadow-md shadow-blue-200"
        >
          Відкрити в {inApp.platform === 'ios' ? 'Safari' : 'браузері'}
        </a>
        <button
          onClick={copyLink}
          className="w-full py-3 px-4 bg-white border border-amber-200 hover:bg-amber-100 text-amber-900 rounded-xl font-semibold text-sm"
        >
          {copied ? '✅ Посилання скопійовано — вставте його в браузер' : 'Скопіювати посилання'}
        </button>
      </div>
      <button
        onClick={() => signIn('google', { callbackUrl: '/dictation' })}
        className="mt-3 w-full text-xs text-amber-700 underline"
      >
        Все одно спробувати увійти тут
      </button>
    </div>
  )
}

export function DictationSignIn({ inApp }: { inApp: InAppBrowser | null }) {
  return (
    <main className="min-h-screen bg-linear-to-br from-amber-50 via-slate-50 to-blue-50 flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center">
        <div className="text-5xl mb-3">📝</div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gray-900">
          Підготовка до словникового диктанту
        </h1>
        <p className="mt-3 text-gray-500">
          Вивчайте нові слова з іноземної мови швидко й без зубріння.
        </p>

        <div className="mt-8 grid gap-3 text-left">
          {STEPS.map(step => (
            <div key={step.title} className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="text-2xl">{step.icon}</div>
              <div>
                <div className="font-bold text-gray-800">{step.title}</div>
                <div className="text-sm text-gray-500">{step.text}</div>
              </div>
            </div>
          ))}
        </div>

        {inApp ? (
          <InAppBrowserNotice inApp={inApp} />
        ) : (
          <button
            onClick={() => signIn('google', { callbackUrl: '/dictation' })}
            className="mt-8 w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-bold text-sm shadow-md shadow-blue-200 hover:shadow-lg cursor-pointer"
          >
            <GoogleIcon />
            Увійти через Google і почати
          </button>
        )}
        <p className="mt-3 text-xs text-gray-400">Безкоштовно. Вхід потрібен, щоб зберігати ваші списки слів.</p>
      </div>
    </main>
  )
}
