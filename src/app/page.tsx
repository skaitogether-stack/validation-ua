import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { LessonCard } from '../components/LessonCard'
import { lessons } from '../data/lessons'
import { authOptions } from './api/auth/[...nextauth]/route'

export default async function HomePage() {
  // Перевіряємо сесію на сервері
  const session = await getServerSession(authOptions)

  // Якщо не залогінений — редіректимо на /login
  if (!session) redirect('/login')

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Уроки</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{session.user?.name}</span>
          <img
            src={session.user?.image ?? ''}
            className="w-8 h-8 rounded-full"
            alt="avatar"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {lessons.map(lesson => (
          <LessonCard key={lesson.id} lesson={lesson} />
        ))}
      </div>
    </main>
  )
}