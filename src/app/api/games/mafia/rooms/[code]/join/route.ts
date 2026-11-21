import { NextRequest, NextResponse } from 'next/server'
import { joinRoom, sanitizeName } from '../../../../../../../lib/games/mafia/rooms'

export const dynamic = 'force-dynamic'

// Приєднання за запрошенням. Акаунт не потрібен: пристрій отримує токен гравця.
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const body = await req.json().catch(() => null)
  const name = sanitizeName(body?.name)
  if (!name) return NextResponse.json({ error: 'Вкажіть своє ім’я' }, { status: 400 })

  const result = await joinRoom(code, name)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result)
}
