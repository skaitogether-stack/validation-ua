import { cookies, headers } from 'next/headers'
import { db } from './db'

interface LoginInfo {
  userId?: string | null
  email?: string | null
  provider: string
  isNewUser: boolean
  callbackUrl?: string
}

// Визначаємо точку входу за callback-url, який NextAuth кладе в cookie перед авторизацією.
// Зберігаємо лише категорію, без повного шляху — у ньому можуть бути токени запрошень.
function sourceFromCallbackUrl(callbackUrl: string | undefined): string | null {
  if (!callbackUrl) return null
  let pathname: string
  try {
    pathname = new URL(callbackUrl, 'http://localhost').pathname
  } catch {
    return null
  }
  if (pathname.startsWith('/dictation')) return 'dictation'
  if (pathname.startsWith('/teacher') || pathname.startsWith('/admin') || pathname.startsWith('/stats')) return 'teacher'
  if (pathname.startsWith('/invite')) return 'invite'
  return 'cabinet'
}

export async function logLogin(info: LoginInfo) {
  // Журнал не повинен ламати вхід: будь-яку помилку лише пишемо в консоль
  try {
    const cookieStore = await cookies()
    const callbackUrl =
      info.callbackUrl ??
      cookieStore.get('__Secure-next-auth.callback-url')?.value ??
      cookieStore.get('next-auth.callback-url')?.value
    const userAgent = (await headers()).get('user-agent')

    await db.loginEvent.create({
      data: {
        userId: info.userId ?? null,
        email: info.email?.toLowerCase() ?? null,
        provider: info.provider,
        isNewUser: info.isNewUser,
        source: sourceFromCallbackUrl(callbackUrl),
        userAgent: userAgent?.slice(0, 500) ?? null
      }
    })
  } catch (e) {
    console.error('Error writing login event:', e)
  }
}
