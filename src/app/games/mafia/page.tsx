import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import { GamesSignIn } from '../../../components/games/GamesSignIn'
import { MafiaGameLoader } from '../../../components/games/mafia/MafiaGameLoader'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Мафія — Ігри — Validation',
  description: 'Класична «Мафія» для компанії від 5 гравців: телефон сам веде гру, тож грають усі.'
}

export default async function MafiaPage() {
  if (!(await getServerSession(authOptions))) return <GamesSignIn callbackUrl="/games/mafia" />
  return <MafiaGameLoader backHref="/games" />
}
