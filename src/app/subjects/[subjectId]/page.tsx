import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { LessonCard } from '../../../components/LessonCard'
import { lessons } from '../../../data/lessons'
import { subjects } from '../../../data/subjects'
import { authOptions } from '../../api/auth/[...nextauth]/route'

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

  const subjectLessons = lessons.filter(l => l.subjectId === subjectId)

  return (
    <main className="max-w-3xl mx-auto p-6">
      <Link href="/" className="text-sm text-gray-500 mb-6 block">
        ← Назад до предметів
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{subject.icon}</span>
          <h1 className="text-2xl font-bold">{subject.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{session.user?.name}</span>
          <img
            src={session.user?.image ?? ''}
            className="w-8 h-8 rounded-full"
            alt="avatar"
          />
        </div>
      </div>

      {subjectLessons.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {subjectLessons.map(lesson => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-center py-12">Уроків для цього предмета ще немає</p>
      )}
    </main>
  )
}
