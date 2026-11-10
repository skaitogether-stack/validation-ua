import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import { geography, geographyTopics } from '../../../data/geography'
import { africa } from '../../../data/geography/tropics'
import type { GameQuestion } from '../../../components/biology/PlantRunnerGame'
import { SpaceShooterGame } from '../../../components/geography/SpaceShooterGame'
import { SubjectSignIn } from '../../../components/topics/SubjectSignIn'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Гра «Зоряний патруль» — Географія — Validation',
  description: 'Гра-повторення теми «Африка»: збивай ворожі кораблі й астероїди та відповідай на питання.'
}

export default async function GeographyGamePage() {
  if (!(await getServerSession(authOptions))) {
    return <SubjectSignIn callbackUrl="/geography/game" icon="🌍" title="Географія, 7 клас" />
  }

  const pool: GameQuestion[] = geographyTopics
    .filter(topic => topic.section === africa.section)
    .flatMap(topic =>
      topic.questions.map(q => ({
        paragraph: topic.paragraph,
        text: q.text,
        correct: q.options[q.correct],
        wrong: q.options.filter((_, i) => i !== q.correct),
        explanation: q.explanation
      }))
    )

  return <SpaceShooterGame pool={pool} sectionTitle={africa.section} backHref={geography.href} />
}
