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
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
    }

    const adminUser = await db.user.findUnique({ where: { id: session.user.id } })
    if (!adminUser || adminUser.role !== 'admin' || !adminUser.schoolId) {
      return NextResponse.json({ error: 'Доступ дозволено тільки адміністраторам школи' }, { status: 403 })
    }

    const { id } = await params

    if (id === adminUser.id) {
      return NextResponse.json({ error: 'Не можна видалити самого себе' }, { status: 400 })
    }

    const target = await db.user.findUnique({ where: { id } })
    if (!target || target.schoolId !== adminUser.schoolId) {
      return NextResponse.json({ error: 'Користувача не знайдено' }, { status: 404 })
    }

    await db.user.update({ where: { id }, data: { deletedAt: new Date() } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error removing user:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
