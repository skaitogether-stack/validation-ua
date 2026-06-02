import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { db } from '../../../../lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const targetRole = body.role

    const user = await db.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'Користувача не знайдено' }, { status: 404 })
    }

    // Якщо роль вказано явно - встановлюємо її, інакше перемикаємо
    let newRole = 'student'
    if (targetRole === 'teacher' || targetRole === 'student') {
      newRole = targetRole
    } else {
      newRole = user.role === 'teacher' ? 'student' : 'teacher'
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { role: newRole },
    })

    return NextResponse.json({ success: true, role: updatedUser.role })
  } catch (error: any) {
    console.error('Error switching role:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
