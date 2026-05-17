import { lessons } from '../../../../data/lessons'
import { questionsByLesson } from '../../../../data/questions'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { LessonQuiz } from '../../../../components/LessonQuiz'

interface Props {
  params: Promise<{ id: string }>
}

export default async function QuizPage({ params }: Props) {
  const resolvedParams = await params
  const id = resolvedParams.id
  
  const lesson    = lessons.find(l => l.id === id)
  const questions = questionsByLesson[id] ?? []

  if (!lesson || questions.length === 0) notFound()

  return (
    <main className="max-w-2xl mx-auto p-6">
      <Link href={`/lessons/${id}`} className="text-sm text-gray-500 mb-6 block hover:text-gray-800 transition-colors">
        ← Повернутися до уроку
      </Link>
      
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{lesson.icon}</span>
          <h1 className="text-2xl font-bold">Тест: {lesson.title}</h1>
        </div>
        <p className="text-gray-500">{lesson.desc}</p>
      </div>

      <LessonQuiz lessonId={id} questions={questions} />
    </main>
  )
}
