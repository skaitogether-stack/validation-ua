import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { createRoom, sanitizeLobby, sanitizeName } from '../../../../../lib/games/mafia/rooms'

export const dynamic = 'force-dynamic'

// Створює онлайн-кімнату. Ведучий — користувач, що увійшов; гравці приєднуються за запрошенням.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }
  const body = await req.json().catch(() => null)
  const name = sanitizeName(body?.name)
  if (!name) return NextResponse.json({ error: 'Вкажіть своє ім’я' }, { status: 400 })

  const room = await createRoom(name, sanitizeLobby(body?.lobby), session.user.id)
  return NextResponse.json(room)
}
