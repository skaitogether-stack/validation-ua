import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { geography, geographySections, geographyTopics } from '../../data/geography'
import { TopicGrid } from '../../components/topics/TopicGrid'
import { SubjectSignIn } from '../../components/topics/SubjectSignIn'

export const dynamic = 'force-dynamic'

const title = 'Географія — Validation'
const description = 'Географія, 7 клас: відеопояснення, флешкарти та тести за параграфами підручника.'

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: 'https://www.validation.com.ua/geography',
    siteName: 'Validation',
    locale: 'uk_UA',
    type: 'website'
  }
}

export default async function GeographyPage() {
  if (!(await getServerSession(authOptions))) {
    return <SubjectSignIn callbackUrl="/geography" icon="🌍" title="Географія, 7 клас" />
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">🌍 Географія</h1>
      <p className="text-sm text-gray-500 mb-6">
        7 клас, за підручником С. Коберніка та Р. Коваленка (2024). Оберіть параграф: перегляньте відео, повторіть терміни на флешкартах і перевірте себе тестом.
      </p>
      <TopicGrid subject={geography} sections={geographySections} topics={geographyTopics} />
    </main>
  )
}
