import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'
import { authOptions } from '../api/auth/[...nextauth]/route'
import { db } from '../../lib/db'
import { isStatsAdmin } from '../../lib/statsAccess'
import { StatsDailyChart, DailyPoint } from '../../components/StatsDailyChart'

export const dynamic = 'force-dynamic'

const TIME_ZONE = 'Europe/Kyiv'
const DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

const SOURCE_LABELS: Record<string, string> = {
  dictation: '📝 Диктант',
  cabinet: '🎒 Кабінет учня',
  teacher: '🏫 Кабінет вчителя / адміна',
  invite: '✉️ Запрошення',
  unknown: '❔ Невідомо'
}

// 1 вхід, 2 входи, 5 входів
function loginsWord(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'вхід'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'входи'
  return 'входів'
}

// Ключ дня за київським часом, щоб «сьогодні» збігалося з календарем користувача
const dayKey = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(d)

function deviceLabel(ua: string | null): string {
  if (!ua) return '—'
  const app = /Instagram/.test(ua) ? 'Instagram' : /FBAN|FBAV/.test(ua) ? 'Facebook' : null
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Інший'
  const device = /iPhone|iPad|Android|Mobi/.test(ua) ? '📱' : '💻'
  return `${device} ${app ?? browser}`
}

export default async function StatsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  // Для всіх, крім власників продукту, сторінки «не існує»
  if (!isStatsAdmin(session.user?.email)) notFound()

  const now = new Date()
  const since = new Date(now.getTime() - DAYS * DAY_MS)
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS)

  const [events, totalUsers] = await Promise.all([
    db.loginEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } }
    }),
    db.user.count({ where: { deletedAt: null } })
  ])

  const today = dayKey(now)
  const week = events.filter(e => e.createdAt >= weekAgo)
  const tiles = [
    { label: 'Входів сьогодні', value: events.filter(e => dayKey(e.createdAt) === today).length },
    { label: 'Унікальних користувачів за 7 днів', value: new Set(week.map(e => e.userId ?? e.email)).size },
    { label: 'Нових користувачів за 7 днів', value: week.filter(e => e.isNewUser).length },
    { label: 'Нових з диктанту за 7 днів', value: week.filter(e => e.isNewUser && e.source === 'dictation').length },
    { label: 'Усього користувачів', value: totalUsers }
  ]

  // Заповнюємо всі дні періоду, включно з днями без входів
  const byDay = new Map<string, DailyPoint>()
  for (let i = DAYS - 1; i >= 0; i--) {
    const key = dayKey(new Date(now.getTime() - i * DAY_MS))
    byDay.set(key, { date: key, logins: 0, newUsers: 0, dictation: 0 })
  }
  for (const e of events) {
    const point = byDay.get(dayKey(e.createdAt))
    if (!point) continue
    point.logins++
    if (e.isNewUser) point.newUsers++
    if (e.source === 'dictation') point.dictation++
  }

  const sourceCounts = new Map<string, { logins: number; newUsers: number }>()
  for (const e of events) {
    const key = e.source ?? 'unknown'
    const row = sourceCounts.get(key) ?? { logins: 0, newUsers: 0 }
    row.logins++
    if (e.isNewUser) row.newUsers++
    sourceCounts.set(key, row)
  }
  const sources = [...sourceCounts.entries()].sort((a, b) => b[1].logins - a[1].logins)
  const maxSource = Math.max(1, ...sources.map(([, s]) => s.logins))

  const recent = events.slice(0, 50)
  const timeFormat = new Intl.DateTimeFormat('uk-UA', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <main className="max-w-5xl mx-auto p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">📊 Статистика входів</h1>
        <p className="text-sm text-gray-500">Останні {DAYS} днів · час київський</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {tiles.map(tile => (
          <div key={tile.label} className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-2xl font-bold text-gray-900">{tile.value}</div>
            <div className="text-xs text-gray-500 mt-1">{tile.label}</div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold mb-4">Входи по днях</h2>
        <StatsDailyChart points={[...byDay.values()]} />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold mb-4">Звідки приходять</h2>
        {sources.length === 0 ? (
          <p className="text-sm text-gray-400">Поки що немає входів.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {sources.map(([source, s]) => (
              <div key={source} className="grid grid-cols-[minmax(0,12rem)_1fr_auto] items-center gap-3 text-sm">
                <span className="text-gray-700 truncate">{SOURCE_LABELS[source] ?? source}</span>
                <div className="h-3 rounded-r-[4px] bg-[#2a78d6]" style={{ width: `${(s.logins / maxSource) * 100}%` }} />
                <span className="text-gray-600 tabular-nums whitespace-nowrap">
                  <b className="text-gray-900">{s.logins}</b> {loginsWord(s.logins)} · {s.newUsers} нових
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold mb-4">Останні входи</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-400">Поки що немає входів.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-4 font-medium">Час</th>
                  <th className="py-2 pr-4 font-medium">Користувач</th>
                  <th className="py-2 pr-4 font-medium">Звідки</th>
                  <th className="py-2 pr-4 font-medium">Пристрій</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(e => (
                  <tr key={e.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-4 text-gray-500 whitespace-nowrap tabular-nums">{timeFormat.format(e.createdAt)}</td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{e.user?.name ?? '—'}</span>
                        {e.isNewUser && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">новий</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{e.email}</div>
                    </td>
                    <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{SOURCE_LABELS[e.source ?? 'unknown'] ?? e.source}</td>
                    <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">{deviceLabel(e.userAgent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
