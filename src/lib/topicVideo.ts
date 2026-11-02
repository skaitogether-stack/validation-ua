import { existsSync } from 'node:fs'
import path from 'node:path'

// Локальне відео показуємо, лише якщо файл уже завантажено в public/
export function availableVideo(video?: string): string | undefined {
  if (!video) return undefined
  if (/^https?:\/\//.test(video)) return video
  return existsSync(path.join(process.cwd(), 'public', video)) ? video : undefined
}
