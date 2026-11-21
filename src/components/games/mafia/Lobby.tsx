'use client'

import { useState } from 'react'
import { MAX_PLAYERS, MIN_PLAYERS, buildRoles, defaultSetup, validateSetup } from '../../../lib/games/mafia/engine'
import { THEMES } from '../../../lib/games/mafia/themes'
import type { RoleId, RoleSetup, Settings } from '../../../lib/games/mafia/types'
import { Btn } from './ui'

export interface LobbyConfig {
  names: string[]
  settings: Settings
  customSetup: RoleSetup | null // null — склад за замовчуванням
}

const MAX_NAME = 12

export function namesError(names: string[]): string | null {
  const trimmed = names.map(n => n.trim())
  if (trimmed.some(n => !n)) return 'Заповніть усі імена'
  const lower = trimmed.map(n => n.toLowerCase())
  if (new Set(lower).size !== lower.length) return 'Імена не повинні повторюватися'
  return null
}

export function effectiveSetup(config: LobbyConfig): RoleSetup {
  return config.customSetup ?? defaultSetup(config.names.length)
}

export function Toggle<T extends string>({
  value,
  options,
  onChange
}: {
  value: T
  options: { id: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-2xl bg-gray-100 p-1">
      {options.map(o => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`min-h-11 flex-1 rounded-xl px-3 text-sm font-bold transition-colors ${
            value === o.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Менше"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className="h-11 w-11 rounded-xl bg-gray-100 text-xl font-bold disabled:opacity-40"
      >
        −
      </button>
      <span className="w-8 text-center text-2xl font-extrabold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="Більше"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="h-11 w-11 rounded-xl bg-gray-100 text-xl font-bold disabled:opacity-40"
      >
        +
      </button>
    </div>
  )
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">{title}</h3>
      {children}
    </section>
  )
}

export function Lobby({
  config,
  onChange,
  onStart
}: {
  config: LobbyConfig
  onChange: (c: LobbyConfig) => void
  onStart: () => void
}) {
  const [editRoles, setEditRoles] = useState(config.customSetup !== null)
  const [showRules, setShowRules] = useState(false)
  const { names, settings } = config
  const theme = THEMES[settings.theme]
  const setup = effectiveSetup(config)
  const roles = buildRoles(names.length, setup)
  const setupError = validateSetup(names.length, setup)
  const nameError = namesError(names)
  const error = nameError ?? setupError

  const setNames = (next: string[]) => {
    // При зміні кількості гравців ручний склад скидаємо, якщо він став недопустимим
    const custom = config.customSetup && !validateSetup(next.length, config.customSetup) ? config.customSetup : null
    onChange({ ...config, names: next, customSetup: editRoles ? custom ?? defaultSetup(next.length) : null })
  }
  const setCount = (n: number) => {
    const next = names.slice(0, n)
    while (next.length < n) next.push(`Гравець ${next.length + 1}`)
    setNames(next)
  }
  const move = (i: number, d: -1 | 1) => {
    const next = [...names]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    setNames(next)
  }
  const setSettings = (patch: Partial<Settings>) => onChange({ ...config, settings: { ...settings, ...patch } })
  const setSetup = (patch: Partial<RoleSetup>) => onChange({ ...config, customSetup: { ...setup, ...patch } })

  const count = (r: RoleId) => roles.filter(x => x === r).length

  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-7">
      <div className="text-center">
        <div className="text-5xl">{theme.roles.mafia.icon}</div>
        <h1 className="mt-2 text-3xl font-extrabold">{settings.theme === 'forest' ? 'Вовки й зайчики' : 'Мафія'}</h1>
        <p className="mt-1 text-gray-600">
          Гра для компанії від {MIN_PLAYERS} до {MAX_PLAYERS} людей. Ведучий — цей телефон, тож грають усі.
        </p>
        <button
          type="button"
          onClick={() => setShowRules(s => !s)}
          className="mt-2 text-sm font-semibold text-indigo-600 underline underline-offset-2"
        >
          {showRules ? 'Сховати правила' : 'Як грати?'}
        </button>
      </div>

      {showRules && (
        <div className="rounded-2xl bg-indigo-50 p-4 text-sm leading-relaxed text-indigo-950">
          <p>
            <b>Ніч.</b> Телефон по черзі отримує кожен гравець і таємно робить свій хід. {theme.roles.mafia.name} обирає, кого
            забрати, {theme.roles.doctor.name.toLowerCase()} — кого захистити, {theme.roles.detective.name.toLowerCase()} —
            кого перевірити. Решта позначає, кого підозрює.
          </p>
          <p className="mt-2">
            <b>День.</b> Телефон кладемо в центр. Він повідомляє, що сталося вночі. Усі обговорюють і голосуванням виганяють
            підозрюваного.
          </p>
          <p className="mt-2">
            <b>Перемога.</b> Команда «{theme.teams.town}» перемагає, коли в грі не лишиться жодного гравця з команди «
            {theme.teams.mafia}». Команда «{theme.teams.mafia}» перемагає, коли їх стане стільки ж, скільки інших гравців.
          </p>
        </div>
      )}

      <Section title="Тема">
        <Toggle
          value={settings.theme}
          onChange={v => setSettings({ theme: v })}
          options={[
            { id: 'city', label: `${THEMES.city.icon} Місто` },
            { id: 'forest', label: `${THEMES.forest.icon} Ліс` }
          ]}
        />
      </Section>

      <Section title="Гравці">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Кількість</span>
          <Stepper value={names.length} min={MIN_PLAYERS} max={MAX_PLAYERS} onChange={setCount} />
        </div>
        <p className="text-xs text-gray-500">Впишіть імена в тому порядку, як сидите за столом: у цьому порядку передаватимете телефон.</p>
        <ol className="flex flex-col gap-2">
          {names.map((name, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-6 text-right text-sm font-bold text-gray-400">{i + 1}</span>
              <input
                value={name}
                maxLength={MAX_NAME}
                onChange={e => setNames(names.map((n, j) => (j === i ? e.target.value : n)))}
                onFocus={e => e.target.select()}
                aria-label={`Ім'я гравця ${i + 1}`}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-gray-200 px-3 text-base focus:border-indigo-400 focus:outline-none"
              />
              <button
                type="button"
                aria-label="Вгору"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="h-11 w-9 rounded-xl bg-gray-100 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Вниз"
                disabled={i === names.length - 1}
                onClick={() => move(i, 1)}
                className="h-11 w-9 rounded-xl bg-gray-100 disabled:opacity-30"
              >
                ↓
              </button>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Ролі">
        <div className="flex flex-wrap gap-2">
          {(['mafia', 'doctor', 'detective', 'civilian'] as RoleId[])
            .filter(r => count(r) > 0)
            .map(r => (
              <span key={r} className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-semibold">
                {theme.roles[r].icon} {theme.roles[r].name} × {count(r)}
              </span>
            ))}
        </div>
        {!editRoles ? (
          <button
            type="button"
            onClick={() => {
              setEditRoles(true)
              onChange({ ...config, customSetup: setup })
            }}
            className="self-start text-sm font-semibold text-indigo-600 underline underline-offset-2"
          >
            Налаштувати склад
          </button>
        ) : (
          <div className="flex flex-col gap-3 rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {theme.roles.mafia.icon} {theme.roles.mafia.name}
              </span>
              <Stepper value={setup.mafia} min={1} max={Math.max(1, Math.ceil(names.length / 2) - 1)} onChange={v => setSetup({ mafia: v })} />
            </div>
            <label className="flex min-h-11 items-center justify-between font-semibold">
              <span>
                {theme.roles.doctor.icon} {theme.roles.doctor.name}
              </span>
              <input type="checkbox" className="h-6 w-6" checked={setup.doctor} onChange={e => setSetup({ doctor: e.target.checked })} />
            </label>
            <label className="flex min-h-11 items-center justify-between font-semibold">
              <span>
                {theme.roles.detective.icon} {theme.roles.detective.name}
              </span>
              <input
                type="checkbox"
                className="h-6 w-6"
                checked={setup.detective}
                onChange={e => setSetup({ detective: e.target.checked })}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setEditRoles(false)
                onChange({ ...config, customSetup: null })
              }}
              className="self-start text-sm font-semibold text-indigo-600 underline underline-offset-2"
            >
              Повернути рекомендований склад
            </button>
          </div>
        )}
      </Section>

      <Section title="Налаштування">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Голосування</span>
          <Toggle
            value={settings.voteMode}
            onChange={v => setSettings({ voteMode: v })}
            options={[
              { id: 'open', label: '✋ Відкрите' },
              { id: 'secret', label: '🤫 Таємне' }
            ]}
          />
        </div>
        <label className="flex min-h-11 items-center justify-between gap-3">
          <span className="text-sm font-semibold">Час на обговорення</span>
          <select
            value={settings.discussionSeconds}
            onChange={e => setSettings({ discussionSeconds: Number(e.target.value) })}
            className="min-h-11 rounded-xl border border-gray-200 bg-white px-3"
          >
            {[60, 120, 180, 240, 300].map(s => (
              <option key={s} value={s}>
                {s / 60} хв
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center justify-between gap-3">
          <span className="text-sm font-semibold">Показувати роль того, хто вибув</span>
          <input
            type="checkbox"
            className="h-6 w-6"
            checked={settings.revealRoleOnElimination}
            onChange={e => setSettings({ revealRoleOnElimination: e.target.checked })}
          />
        </label>
        <label className="flex min-h-11 items-center justify-between gap-3">
          <span className="text-sm font-semibold">
            Озвучувати ведучого
            <span className="block text-xs font-normal text-gray-500">Якщо в браузері є український голос</span>
          </span>
          <input type="checkbox" className="h-6 w-6" checked={settings.voice} onChange={e => setSettings({ voice: e.target.checked })} />
        </label>
      </Section>

      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
      <Btn disabled={!!error} onClick={onStart}>
        Роздати ролі
      </Btn>
    </div>
  )
}
