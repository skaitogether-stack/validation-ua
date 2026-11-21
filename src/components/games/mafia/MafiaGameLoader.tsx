'use client'

import dynamic from 'next/dynamic'

// Гра читає збережений стан з localStorage, тому рендеримо її лише в браузері
const MafiaGame = dynamic(() => import('./MafiaGame').then(m => m.MafiaGame), {
  ssr: false,
  loading: () => <div className="py-20 text-center text-gray-400">Завантаження…</div>
})

export function MafiaGameLoader({ backHref }: { backHref: string }) {
  return <MafiaGame backHref={backHref} />
}
