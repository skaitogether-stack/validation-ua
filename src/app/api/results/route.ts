import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

// Ініціалізуємо LibSQL клієнт напряму, щоб оминути всі експериментальні баги Prisma 7 + Turbopack
const dbUrl = process.env.DATABASE_URL || 'file:./dev.db'
const db = createClient({ url: dbUrl })

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { lessonId, score, total } = body

  if (!lessonId || score === undefined || !total) {
    return NextResponse.json({ error: 'Не вистачає даних' }, { status: 400 })
  }

  try {
    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    
    await db.execute({
      sql: 'INSERT INTO Result (id, lessonId, score, total, createdAt) VALUES (?, ?, ?, ?, ?)',
      args: [id, lessonId, score, total, createdAt]
    })

    return NextResponse.json({ id, lessonId, score, total, createdAt }, { status: 201 })
  } catch (error: any) {
    console.error("API POST ERROR:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const lessonId = req.nextUrl.searchParams.get('lessonId')
    let result

    if (lessonId) {
      result = await db.execute({
        sql: 'SELECT * FROM Result WHERE lessonId = ? ORDER BY createdAt DESC LIMIT 10',
        args: [lessonId]
      })
    } else {
      result = await db.execute('SELECT * FROM Result ORDER BY createdAt DESC LIMIT 10')
    }

    // LibSQL повертає результати у масиві `.rows`
    return NextResponse.json(result.rows)
  } catch (error: any) {
    console.error("API GET ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
