'use client'

import dynamic from 'next/dynamic'

// Кімната читає токен пристрою з localStorage, тому рендеримо її лише в браузері
const OnlineRoom = dynamic(() => import('./OnlineRoom').then(m => m.OnlineRoom), {
  ssr: false,
  loading: () => <div className="py-20 text-center text-gray-400">Підключення до кімнати…</div>
})

export function OnlineRoomLoader({ code }: { code: string }) {
  return <OnlineRoom code={code} />
}
