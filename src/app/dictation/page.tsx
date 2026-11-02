import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { headers } from 'next/headers'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { DictationClient } from '../../components/DictationClient'
import { StandaloneSignIn } from '../../components/StandaloneSignIn'
import { detectInAppBrowser } from '../../lib/inAppBrowser'
import { db } from '../../lib/db'
import { parseWordsJson } from '../../lib/dictation'

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

const SIGN_IN_STEPS = [
  { icon: '📷', title: 'Сфотографуйте слова', text: 'Сторінку підручника чи зошита — або просто вставте список текстом.' },
  { icon: '🌐', title: 'Отримайте переклад', text: 'Ми розпізнаємо слова й одразу додамо найуживаніший переклад.' },
  { icon: '✍️', title: 'Тренуйтеся до нуля помилок', text: 'Бачите переклад — пишете слово. І так доки все не буде без помилок.' }
]

export default async function DictationPage() {
  const session = await getServerSession(authOptions)

  // Окремий від кабінетів вхід: після авторизації користувач повертається одразу сюди
  if (!session) {
    const inApp = detectInAppBrowser((await headers()).get('user-agent'))
    return (
      <StandaloneSignIn
        inApp={inApp}
        callbackUrl="/dictation"
        icon="📝"
        title="Підготовка до словникового диктанту"
        subtitle="Вивчайте нові слова з іноземної мови швидко й без зубріння."
        steps={SIGN_IN_STEPS}
        note="Безкоштовно. Вхід потрібен, щоб зберігати ваші списки слів."
      />
    )
  }

  const wordSet = await db.dictationWordSet.findUnique({ where: { userId: session.user.id } })
  const saved = wordSet && { items: parseWordsJson(wordSet.wordsJson), updatedAt: wordSet.updatedAt.toISOString() }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">📝 Словниковий диктант</h1>
      <p className="text-sm text-gray-500 mb-6">
        Завантажте фото зі словами або вставте їх текстом — ми додамо переклад і підготуємо тренування.
      </p>
      <DictationClient initialSaved={saved} />
    </main>
  )
}
