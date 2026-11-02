import type { Metadata } from 'next'
import Link from 'next/link'
import { biologyTopics } from '../../data/biology'
import { TopicProgressBadge } from '../../components/biology/TopicProgressBadge'

const title = 'Біологія — Validation'
const description = 'Відеопояснення, флешкарти та тести з біології. Оберіть тему й перевірте свої знання.'

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

export default function BiologyPage() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">🧬 Біологія</h1>
      <p className="text-sm text-gray-500 mb-6">
        Оберіть тему: перегляньте відео, повторіть терміни на флешкартах і перевірте себе тестом.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {biologyTopics.map(topic => (
          <Link
            key={topic.id}
            href={`/biology/${topic.id}`}
            className="flex flex-col gap-3 rounded-2xl border border-gray-100 border-t-4 border-t-emerald-400 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl">
                {topic.icon}
              </div>
              <TopicProgressBadge topicId={topic.id} />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">{topic.title}</div>
              <div className="text-sm text-gray-500">{topic.desc}</div>
            </div>
            <div className="text-xs text-gray-400">
              {topic.flashcards.length} флешкарт · {topic.questions.length} питань
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
