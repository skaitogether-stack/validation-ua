'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  classLabels: string[]
}

interface InviteRow {
  id: string
  email: string
  role: string
  token: string
  status: string
  sentAt: string
  classLabels: string[]
}

interface ClassOption {
  id: string
  label: string
}

interface Props {
  users: UserRow[]
  invites: InviteRow[]
  classes: ClassOption[]
  currentUserId: string
}

const ROLE_META: Record<string, { label: string; badge: string }> = {
  admin: { label: 'Адміністратор', badge: 'bg-gray-100 text-gray-700 border-gray-200' },
  teacher: { label: 'Вчитель', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  student: { label: 'Учень', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
}

export function AdminCabinetClient({ users, invites, classes, currentUserId }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'users' | 'invites'>('users')
  const [modalOpen, setModalOpen] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // форма запрошення
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'teacher' | 'student'>('teacher')
  const [inviteClassId, setInviteClassId] = useState('')
  const [inviteClassIds, setInviteClassIds] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [createdLink, setCreatedLink] = useState<string | null>(null)

  const teacherCount = users.filter((u) => u.role === 'teacher').length
  const studentCount = users.filter((u) => u.role === 'student').length
  const pendingCount = invites.filter((i) => i.status === 'pending').length

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  function openModal() {
    setInviteEmail('')
    setInviteRole('teacher')
    setInviteClassId('')
    setInviteClassIds({})
    setFormError(null)
    setCreatedLink(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
  }

  function toggleInviteClass(id: string) {
    setInviteClassIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const selectedTeacherClassIds = Object.keys(inviteClassIds).filter((id) => inviteClassIds[id])
  const sendDisabled =
    !inviteEmail.trim() ||
    (inviteRole === 'student' && !inviteClassId) ||
    (inviteRole === 'teacher' && selectedTeacherClassIds.length === 0) ||
    classes.length === 0

  async function handleSendInvite() {
    setSubmitting(true)
    setFormError(null)
    try {
      const classIds = inviteRole === 'student' ? [inviteClassId] : selectedTeacherClassIds
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole, classIds }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Не вдалося створити запрошення')
      }
      setCreatedLink(`${window.location.origin}/invite/${data.token}`)
      router.refresh()
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link)
      showToast('Посилання скопійовано')
    } catch {
      showToast('Не вдалося скопіювати — скопіюйте вручну')
    }
  }

  async function handleRemoveUser(id: string, name: string) {
    if (!confirm(`Видалити ${name} зі школи? Історія результатів збережеться.`)) return
    setRemovingId(id)
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Не вдалося видалити користувача')
      }
      router.refresh()
    } catch (err: any) {
      showToast(err.message)
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="користувачів" value={users.length} />
        <StatCard label="вчителів" value={teacherCount} accent="text-emerald-600" />
        <StatCard label="учнів" value={studentCount} accent="text-blue-600" />
        <StatCard label="очікують запрошення" value={pendingCount} accent="text-amber-600" />
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-white p-1 rounded-2xl border border-gray-100 shadow-xs">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              activeTab === 'users' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Користувачі
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              activeTab === 'invites' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Запрошення
          </button>
        </div>
        <button
          onClick={openModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-6 py-3 font-bold text-sm shadow-md shadow-indigo-100 transition-all cursor-pointer"
        >
          + Запросити користувача
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {users.length === 0 ? (
            <p className="text-gray-400 text-center py-12 text-sm">У школі ще немає користувачів</p>
          ) : (
            users.map((u) => {
              const meta = ROLE_META[u.role] || ROLE_META.student
              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-50 last:border-b-0 flex-wrap"
                >
                  <div className="flex items-center gap-3 min-w-[220px]">
                    <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs flex-shrink-0">
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-800">{u.name}</div>
                      <div className="text-xs text-gray-400">{u.email}</div>
                      {u.classLabels.length > 0 && (
                        <div className="text-[11px] text-indigo-500 font-semibold mt-0.5">
                          {u.role === 'student' ? 'Клас' : 'Класи'}: {u.classLabels.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${meta.badge}`}>
                      {meta.label}
                    </span>
                    {u.id !== currentUserId && (
                      <button
                        onClick={() => handleRemoveUser(u.id, u.name)}
                        disabled={removingId === u.id}
                        className="w-8 h-8 rounded-full border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-gray-400 transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50"
                        title="Видалити зі школи"
                      >
                        {removingId === u.id ? (
                          <span className="w-3.5 h-3.5 block border-2 border-current border-t-transparent animate-spin rounded-full" />
                        ) : (
                          '✕'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {activeTab === 'invites' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {invites.length === 0 ? (
            <p className="text-gray-400 text-center py-12 text-sm">Ще немає надісланих запрошень</p>
          ) : (
            invites.map((inv) => {
              const isPending = inv.status === 'pending'
              return (
                <div
                  key={inv.id}
                  className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-50 last:border-b-0 flex-wrap"
                >
                  <div className="min-w-[220px]">
                    <div className="font-bold text-sm text-gray-800">{inv.email}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Роль: {ROLE_META[inv.role]?.label || inv.role}
                      {inv.classLabels.length > 0 && ` · ${inv.role === 'student' ? 'Клас' : 'Класи'}: ${inv.classLabels.join(', ')}`}
                      {' · '}
                      {new Date(inv.sentAt).toLocaleDateString('uk-UA')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                        isPending ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isPending ? 'Очікує' : 'Прийнято'}
                    </span>
                    {isPending && (
                      <button
                        onClick={() => copyLink(`${window.location.origin}/invite/${inv.token}`)}
                        className="text-xs font-bold text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded-full px-4 py-2 transition-colors cursor-pointer"
                      >
                        Скопіювати посилання
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Модалка запрошення */}
      {modalOpen && (
        <div
          onClick={closeModal}
          className="fixed inset-0 bg-black/45 flex items-center justify-center z-100 p-5"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-8 w-full max-w-md"
          >
            {createdLink ? (
              <>
                <h2 className="text-xl font-black text-gray-800 mb-2">Запрошення створено ✅</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Автоматичної відправки email ще немає — надішліть це посилання людині вручну
                  (месенджером, поштою).
                </p>
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-mono text-gray-600 break-all mb-4">
                  {createdLink}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => copyLink(createdLink)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 font-bold text-sm transition-all cursor-pointer"
                  >
                    Копіювати
                  </button>
                  <button
                    onClick={closeModal}
                    className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl py-3 font-bold text-sm transition-all cursor-pointer"
                  >
                    Готово
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-black text-gray-800 mb-1">Запросити користувача</h2>
                <p className="text-xs text-gray-500 mb-5">
                  Після створення ви отримаєте посилання-запрошення для надсилання вручну
                </p>

                {classes.length === 0 && (
                  <div className="mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                    У школі ще не додано жодного класу — зверніться до розробника платформи, щоб додати класи.
                  </div>
                )}

                {formError && (
                  <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    {formError}
                  </div>
                )}

                <label className="block text-xs font-bold text-gray-500 mb-2">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="pib@school.ua"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden text-sm mb-4"
                />

                <label className="block text-xs font-bold text-gray-500 mb-2">Роль</label>
                <div className="grid grid-cols-2 gap-2.5 mb-5">
                  <button
                    onClick={() => setInviteRole('teacher')}
                    className={`rounded-xl py-3 font-bold text-sm border-2 transition-all cursor-pointer ${
                      inviteRole === 'teacher'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    Вчитель
                  </button>
                  <button
                    onClick={() => setInviteRole('student')}
                    className={`rounded-xl py-3 font-bold text-sm border-2 transition-all cursor-pointer ${
                      inviteRole === 'student'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    Учень
                  </button>
                </div>

                {inviteRole === 'student' && (
                  <>
                    <label className="block text-xs font-bold text-gray-500 mb-2">Клас учня</label>
                    <select
                      value={inviteClassId}
                      onChange={(e) => setInviteClassId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden text-sm mb-6"
                    >
                      <option value="">Оберіть клас</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                {inviteRole === 'teacher' && (
                  <>
                    <label className="block text-xs font-bold text-gray-500 mb-2">Класи, які веде вчитель</label>
                    <div className="border border-gray-200 rounded-xl px-1 py-1 mb-6 flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                      {classes.map((c) => (
                        <label
                          key={c.id}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={!!inviteClassIds[c.id]}
                            onChange={() => toggleInviteClass(c.id)}
                            className="w-4 h-4 accent-indigo-600 cursor-pointer"
                          />
                          <span className="text-sm">{c.label}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl py-3 font-bold text-sm transition-all cursor-pointer"
                  >
                    Скасувати
                  </button>
                  <button
                    onClick={handleSendInvite}
                    disabled={sendDisabled || submitting}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:cursor-default text-white rounded-xl py-3 font-bold text-sm transition-all cursor-pointer"
                  >
                    {submitting ? 'Створення…' : 'Створити →'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Тост */}
      {toast && (
        <div className="fixed bottom-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3.5 rounded-full text-sm font-semibold flex items-center gap-2.5 shadow-xl z-200">
          <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[11px]">✓</span>
          {toast}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
      <div className={`font-black text-2xl ${accent || 'text-gray-900'}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  )
}
