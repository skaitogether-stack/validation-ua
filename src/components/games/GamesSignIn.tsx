import Link from 'next/link'
import { headers } from 'next/headers'
import { detectInAppBrowser } from '../../lib/inAppBrowser'
import { StandaloneSignIn } from '../StandaloneSignIn'

const STEPS = [
  { icon: '🎲', title: 'Оберіть гру', text: 'Короткі ігри, щоб відпочити й переключитися між уроками.' },
  { icon: '👥', title: 'Грайте компанією', text: 'Один телефон на всіх: він сам веде гру, тож грають усі.' },
  { icon: '⏱️', title: '10–30 хвилин', text: 'Одна партія — якраз на перерву.' }
]

// Вхід у розділ «Ігри», як і в інші розділи: після авторизації повертаємо на ту саму сторінку
export async function GamesSignIn({ callbackUrl }: { callbackUrl: string }) {
  const inApp = detectInAppBrowser((await headers()).get('user-agent'))
  return (
    <StandaloneSignIn
      inApp={inApp}
      callbackUrl={callbackUrl}
      icon="🎲"
      title="Ігри"
      subtitle="Міні-ігри для компанії, щоб відпочити й відволіктися."
      steps={STEPS}
      note="Безкоштовно. Вхід через Google займає кілька секунд."
      extra={
        <Link
          href="/games/mafia/join"
          className="mt-6 block rounded-2xl border border-indigo-100 bg-white p-4 text-sm font-bold text-indigo-700 shadow-sm"
        >
          🔑 Маєте код кімнати від друзів? Приєднатися без входу →
        </Link>
      }
    />
  )
}
