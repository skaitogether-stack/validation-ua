import { lessons as staticLessons } from '../../../../data/lessons'
import { questionsByLesson as staticQuestionsByLesson } from '../../../../data/questions'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { LessonQuiz } from '../../../../components/LessonQuiz'
import { db } from '../../../../lib/db'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function QuizPage({ params }: Props) {
  const resolvedParams = await params
  const id = resolvedParams.id
  
  // 1. Шукаємо в базі даних (уроки створені вчителем)
  const dbLesson = await db.dbLesson.findUnique({
    where: { id },
    include: { questions: true }
  })

  let lesson = null
  let questions: { id: string; text: string; options: string[]; correct: number; explanation: string }[] = []

  if (dbLesson) {
    lesson = {
      id: dbLesson.id,
      title: dbLesson.title,
      desc: dbLesson.desc,
      icon: dbLesson.icon,
      subjectId: dbLesson.subjectId
    }
    questions = dbLesson.questions.map(q => ({
      id: q.id,
      text: q.text,
      options: JSON.parse(q.optionsJson) as string[],
      correct: q.correct,
      explanation: q.explanation
    }))
  } else {
    // 2. Якщо в БД немає, шукаємо в статичних файлах
    const staticLesson = staticLessons.find(l => l.id === id)
    const staticQuestions = staticQuestionsByLesson[id] ?? []
    
    if (staticLesson && staticQuestions.length > 0) {
      lesson = staticLesson
      questions = staticQuestions
    }
  }

  if (!lesson || questions.length === 0) notFound()

  return (
    <main className="max-w-2xl mx-auto p-6">
      <Link 
        href={`/lessons/${id}`} 
        className="text-sm text-gray-500 mb-6 block hover:text-gray-800 transition-colors"
      >
        ← Повернутися до уроку
      </Link>
      
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{lesson.icon}</span>
          <h1 className="text-2xl font-bold text-gray-800">Тест: {lesson.title}</h1>
        </div>
        <p className="text-gray-500 text-sm">{lesson.desc}</p>
      </div>

      <LessonQuiz lessonId={id} questions={questions} />
    </main>
  )
}
