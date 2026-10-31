import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { db } from '../../../../lib/db'
import { VocabularyItem } from '../../../../lib/dictation'

export const dynamic = 'force-dynamic'

const MAX_WORDS = 500
const MAX_FIELD_LENGTH = 200

function parseItems(value: unknown): VocabularyItem[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_WORDS) return null
  const items: VocabularyItem[] = []
  for (const raw of value) {
    const word = typeof raw?.word === 'string' ? raw.word.trim() : ''
    const translation = typeof raw?.translation === 'string' ? raw.translation.trim() : ''
    if (!word || !translation || word.length > MAX_FIELD_LENGTH || translation.length > MAX_FIELD_LENGTH) return null
    items.push({ word, translation })
  }
  return items
}

// Зберігає єдиний набір користувача, замінюючи попередній
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const items = parseItems(body?.items)
  if (!items) {
    return NextResponse.json({ error: 'Некоректний список слів' }, { status: 400 })
  }

  const wordsJson = JSON.stringify(items)
  const wordSet = await db.dictationWordSet.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, wordsJson },
    update: { wordsJson }
  })

  return NextResponse.json({ items, updatedAt: wordSet.updatedAt.toISOString() })
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }

  await db.dictationWordSet.deleteMany({ where: { userId: session.user.id } })
  return NextResponse.json({ ok: true })
}
