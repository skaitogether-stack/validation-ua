import type { Metadata } from 'next'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { biology, biologySections, biologyTopics } from '../../data/biology'
import { theme4 } from '../../data/biology/theme4'
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
      <TopicGrid
        subject={biology}
        sections={biologySections}
        topics={biologyTopics}
        sectionExtras={{
          [theme4.section]: (
            <Link
              href="/biology/game"
              className="flex items-center gap-4 rounded-2xl border border-emerald-200 border-t-4 border-t-amber-400 bg-emerald-50 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:col-span-2"
            >
              <div className="w-11 h-11 shrink-0 rounded-xl bg-white border border-emerald-100 flex items-center justify-center text-xl">🎮</div>
              <div>
                <div className="text-lg font-bold text-gray-900">Гра «Пригоди паростка»</div>
                <div className="text-sm text-gray-600">Повторення всієї теми: біжи, стрибай і дай відповідь на 20 питань за 5 хвилин</div>
              </div>
            </Link>
          )
        }}
      />
    </main>
  )
}
