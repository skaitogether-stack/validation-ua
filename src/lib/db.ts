import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import path from 'path'

// LibSQL URI парсер:
// - file:relative/path  → authority=undefined → ОК
// - file:/absolute/path → authority=undefined → ОК  
// - file://host/path    → authority={host} → перевірка хоста → URL_INVALID!
// - Тому використовуємо формат БЕЗ подвійного слеша:
import fs from 'fs'

// Очищаємо некоректну змінну оточення DATABASE_URL та встановлюємо REAL_DATABASE_URL перед ініціалізацією клієнта
let dbUrl = process.env['DATABASE_URL']
if (!dbUrl || dbUrl === 'undefined' || dbUrl === 'null' || dbUrl.trim() === '') {
  dbUrl = `file:${path.resolve(process.cwd(), 'dev.db')}`
}

process.env['REAL_DATABASE_URL'] = dbUrl
process.env['DATABASE_URL'] = dbUrl
process.env.REAL_DATABASE_URL = dbUrl
process.env.DATABASE_URL = dbUrl

console.log('LibSQL DB URL:', dbUrl)

// Гарантуємо, що директорія існує під час білду (бо Railway монтує Volume тільки в runtime)
if (dbUrl.startsWith('file:')) {
  const dbPath = dbUrl.replace('file:', '')
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true })
    } catch (e) {
      console.warn("Could not create directory for DB, might be a build phase issue:", e)
    }
  }
}

const adapter = new PrismaLibSql({
  url: dbUrl,
});

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

// Примусово очищаємо кеш клієнта під час гарячого перезавантаження
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = undefined;
}

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
