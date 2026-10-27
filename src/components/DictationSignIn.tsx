'use client'

import { signIn } from 'next-auth/react'

const STEPS = [
  { icon: '📷', title: 'Сфотографуйте слова', text: 'Сторінку підручника чи зошита — або просто вставте список текстом.' },
  { icon: '🌐', title: 'Отримайте переклад', text: 'Ми розпізнаємо слова й одразу додамо найуживаніший переклад.' },
  { icon: '✍️', title: 'Тренуйтеся до нуля помилок', text: 'Спершу пишете слово, потім переклад — доки все не буде без помилок.' }
]

export function DictationSignIn() {
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

        <button
          onClick={() => signIn('google', { callbackUrl: '/dictation' })}
          className="mt-8 w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-bold text-sm shadow-md shadow-blue-200 hover:shadow-lg cursor-pointer"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" className="flex-shrink-0 fill-current">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Увійти через Google і почати
        </button>
        <p className="mt-3 text-xs text-gray-400">Безкоштовно. Вхід потрібен, щоб зберігати ваші списки слів.</p>
      </div>
    </main>
  )
}
