import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { DictationClient } from '../../components/DictationClient'

export const dynamic = 'force-dynamic'

export default async function DictationPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

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
