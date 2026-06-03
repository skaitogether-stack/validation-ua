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

    const body = await req.json()
    const { presentationPdf } = body

    if (!presentationPdf || !presentationPdf.startsWith('data:application/pdf;base64,')) {
      return NextResponse.json({ error: 'Некоректний формат файлу. Будь ласка, завантажте PDF.' }, { status: 400 })
    }

    await db.dbLesson.update({
      where: { id },
      data: { presentationUrl: presentationPdf }
    })

    return NextResponse.json({ 
      success: true, 
      presentationUrl: `/api/lessons/${id}/presentation-pdf`
    }, { status: 200 })

  } catch (error: any) {
    console.error('Error uploading presentation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
