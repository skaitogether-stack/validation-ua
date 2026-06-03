import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { db } from '../../../../../lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse('Не авторизовано', { status: 401 })
    }

    const lesson = await db.dbLesson.findUnique({
      where: { id }
    })

    if (!lesson || !lesson.presentationUrl) {
      return new NextResponse('Презентацію не знайдено', { status: 404 })
    }

    if (!lesson.presentationUrl.startsWith('data:application/pdf;base64,')) {
      return new NextResponse('Невірний формат презентації', { status: 400 })
    }

    // Декодуємо Base64
    const base64Data = lesson.presentationUrl.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="presentation-${id}.pdf"`,
        'Content-Length': buffer.length.toString()
      }
    })
  } catch (error: any) {
    console.error('Error fetching presentation PDF:', error)
    return new NextResponse('Внутрішня помилка', { status: 500 })
  }
}
