'use client'

import { useState } from 'react'

export interface DailyPoint {
  date: string // YYYY-MM-DD
  logins: number
  newUsers: number
  dictation: number
}

const CHART_HEIGHT = 160

function formatDay(date: string, withWeekday = false) {
  const d = new Date(`${date}T12:00:00Z`)
  return d.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'short',
    ...(withWeekday ? { weekday: 'short' } : {}),
    timeZone: 'UTC'
  })
}

export function StatsDailyChart({ points }: { points: DailyPoint[] }) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...points.map(p => p.logins))
  // Округлюємо верх шкали до «гарного» числа, щоб підпис осі читався легко
  const step = max <= 5 ? 1 : max <= 20 ? 5 : max <= 100 ? 20 : 100
  const top = Math.ceil(max / step) * step
  const hovered = active !== null ? points[active] : null

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="flex flex-col justify-between text-[11px] text-gray-400 text-right w-6" style={{ height: CHART_HEIGHT }}>
          <span>{top}</span>
          <span>0</span>
        </div>
        <div className="relative flex-1 border-b border-gray-200" style={{ height: CHART_HEIGHT }}>
          <div className="absolute inset-x-0 top-0 border-t border-dashed border-gray-100" />
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {points.map((p, i) => (
              <button
                key={p.date}
                type="button"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                aria-label={`${formatDay(p.date)}: входів ${p.logins}, нових ${p.newUsers}, з диктанту ${p.dictation}`}
                className="group flex-1 h-full flex items-end justify-center cursor-default focus:outline-none"
              >
                <span
                  className={`block w-full max-w-6 rounded-t-[4px] transition-colors ${
                    active === i ? 'bg-[#1c5fae]' : 'bg-[#2a78d6]'
                  }`}
                  style={{ height: p.logins ? `${Math.max(2, (p.logins / top) * 100)}%` : 0 }}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-between pl-8 mt-1 text-[11px] text-gray-400">
        <span>{formatDay(points[0].date)}</span>
        <span>{formatDay(points[points.length - 1].date)}</span>
      </div>

      {hovered && (
        <div
          className="pointer-events-none absolute -top-2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-md"
          // Підказка над наведеним стовпчиком; біля країв притискаємо, щоб не вилазила за межі
          style={{ left: `clamp(5rem, calc(2rem + (100% - 2rem) * ${(active! + 0.5) / points.length}), calc(100% - 5rem))` }}
        >
          <div className="font-semibold text-gray-800 mb-1">{formatDay(hovered.date, true)}</div>
          <div className="text-gray-600">Входів: <b className="text-gray-900">{hovered.logins}</b></div>
          <div className="text-gray-600">Нових користувачів: <b className="text-gray-900">{hovered.newUsers}</b></div>
          <div className="text-gray-600">З диктанту: <b className="text-gray-900">{hovered.dictation}</b></div>
        </div>
      )}
    </div>
  )
}
