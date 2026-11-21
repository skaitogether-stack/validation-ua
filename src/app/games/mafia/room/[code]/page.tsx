import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { OnlineRoomLoader } from '../../../../../components/games/mafia/online/OnlineRoomLoader'
import { normalizeCode } from '../../../../../lib/games/mafia/rooms'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Запрошення до гри «Мафія» — Validation',
  description: 'Приєднуйся до гри «Мафія»: кожен грає зі свого телефона.'
}

// Сторінка кімнати відкривається за запрошенням без входу через Google:
// гравця впізнаємо за токеном пристрою, а не за акаунтом
export default async function MafiaRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await params).code)
  if (code.length !== 5) notFound()
  return <OnlineRoomLoader code={code} />
}
