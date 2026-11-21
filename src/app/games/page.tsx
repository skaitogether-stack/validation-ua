import type { Metadata } from 'next'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { GamesSignIn } from '../../components/games/GamesSignIn'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ігри — Validation',
  description: 'Міні-ігри для компанії, щоб відпочити й відволіктися.'
}

const GAMES = [
  {
    href: '/games/mafia',
    icon: '🕶️',
    title: 'Мафія',
    text: 'Місто засинає… Хто ж мафія? Телефон сам веде гру, тож грають усі.',
    players: '5–12 гравців',
    time: '15–30 хв'
  }
]

export default async function GamesPage() {
  if (!(await getServerSession(authOptions))) return <GamesSignIn callbackUrl="/games" />

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-bold">Ігри 🎲</h1>
      <p className="mb-6 text-sm text-gray-500">Короткі ігри, щоб відпочити й переключитися.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {GAMES.map(game => (
          <Link
            key={game.href}
            href={game.href}
            className="flex flex-col gap-3 rounded-2xl border border-gray-100 border-t-4 border-t-indigo-400 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-xl">{game.icon}</div>
            <div>
              <div className="text-lg font-bold text-gray-900">{game.title}</div>
              <div className="text-sm text-gray-600">{game.text}</div>
            </div>
            <div className="flex gap-2 text-xs font-semibold text-gray-500">
              <span className="rounded-full bg-gray-100 px-2.5 py-1">👥 {game.players}</span>
              <span className="rounded-full bg-gray-100 px-2.5 py-1">⏱️ {game.time}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
