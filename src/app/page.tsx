import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { headers } from 'next/headers'
// import { redirect } from 'next/navigation'
// import { SubjectCard } from '../components/SubjectCard'
// import { subjects } from '../data/subjects'
import { StandaloneSignIn } from '../components/StandaloneSignIn'
import { detectInAppBrowser } from '../lib/inAppBrowser'
import { authOptions } from './api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

const SECTIONS = [
  {
    href: '/biology',
    icon: '🧬',
    title: 'Біологія',
    text: '7 клас: відео, флешкарти й тести за параграфами підручника.',
    accent: 'border-t-emerald-400'
  },
  {
    href: '/geography',
    icon: '🌍',
    title: 'Географія',
    text: '7 клас: відео, флешкарти й тести за параграфами підручника.',
    accent: 'border-t-blue-400'
  },
  {
    href: '/dictation',
    icon: '📝',
    title: 'Диктант',
    text: 'Словниковий диктант: сфотографуйте слова й тренуйтеся до нуля помилок.',
    accent: 'border-t-amber-400'
  }
]

const SIGN_IN_STEPS = SECTIONS.map(({ icon, title, text }) => ({ icon, title, text }))

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  // Окремі входи учня та вчителя (/login) тимчасово вимкнено —
  // авторизація така сама, як у розділах «Біологія», «Географія» та «Диктант»
  // if (!session) redirect('/login')
  if (!session) {
    const inApp = detectInAppBrowser((await headers()).get('user-agent'))
    return (
      <StandaloneSignIn
        inApp={inApp}
        callbackUrl="/"
        icon="🇺🇦"
        title="Validation"
        subtitle="Готуйтеся до уроків: біологія, географія та словниковий диктант."
        steps={SIGN_IN_STEPS}
        note="Безкоштовно. Вхід через Google займає кілька секунд."
      />
    )
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">Оберіть розділ</h1>
      <p className="text-sm text-gray-500 mb-6">Перейдіть до предмета або до підготовки до словникового диктанту.</p>

      <div className="grid gap-4 sm:grid-cols-3">
        {SECTIONS.map(section => (
          <Link
            key={section.href}
            href={section.href}
            className={`flex flex-col gap-3 rounded-2xl border border-gray-100 border-t-4 ${section.accent} bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md`}
          >
            <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-xl">
              {section.icon}
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">{section.title}</div>
              <div className="text-sm text-gray-600">{section.text}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Попередній екран учня з предметами кабінету — тимчасово вимкнено
      <div className="grid grid-cols-2 gap-4">
        {subjects.map(subject => (
          <SubjectCard key={subject.id} subject={subject} />
        ))}
      </div>
      */}
    </main>
  )
}
