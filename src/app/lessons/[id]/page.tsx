import { lessons as staticLessons } from '../../../data/lessons'
import { questionsByLesson as staticQuestionsByLesson } from '../../../data/questions'
import { notFound } from 'next/navigation'
import Link from 'next/link'

import { LessonMedia } from '../../../components/LessonMedia'
import { db } from '../../../lib/db'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LessonPage({ params }: Props) {
  const resolvedParams = await params
  const id = resolvedParams.id
  
  // 1. Спершу шукаємо в базі даних (уроки створені вчителем)
  const dbLesson = await db.dbLesson.findUnique({
    where: { id },
    include: { questions: true }
  })

  let lesson = null
  let questionsCount = 0

  if (dbLesson) {
    lesson = {
      subjectId: dbLesson.subjectId,
      id: dbLesson.id,
      title: dbLesson.title,
      desc: dbLesson.desc,
      icon: dbLesson.icon,
      xp: dbLesson.xp,
      progress: 0,
      status: 'active' as const,
      statusLabel: 'Активний',
      presentationUrl: dbLesson.presentationUrl || undefined,
      content: JSON.parse(dbLesson.contentJson) as { title?: string; text: string; examples?: string[] }[]
    }
    questionsCount = dbLesson.questions.length
  } else {
    // 2. Якщо в БД немає, шукаємо в статичних файлах
    const staticLesson = staticLessons.find(l => l.id === id)
    if (staticLesson) {
      lesson = staticLesson
      questionsCount = (staticQuestionsByLesson[id] ?? []).length
    }
  }

  if (!lesson) notFound()

  return (
    <main className="max-w-2xl mx-auto p-6">
      <Link 
        href={`/subjects/${lesson.subjectId}`} 
        className="text-sm text-gray-500 mb-6 block hover:text-gray-850 transition-colors"
      >
        ← Назад до уроків
      </Link>
      
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">{lesson.icon}</span>
        <h1 className="text-2xl font-bold text-gray-800">{lesson.title}</h1>
      </div>
      <p className="text-gray-500 mb-8">{lesson.desc}</p>

      <div className="space-y-6">
        <LessonMedia 
          presentationUrl={lesson.presentationUrl} 
          videoUrl={lesson.videoUrl} 
        />

        {/* Текстові правила */}
        {lesson.content && lesson.content.length > 0 && (
          <div className="space-y-6">
            {lesson.content.map((block, idx) => (
              <div key={idx} className="p-6 bg-white border border-blue-100 rounded-2xl shadow-xs">
                {block.title && <h3 className="text-lg font-bold text-blue-900 mb-3">{block.title}</h3>}
                <div className="text-gray-700 leading-relaxed whitespace-pre-wrap mb-4 text-sm font-medium">
                  {block.text}
                </div>
                {block.examples && block.examples.length > 0 && (
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                    <h4 className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wider">Приклади:</h4>
                    <ul className="space-y-2 text-sm font-medium">
                      {block.examples.map((ex, i) => (
                        <li key={i} className="flex gap-2 text-gray-755">
                          <span className="text-blue-400 font-bold">•</span>
                          <span>{ex}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Тест */}
        <div className="p-6 border rounded-2xl bg-white shadow-xs">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-green-50 text-green-500 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
              📝
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1 text-gray-800">Пройти тест</h2>
              <p className="text-gray-500 text-sm">Перевірте свої знання та закріпіть вивчене</p>
            </div>
          </div>
          
          <div className="mt-2">
            {questionsCount > 0 ? (
              <Link 
                href={`/lessons/${id}/quiz`} 
                className="inline-block px-6 py-3 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 transition-colors shadow-xs"
              >
                Почати тест
              </Link>
            ) : (
              <p className="text-gray-400 text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                Питань ще немає
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
