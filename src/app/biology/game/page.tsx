import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import { biology, biologyTopics } from '../../../data/biology'
import { theme4 } from '../../../data/biology/theme4'
import { PlantRunnerGame, type GameQuestion } from '../../../components/biology/PlantRunnerGame'
import { SubjectSignIn } from '../../../components/topics/SubjectSignIn'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Гра «Пригоди паростка» — Біологія — Validation',
  description: 'Гра-повторення теми 4 «Характерні риси та будова вищих рослин»: біжи, стрибай і відповідай на питання.'
}

export default async function BiologyGamePage() {
  if (!(await getServerSession(authOptions))) {
    return <SubjectSignIn callbackUrl="/biology/game" icon="🧬" title="Біологія, 7 клас" />
  }

  const pool: GameQuestion[] = biologyTopics
    .filter(topic => topic.section === theme4.section)
    .flatMap(topic =>
      topic.questions.map(q => ({
        paragraph: topic.paragraph,
        text: q.text,
        correct: q.options[q.correct],
        wrong: q.options.filter((_, i) => i !== q.correct),
        explanation: q.explanation
      }))
    )

  return <PlantRunnerGame pool={pool} sectionTitle={theme4.section} backHref={biology.href} />
}
