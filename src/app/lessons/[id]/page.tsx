import { lessons } from '../../../data/lessons'
import { questionsByLesson } from '../../../data/questions'
import { notFound } from 'next/navigation'
import Link from 'next/link'

import { LessonQuiz } from '../../../components/LessonQuiz'

// Next.js 15+ передає params як Promise
interface Props {
  params: Promise<{ id: string }>
}

export default async function LessonPage({ params }: Props) {
  const resolvedParams = await params
  const id = resolvedParams.id
  
  const lesson    = lessons.find(l => l.id === id)
  const questions = questionsByLesson[id] ?? []

  if (!lesson) notFound()

  return (
    <main className="max-w-2xl mx-auto p-6">
      <Link href={`/subjects/${lesson.subjectId}`} className="text-sm text-gray-500 mb-6 block">
        ← Назад до уроків
      </Link>
      
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">{lesson.icon}</span>
        <h1 className="text-2xl font-bold">{lesson.title}</h1>
      </div>
      <p className="text-gray-500 mb-8">{lesson.desc}</p>

      {questions.length > 0
        ? <LessonQuiz lessonId={id} questions={questions} />
        : <p className="text-gray-400 text-center py-12">Питань ще немає</p>
      }
    </main>
  )
}
