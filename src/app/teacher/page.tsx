import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { db } from '../../lib/db'
import { lessons as staticLessons } from '../../data/lessons'
import { TeacherCabinetClient } from '../../components/TeacherCabinetClient'

export const dynamic = 'force-dynamic'

export default async function TeacherCabinetPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // Перевірка ролі (вчитель або адмін)
  const isTeacher = session.user?.role === 'teacher' || session.user?.role === 'admin'
  if (!isTeacher) {
    redirect('/')
  }

  // Отримуємо джерела вчителя
  const sources = await db.source.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      lessons: {
        select: {
          id: true,
          title: true,
          subjectId: true,
          createdAt: true,
        }
      }
    }
  })

  // Отримуємо всі результати тестів для перевірки прогресу учнів
  const results = await db.result.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          image: true
        }
      }
    }
  })

  // Отримуємо всі згенеровані вчителями уроки для резолвінгу імен
  const allDbLessons = await db.dbLesson.findMany({
    select: {
      id: true,
      title: true,
      subjectId: true
    }
  })

  // Підрахунок метрик
  const totalSources = sources.length
  const totalLessons = sources.reduce((acc, curr) => acc + curr.lessons.length, 0)
  const totalCompletions = results.length
  
  const avgScore = totalCompletions > 0 
    ? Math.round((results.reduce((acc, curr) => acc + (curr.score / curr.total), 0) / totalCompletions) * 100)
    : 0

  // Серіалізуємо дані для клієнтського компонента
  const serializedSources = sources.map(s => ({
    id: s.id,
    title: s.title,
    subjectId: s.subjectId,
    content: s.content,
    createdAt: s.createdAt.toISOString(),
    lessons: s.lessons.map(l => ({
      id: l.id,
      title: l.title,
      subjectId: l.subjectId,
      createdAt: l.createdAt.toISOString()
    }))
  }))

  const serializedResults = results.map(r => {
    // Резолвимо назву уроку
    const staticLesson = staticLessons.find(l => l.id === r.lessonId)
    const dbLesson = allDbLessons.find(l => l.id === r.lessonId)
    const lessonTitle = staticLesson ? staticLesson.title : (dbLesson ? dbLesson.title : `Урок #${r.lessonId}`)
    const subjectId = staticLesson ? staticLesson.subjectId : (dbLesson ? dbLesson.subjectId : 'unknown')
    
    return {
      id: r.id,
      lessonId: r.lessonId,
      lessonTitle,
      subjectId,
      score: r.score,
      total: r.total,
      createdAt: r.createdAt.toISOString(),
      user: r.user ? {
        name: r.user.name || 'Анонімний учень',
        email: r.user.email,
        image: r.user.image
      } : {
        name: 'Анонімний учень',
        email: 'Не вказано',
        image: null
      }
    }
  })

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Заголовок кабінету */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Кабінет вчителя 🎓</h1>
          <p className="text-gray-500 mt-1">Керуйте матеріалами, завантажуйте джерела та аналізуйте оцінки учнів.</p>
        </div>
      </div>

      {/* Метрики */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Джерел завантажено</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-gray-800">{totalSources}</span>
            <span className="text-emerald-500 text-sm font-semibold">📂 файли</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Згенеровано уроків</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-gray-800">{totalLessons}</span>
            <span className="text-blue-500 text-sm font-semibold">📖 тести</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Спроб проходження</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-gray-800">{totalCompletions}</span>
            <span className="text-purple-500 text-sm font-semibold">📝 роботи</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Сер. успішність</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-gray-800">{avgScore}%</span>
            <span className="text-yellow-500 text-sm font-semibold">🏆 результат</span>
          </div>
        </div>
      </div>

      {/* Інтерактивний блок вчителя */}
      <TeacherCabinetClient 
        initialSources={serializedSources} 
        initialResults={serializedResults} 
      />
    </main>
  )
}
