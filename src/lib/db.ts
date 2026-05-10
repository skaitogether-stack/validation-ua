import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client/sqlite3'
import path from 'path'

// LibSQL URI парсер:
// - file:relative/path  → authority=undefined → ОК
// - file:/absolute/path → authority=undefined → ОК  
// - file://host/path    → authority={host} → перевірка хоста → URL_INVALID!
// Тому використовуємо формат БЕЗ подвійного слеша:
import fs from 'fs'

// Якщо є DATABASE_URL з оточення (наприклад, на Railway) - використовуємо його,
// інакше генеруємо локальний шлях для розробки.
const dbUrl = process.env.DATABASE_URL || `file:${path.resolve(process.cwd(), 'dev.db')}`

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

let libsql;
try {
  libsql = createClient({
    url: dbUrl,
  });
} catch (e) {
  console.warn("LIBSQL CREATECLIENT FAILED, using in-memory fallback for build phase:", e.message);
  libsql = createClient({ url: 'file:./fallback.db' });
}

const adapter = new PrismaLibSql(libsql as any);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

// Примусово очищаємо кеш клієнта під час гарячого перезавантаження
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = undefined;
}

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
