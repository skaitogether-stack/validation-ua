import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { biology, biologySections, biologyTopics } from '../../data/biology'
import { TopicGrid } from '../../components/topics/TopicGrid'
import { SubjectSignIn } from '../../components/topics/SubjectSignIn'

export const dynamic = 'force-dynamic'

const title = 'Біологія — Validation'
const description = 'Біологія, 7 клас: відеопояснення, флешкарти та тести за параграфами підручника.'

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: 'https://www.validation.com.ua/biology',
    siteName: 'Validation',
    locale: 'uk_UA',
    type: 'website'
  }
}

export default async function BiologyPage() {
  if (!(await getServerSession(authOptions))) {
    return <SubjectSignIn callbackUrl="/biology" icon="🧬" title="Біологія, 7 клас" />
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">🧬 Біологія</h1>
      <p className="text-sm text-gray-500 mb-6">
        7 клас, за підручником П. Балана та ін. (2024). Оберіть параграф: перегляньте відео, повторіть терміни на флешкартах і перевірте себе тестом.
      </p>
      <TopicGrid subject={biology} sections={biologySections} topics={biologyTopics} />
    </main>
  )
}
