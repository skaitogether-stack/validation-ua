import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { DictationClient } from '../../components/DictationClient'
import { DictationSignIn } from '../../components/DictationSignIn'

export const dynamic = 'force-dynamic'

const title = 'Словниковий диктант — Validation'
const description =
  'Сфотографуйте нові слова — отримайте переклад і тренування до нуля помилок. Підготовка до словникового диктанту з іноземної мови.'

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: 'https://www.validation.com.ua/dictation',
    siteName: 'Validation',
    locale: 'uk_UA',
    type: 'website'
  }
}

export default async function DictationPage() {
  const session = await getServerSession(authOptions)

  // Окремий від кабінетів вхід: після авторизації користувач повертається одразу сюди
  if (!session) return <DictationSignIn />

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">📝 Словниковий диктант</h1>
      <p className="text-sm text-gray-500 mb-6">
        Завантажте фото зі словами або вставте їх текстом — ми додамо переклад і підготуємо тренування.
      </p>
      <DictationClient />
    </main>
  )
}
