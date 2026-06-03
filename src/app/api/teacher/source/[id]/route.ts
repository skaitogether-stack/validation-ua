import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { db } from '../../../../../lib/db'

export const dynamic = 'force-dynamic'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
    }

    const { id } = await params

    // Знаходимо джерело та перевіряємо власника
    const source = await db.source.findUnique({
      where: { id },
      include: { lessons: true }
    })

    if (!source) {
      return NextResponse.json({ error: 'Джерело не знайдено' }, { status: 404 })
    }

    const isOwner = source.userId === session.user.id || session.user.role === 'admin'
    if (!isOwner) {
      return NextResponse.json({ error: 'Немає прав на видалення цього матеріалу' }, { status: 403 })
    }

    // Збираємо ID уроків для видалення пов'язаних результатів тестів
    const lessonIds = source.lessons.map(l => l.id)

    // Видаляємо результати
    if (lessonIds.length > 0) {
      try {
        await db.result.deleteMany({
          where: {
            lessonId: { in: lessonIds }
          }
        })
      } catch (e) {
        console.warn('Failed to delete associated results:', e)
      }
    }

    // Видаляємо джерело (onDelete: Cascade у схемі видалить DbLesson та DbQuestion)
    await db.source.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting source:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
