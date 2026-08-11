'use client'

import { signIn } from 'next-auth/react'

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-linear-to-br from-blue-50 via-slate-50 to-emerald-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        {/* Бренд */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-3 animate-bounce">🇺🇦</div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
            Платформа <span className="bg-gradient-to-r from-blue-600 to-yellow-500 bg-clip-text text-transparent">Validation</span>
          </h1>
          <p className="mt-3 text-lg text-gray-500 max-w-md mx-auto">
            Інтерактивний кабінет для спільної роботи вчителів та учнів
          </p>
        </div>

        {/* Дві картки входів */}
        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Портал учня */}
          <div className="bg-white rounded-3xl border border-blue-100 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col justify-between group transform hover:-translate-y-1">
            <div className="p-8">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                🎒
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Кабінет Учня
              </span>
              <h2 className="text-2xl font-extrabold text-gray-800 mt-4 mb-2">Портал для навчання</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Вивчайте нові теми з різних предметів, проходьте тести, тренуйтесь та заробляйте досвід (XP).
              </p>
            </div>

            <div className="p-8 bg-slate-50 border-t border-gray-100">
              <button
                onClick={() => signIn('google', { callbackUrl: '/' })}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-bold text-sm shadow-md shadow-blue-200 hover:shadow-lg cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" className="flex-shrink-0 fill-current">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Увійти через Google
              </button>
            </div>
          </div>

          {/* Портал вчителя */}
          <div className="bg-white rounded-3xl border border-emerald-100 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col justify-between group transform hover:-translate-y-1">
            <div className="p-8">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                🎓
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Кабінет Вчителя
              </span>
              <h2 className="text-2xl font-extrabold text-gray-800 mt-4 mb-2">Портал для вчителів</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Завантажуйте власні текстові матеріали (джерела), автоматично конвертуйте їх на нові інтерактивні уроки з тестами, та відстежуйте оцінки учнів.
              </p>
              <p className="text-gray-400 text-xs mt-3">
                Доступ надається за запрошенням адміністратора вашої школи.
              </p>
            </div>

            <div className="p-8 bg-slate-50 border-t border-gray-100">
              <button
                onClick={() => signIn('google', { callbackUrl: '/teacher' })}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all font-bold text-sm shadow-md shadow-emerald-200 hover:shadow-lg cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" className="flex-shrink-0 fill-current">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Увійти через Google
              </button>
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}
