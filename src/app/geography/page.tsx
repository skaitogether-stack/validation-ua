import type { Metadata } from 'next'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { geography, geographySections, geographyTopics } from '../../data/geography'
import { africa } from '../../data/geography/tropics'
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
      <TopicGrid
        subject={geography}
        sections={geographySections}
        topics={geographyTopics}
        sectionExtras={{
          [africa.section]: (
            <Link
              href="/geography/game"
              className="flex items-center gap-4 rounded-2xl border border-indigo-200 border-t-4 border-t-amber-400 bg-indigo-50 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:col-span-2"
            >
              <div className="w-11 h-11 shrink-0 rounded-xl bg-white border border-indigo-100 flex items-center justify-center text-xl">🚀</div>
              <div>
                <div className="text-lg font-bold text-gray-900">Гра «Зоряний патруль»</div>
                <div className="text-sm text-gray-600">Повторення теми «Африка»: збивай кораблі й астероїди та дай відповідь на 20 питань за 5 хвилин</div>
              </div>
            </Link>
          )
        }}
      />
    </main>
  )
}
