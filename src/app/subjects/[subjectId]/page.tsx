import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { LessonCard } from '../../../components/LessonCard'
import { lessons } from '../../../data/lessons'
import { subjects } from '../../../data/subjects'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import { db } from '../../../lib/db'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ subjectId: string }>
}

export default async function SubjectPage({ params }: Props) {
  const resolvedParams = await params
  const subjectId = resolvedParams.subjectId

  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const subject = subjects.find(s => s.id === subjectId)
  if (!subject) notFound()

  // 1. Отримуємо статичні уроки
  const staticSubjectLessons = lessons.filter(l => l.subjectId === subjectId)

  // 2. Отримуємо динамічні уроки з БД
  const dbLessons = await db.dbLesson.findMany({
    where: { subjectId },
    orderBy: { createdAt: 'asc' }
  })

  // 3. Отримуємо результати цього учня
  const userResults = await db.result.findMany({
    where: { userId: session.user.id }
  })

  // 4. Об'єднуємо та обчислюємо прогрес
  const mergedLessons = [
    ...staticSubjectLessons.map(l => {
      const hasCompleted = userResults.some(r => r.lessonId === l.id)
      if (hasCompleted) {
        return {
          ...l,
          status: 'done' as const,
          statusLabel: 'Пройдено',
          progress: 100
        }
      }
      return l
    }),
    ...dbLessons.map(dl => {
      const hasCompleted = userResults.some(r => r.lessonId === dl.id)
      return {
        subjectId: dl.subjectId,
        id: dl.id,
        title: dl.title,
        desc: dl.desc,
        icon: dl.icon,
        xp: dl.xp,
        progress: hasCompleted ? 100 : 0,
        status: (hasCompleted ? 'done' : 'active') as 'done' | 'active',
        statusLabel: hasCompleted ? 'Пройдено' : 'Активний',
      }
    })
  ]

  return (
    <main className="max-w-3xl mx-auto p-6">
      <Link href="/" className="text-sm text-gray-500 mb-6 block hover:text-gray-800 transition-colors">
        ← Назад до предметів
      </Link>
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{subject.icon}</span>
          <h1 className="text-2xl font-bold">{subject.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{session.user?.name}</span>
          {session.user?.image ? (
            <img
              src={session.user.image}
              className="w-8 h-8 rounded-full"
              alt="avatar"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
              {session.user?.name?.slice(0, 2).toUpperCase() || 'U'}
            </div>
          )}
        </div>
      </div>

      {mergedLessons.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {mergedLessons.map(lesson => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-center py-12">Уроків для цього предмета ще немає</p>
      )}
    </main>
  )
}
