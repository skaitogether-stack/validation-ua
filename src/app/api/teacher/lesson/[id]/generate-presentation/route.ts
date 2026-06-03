import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../auth/[...nextauth]/route'
import { db } from '../../../../../../lib/db'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
    }

    const { id } = await params

    // Знаходимо урок та перевіряємо, чи належить джерело поточному вчителю
    const lesson = await db.dbLesson.findUnique({
      where: { id },
      include: {
        source: true
      }
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Урок не знайдено' }, { status: 404 })
    }

    const isOwner = lesson.source.userId === session.user.id || session.user.role === 'admin'
    if (!isOwner) {
      return NextResponse.json({ error: 'Немає прав на редагування цього уроку' }, { status: 403 })
    }

    // MVP Обмеження: 1 презентація на акаунт (окрім nik.fly.80@gmail.com)
    const isExempt = session.user.email?.toLowerCase() === 'nik.fly.80@gmail.com'
    if (!isExempt) {
      const generatedCount = await db.dbLesson.count({
        where: {
          source: {
            userId: session.user.id
          },
          presentationUrl: {
            not: null
          }
        }
      })

      if (generatedCount >= 1) {
        return NextResponse.json({ 
          error: 'На етапі MVP встановлено обмеження: дозволено згенерувати лише 1 презентацію на акаунт.' 
        }, { status: 400 })
      }
    }

    // Генеруємо презентацію шляхом збереження URL у БД
    const presentationUrl = `/lessons/${id}/presentation`
    
    await db.dbLesson.update({
      where: { id },
      data: { presentationUrl }
    })

    return NextResponse.json({ 
      success: true, 
      presentationUrl 
    }, { status: 200 })

  } catch (error: any) {
    console.error('Error generating presentation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
