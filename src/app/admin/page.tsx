import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { db } from '../../lib/db'
import { AdminCabinetClient } from '../../components/AdminCabinetClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (session.user?.role !== 'admin') {
    redirect('/')
  }

  const adminUser = await db.user.findUnique({ where: { id: session.user.id } })

  if (!adminUser?.schoolId) {
    return (
      <main className="max-w-lg mx-auto p-6">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center mt-10">
          <div className="text-4xl mb-3">⚠️</div>
          <h1 className="text-lg font-black text-gray-800 mb-2">Акаунт не прив'язано до школи</h1>
          <p className="text-gray-500 text-sm">
            Зверніться до розробника платформи, щоб прив'язати ваш акаунт адміністратора до школи.
          </p>
        </div>
      </main>
    )
  }

  const schoolId = adminUser.schoolId

  const [school, users, invites, classes] = await Promise.all([
    db.school.findUnique({ where: { id: schoolId } }),
    db.user.findMany({
      where: { schoolId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        studentClasses: { include: { class: true } },
        teacherClasses: { include: { class: true } },
      },
    }),
    db.invite.findMany({
      where: { schoolId },
      orderBy: { sentAt: 'desc' },
    }),
    db.class.findMany({ where: { schoolId }, orderBy: { label: 'asc' } }),
  ])

  const classLabelById = Object.fromEntries(classes.map((c) => [c.id, c.label]))

  const serializedUsers = users.map((u) => ({
    id: u.id,
    name: u.name || 'Без імені',
    email: u.email || '—',
    role: u.role,
    classLabels:
      u.role === 'student'
        ? u.studentClasses.map((cs) => cs.class.label)
        : u.role === 'teacher'
        ? u.teacherClasses.map((ct) => ct.class.label)
        : [],
  }))

  const serializedInvites = invites.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    token: inv.token,
    status: inv.status,
    sentAt: inv.sentAt.toISOString(),
    classLabels: (JSON.parse(inv.classIds || '[]') as string[])
      .map((id) => classLabelById[id])
      .filter(Boolean),
  }))

  const serializedClasses = classes.map((c) => ({ id: c.id, label: c.label }))

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Адміністрування школи 🏫</h1>
          <p className="text-gray-500 mt-1">{school?.name}{school?.city ? ` · ${school.city}` : ''}</p>
        </div>
      </div>

      <AdminCabinetClient
        users={serializedUsers}
        invites={serializedInvites}
        classes={serializedClasses}
        currentUserId={session.user.id}
      />
    </main>
  )
}
