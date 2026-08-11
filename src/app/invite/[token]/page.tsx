import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import { db } from '../../../lib/db'
import { InviteAcceptClient } from '../../../components/InviteAcceptClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ token: string }>
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Адміністратор',
  teacher: 'Вчитель',
  student: 'Учень',
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params

  const invite = await db.invite.findUnique({
    where: { token },
    include: { school: true },
  })

  if (!invite) {
    return (
      <InviteStatusScreen
        title="Запрошення не знайдено"
        text="Перевірте посилання або зверніться до адміністратора школи за новим запрошенням."
      />
    )
  }

  if (invite.status !== 'pending') {
    return (
      <InviteStatusScreen
        title="Це запрошення вже використано"
        text="Якщо це ваш акаунт, просто увійдіть."
        loginLink
      />
    )
  }

  const classIds: string[] = JSON.parse(invite.classIds || '[]')
  const classes = classIds.length
    ? await db.class.findMany({ where: { id: { in: classIds } } })
    : []
  const classLabels = classes.map((c) => c.label)

  const session = await getServerSession(authOptions)

  return (
    <InviteAcceptClient
      token={token}
      schoolName={invite.school.name}
      roleLabel={ROLE_LABEL[invite.role] || invite.role}
      classLabels={classLabels}
      inviteEmail={invite.email}
      sessionEmail={session?.user?.email ?? null}
    />
  )
}

function InviteStatusScreen({
  title,
  text,
  loginLink,
}: {
  title: string
  text: string
  loginLink?: boolean
}) {
  return (
    <main className="min-h-screen bg-linear-to-br from-blue-50 via-slate-50 to-emerald-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl border border-gray-100 shadow-xl p-8 text-center">
        <div className="text-4xl mb-4">🔗</div>
        <h1 className="text-xl font-extrabold text-gray-800 mb-2">{title}</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">{text}</p>
        {loginLink && (
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all"
          >
            Перейти до входу
          </a>
        )}
      </div>
    </main>
  )
}
