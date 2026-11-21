import { NextRequest, NextResponse } from 'next/server'
import { findPlayer, loadRoom, roomResponse, touchPlayer } from '../../../../../../lib/games/mafia/rooms'

export const dynamic = 'force-dynamic'

// Стан кімнати для конкретного пристрою (опитується кожні кілька секунд).
// Без токена учасника повертає лише те, що потрібно для екрана приєднання.
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const room = await loadRoom(code)
  if (!room) return NextResponse.json({ error: 'Кімнату не знайдено' }, { status: 404 })

  const me = findPlayer(room, req.headers.get('x-player-token'))
  if (!me) {
    return NextResponse.json({
      member: false,
      code: room.code,
      status: room.status,
      playerCount: room.players.length,
      hostName: room.players.find(p => p.id === room.hostId)?.name ?? null
    })
  }
  await touchPlayer(me)
  return NextResponse.json(roomResponse(room, me.id), { headers: { 'Cache-Control': 'no-store' } })
}
