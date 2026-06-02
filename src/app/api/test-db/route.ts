import { NextRequest, NextResponse } from 'next/server'
import { db } from '../../../lib/db'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    env: {
      DATABASE_URL: process.env['DATABASE_URL'] ? 'DEFINED (hidden for security)' : 'UNDEFINED',
      NODE_ENV: process.env.NODE_ENV,
    },
    dbFileChecks: {},
  }

  // Перевірка файлу БД, якщо це локальний файл
  const dbUrl = process.env['DATABASE_URL'] || ''
  diagnostics.rawDbUrl = dbUrl

  if (dbUrl.startsWith('file:')) {
    const dbPath = dbUrl.replace('file:', '')
    diagnostics.dbFileChecks.resolvedPath = dbPath
    diagnostics.dbFileChecks.exists = fs.existsSync(dbPath)
    
    try {
      const dir = path.dirname(dbPath)
      diagnostics.dbFileChecks.dirExists = fs.existsSync(dir)
      diagnostics.dbFileChecks.dirWritable = false
      
      // Спробуємо створити тимчасовий файл у тій же директорії для перевірки прав запису
      const tempFile = path.join(dir, '.write-test')
      fs.writeFileSync(tempFile, 'test')
      fs.unlinkSync(tempFile)
      diagnostics.dbFileChecks.dirWritable = true
    } catch (e: any) {
      diagnostics.dbFileChecks.error = e.message
    }
  }

  // Тестуємо Prisma запит
  try {
    const usersCount = await db.user.count()
    diagnostics.prisma = {
      status: 'OK',
      usersCount,
    }
  } catch (e: any) {
    diagnostics.prisma = {
      status: 'ERROR',
      error: e.message,
      stack: e.stack,
    }
  }

  return NextResponse.json(diagnostics)
}
