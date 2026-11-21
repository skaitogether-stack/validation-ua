import { NextRequest, NextResponse } from 'next/server'
import { applyRoomAction, type RoomAction } from '../../../../../../../lib/games/mafia/rooms'

export const dynamic = 'force-dynamic'

// Будь-яка дія в кімнаті: налаштування лобі, старт, хід у грі тощо.
// Права перевіряються на сервері за токеном пристрою.
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const body = await req.json().catch(() => null)
  const action = body?.action as RoomAction | undefined
  if (!action || typeof action.type !== 'string') {
    return NextResponse.json({ error: 'Некоректна дія' }, { status: 400 })
  }
  const result = await applyRoomAction(code, req.headers.get('x-player-token'), action)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
  if ('left' in result) return NextResponse.json({ left: true })
  return NextResponse.json(result.room)
}
