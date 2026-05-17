import { lessons } from '../../../data/lessons'
import { questionsByLesson } from '../../../data/questions'
import { notFound } from 'next/navigation'
import Link from 'next/link'

import { LessonQuiz } from '../../../components/LessonQuiz'
import { LessonMedia } from '../../../components/LessonMedia'

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

      <div className="space-y-6">
        <LessonMedia 
          presentationUrl={lesson.presentationUrl} 
          videoUrl={lesson.videoUrl} 
        />

        {/* Тест */}
        <div className="p-6 border rounded-2xl bg-white shadow-sm">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-green-50 text-green-500 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
              📝
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">Пройти тест</h2>
              <p className="text-gray-500 text-sm">Перевірте свої знання та закріпіть вивчене</p>
            </div>
          </div>
          
          <div className="mt-2">
            {questions.length > 0
              ? <LessonQuiz lessonId={id} questions={questions} />
              : <p className="text-gray-400 text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">Питань ще немає</p>
            }
          </div>
        </div>
      </div>
    </main>
  )
}
