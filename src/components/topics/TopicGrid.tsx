import type { ReactNode } from 'react'
import Link from 'next/link'
import type { Subject, Topic } from '../../data/topics'
import { TopicProgressBadge } from './TopicProgressBadge'

// Список параграфів предмета, згрупований за розділами підручника
// sectionExtras — додаткова картка наприкінці розділу (напр. гра-повторення теми)
export function TopicGrid({
  subject,
  sections,
  topics,
  sectionExtras
}: {
  subject: Subject
  sections: string[]
  topics: Topic[]
  sectionExtras?: Record<string, ReactNode>
}) {
  return (
    <div className="flex flex-col gap-8">
      {sections.map(section => (
        <section key={section}>
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">{section}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {topics
              .filter(topic => topic.section === section)
              .map(topic => (
                <Link
                  key={topic.id}
                  href={`${subject.href}/${topic.id}`}
                  className="flex flex-col gap-3 rounded-2xl border border-gray-100 border-t-4 border-t-emerald-400 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-xl">
                        {topic.icon}
                      </div>
                      <span className="text-sm font-bold text-emerald-700">§ {topic.paragraph}</span>
                    </div>
                    <TopicProgressBadge progressKey={subject.progressKey} topicId={topic.id} />
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
            {sectionExtras?.[section]}
          </div>
        </section>
      ))}
    </div>
  )
}
