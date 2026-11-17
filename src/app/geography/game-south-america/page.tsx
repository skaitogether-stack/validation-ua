import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import { geography, geographyTopics } from '../../../data/geography'
import { southAmerica } from '../../../data/geography/tropics'
import { toGameQuestions } from '../../../components/games/quiz'
import { AndesOperationGame } from '../../../components/geography/AndesOperationGame'
import { SubjectSignIn } from '../../../components/topics/SubjectSignIn'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Гра «Операція „Анди“» — Географія — Validation',
  description: 'Гра-повторення теми «Південна Америка»: встигни влучити в терористів і дай відповідь на питання.'
}

export default async function SouthAmericaGamePage() {
  if (!(await getServerSession(authOptions))) {
    return <SubjectSignIn callbackUrl="/geography/game-south-america" icon="🌍" title="Географія, 7 клас" />
  }

  return (
    <AndesOperationGame
      pool={toGameQuestions(geographyTopics, southAmerica.section)}
      sectionTitle={southAmerica.section}
      backHref={geography.href}
    />
  )
}
