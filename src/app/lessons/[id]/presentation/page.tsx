import { lessons as staticLessons } from '../../../../data/lessons'
import { notFound } from 'next/navigation'
import { PresentationClient } from '../../../../components/PresentationClient'
import { db } from '../../../../lib/db'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PresentationPage({ params }: Props) {
  const resolvedParams = await params
  const id = resolvedParams.id

  // 1. Шукаємо в базі даних (уроки створені вчителем)
  const dbLesson = await db.dbLesson.findUnique({
    where: { id }
  })

  let lessonData = null

  if (dbLesson) {
    lessonData = {
      id: dbLesson.id,
      title: dbLesson.title,
      desc: dbLesson.desc,
      subjectId: dbLesson.subjectId,
      content: JSON.parse(dbLesson.contentJson)
    }
  } else {
    // 2. Якщо в БД немає, шукаємо в статичних файлах
    const staticLesson = staticLessons.find(l => l.id === id)
    if (staticLesson && staticLesson.content) {
      lessonData = {
        id: staticLesson.id,
        title: staticLesson.title,
        desc: staticLesson.desc,
        subjectId: staticLesson.subjectId,
        content: staticLesson.content
      }
    }
  }

  if (!lessonData) {
    notFound()
  }

  return <PresentationClient lesson={lessonData} />
}
