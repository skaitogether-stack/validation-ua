import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { db } from '../../../../../lib/db'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Спершу увійдіть через Google' }, { status: 401 })
    }

    const { token } = await params

    const invite = await db.invite.findUnique({ where: { token } })
    if (!invite) {
      return NextResponse.json({ error: 'Запрошення не знайдено' }, { status: 404 })
    }
    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'Це запрошення вже використано' }, { status: 409 })
    }
    if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Це запрошення призначене для іншого email' },
        { status: 403 }
      )
    }

    const classIds: string[] = JSON.parse(invite.classIds || '[]')
    const userId = session.user.id

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { role: invite.role, schoolId: invite.schoolId, deletedAt: null },
      })

      if (invite.role === 'student' && classIds[0]) {
        await tx.classStudent.upsert({
          where: { classId_userId: { classId: classIds[0], userId } },
          create: { classId: classIds[0], userId },
          update: {},
        })
      }

      if (invite.role === 'teacher') {
        for (const classId of classIds) {
          await tx.classTeacher.upsert({
            where: { classId_userId: { classId, userId } },
            create: { classId, userId },
            update: {},
          })
        }
      }

      await tx.invite.update({
        where: { token },
        data: { status: 'accepted', acceptedAt: new Date() },
      })
    })

    return NextResponse.json({ success: true, role: invite.role })
  } catch (error: any) {
    console.error('Error accepting invite:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
