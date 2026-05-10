import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

export const dynamic = 'force-dynamic'

import fs from 'fs'
import path from 'path'

// Ініціалізуємо LibSQL клієнт напряму, щоб оминути всі експериментальні баги Prisma 7 + Turbopack
const dbUrl = process.env.DATABASE_URL || 'file:./dev.db'

// Гарантуємо, що директорія існує під час білду
if (dbUrl.startsWith('file:')) {
  const dbPath = dbUrl.replace('file:', '')
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true })
    } catch (e) {}
  }
}

let db: any;
try {
  db = createClient({ url: dbUrl })
} catch (e: any) {
  console.warn("Could not create LibSQL client, using fallback:", e.message);
  db = createClient({ url: 'file:./fallback.db' })
}

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
