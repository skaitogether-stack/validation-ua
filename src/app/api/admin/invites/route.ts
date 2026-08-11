import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { db } from '../../../../lib/db'

export const dynamic = 'force-dynamic'

const VALID_ROLES = ['admin', 'teacher', 'student']

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
    }

    const adminUser = await db.user.findUnique({ where: { id: session.user.id } })
    if (!adminUser || adminUser.role !== 'admin' || !adminUser.schoolId) {
      return NextResponse.json({ error: 'Доступ дозволено тільки адміністраторам школи' }, { status: 403 })
    }

    const body = await req.json()
    const email = String(body.email || '').toLowerCase().trim()
    const role = body.role
    const classIds: string[] = Array.isArray(body.classIds) ? body.classIds : []

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Вкажіть коректний email' }, { status: 400 })
    }
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Невірна роль' }, { status: 400 })
    }
    if (role === 'student' && classIds.length !== 1) {
      return NextResponse.json({ error: 'Оберіть клас учня' }, { status: 400 })
    }
    if (role === 'teacher' && classIds.length === 0) {
      return NextResponse.json({ error: 'Оберіть хоча б один клас, який веде вчитель' }, { status: 400 })
    }

    if (classIds.length > 0) {
      const validCount = await db.class.count({
        where: { id: { in: classIds }, schoolId: adminUser.schoolId },
      })
      if (validCount !== classIds.length) {
        return NextResponse.json({ error: 'Один із класів не належить вашій школі' }, { status: 400 })
      }
    }

    const existingActiveUser = await db.user.findFirst({
      where: { email, schoolId: adminUser.schoolId, deletedAt: null },
    })
    if (existingActiveUser) {
      return NextResponse.json({ error: 'Цей email вже є користувачем школи' }, { status: 409 })
    }

    // Якщо для цього email уже є pending-запрошення в цій школі — оновлюємо його замість дубліката
    const existingPending = await db.invite.findFirst({
      where: { email, schoolId: adminUser.schoolId, status: 'pending' },
    })

    const invite = existingPending
      ? await db.invite.update({
          where: { id: existingPending.id },
          data: { role, classIds: JSON.stringify(classIds), sentAt: new Date(), invitedById: adminUser.id },
        })
      : await db.invite.create({
          data: {
            schoolId: adminUser.schoolId,
            email,
            role,
            classIds: JSON.stringify(classIds),
            invitedById: adminUser.id,
          },
        })

    return NextResponse.json({ success: true, token: invite.token }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating invite:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
