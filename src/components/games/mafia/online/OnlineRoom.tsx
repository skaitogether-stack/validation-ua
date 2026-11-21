'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MAX_PLAYERS, MIN_PLAYERS, buildRoles, defaultSetup, validateSetup } from '../../../../lib/games/mafia/engine'
import { THEMES } from '../../../../lib/games/mafia/themes'
import type { LobbySettings, RoomResponse } from '../../../../lib/games/mafia/rooms'
import type { RoleId, RoleSetup, Settings } from '../../../../lib/games/mafia/types'
import { Section, Stepper, Toggle } from '../Lobby'
import { Btn } from '../ui'
import { InvitePanel } from './InvitePanel'
import { OnlineGame } from './OnlineGame'
import { useRoom, type GuestInfo } from './useRoom'

const MAX_NAME = 12

export function OnlineRoom({ code }: { code: string }) {
  const { state, error, offline, busy, clockOffset, act, join } = useRoom(code)

  let content: React.ReactNode
  if (state.kind === 'loading') {
    content = <div className="py-20 text-center text-gray-400">Підключення до кімнати…</div>
  } else if (state.kind === 'notFound') {
    content = (
      <Message icon="🔍" title="Кімнату не знайдено">
        Перевірте код або попросіть нове запрошення. Кімнати зберігаються добу.
        <Link href="/games/mafia/join" className="mt-4 block font-bold text-indigo-600 underline">
          Ввести інший код
        </Link>
      </Message>
    )
  } else if (state.kind === 'guest') {
    content = <JoinForm code={code} info={state.info} removed={state.removed} busy={busy} onJoin={join} />
  } else {
    const room = state.room
    if (room.status === 'closed') {
      content = (
        <Message icon="👋" title="Гру завершено">
          Ведучий закрив кімнату. Дякуємо за гру!
          <Link href="/games" className="mt-4 block font-bold text-indigo-600 underline">
            До ігор
          </Link>
        </Message>
      )
    } else if (room.status === 'lobby' || !room.view) {
      content = <RoomLobby room={room} busy={busy} act={act} />
    } else {
      content = <OnlineGame room={room} busy={busy} act={act} clockOffset={clockOffset} />
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-4">
      {offline && (
        <div className="rounded-xl bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900">
          📶 Немає зв’язку з сервером. Пробуємо ще раз…
        </div>
      )}
      {content}
      {error && (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl bg-rose-600 px-4 py-3 text-center font-semibold text-white shadow-lg">
          {error}
        </div>
      )}
    </main>
  )
}

function Message({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
      <div className="text-5xl">{icon}</div>
      <h1 className="mt-3 text-2xl font-extrabold">{title}</h1>
      <div className="mt-2 text-gray-600">{children}</div>
    </div>
  )
}

function JoinForm({
  code,
  info,
  removed,
  busy,
  onJoin
}: {
  code: string
  info: GuestInfo
  removed: boolean
  busy: boolean
  onJoin: (name: string) => Promise<boolean>
}) {
  const [name, setName] = useState('')
  if (info.status === 'closed') {
    return (
      <Message icon="👋" title="Гру завершено">
        Ця кімната вже закрита.
      </Message>
    )
  }
  if (info.status !== 'lobby') {
    return (
      <Message icon="⏳" title="Гра вже йде">
        Приєднатися можна, коли ведучий{info.hostName ? ` (${info.hostName})` : ''} почне нову партію. Сторінка оновиться сама.
      </Message>
    )
  }
  const trimmed = name.trim()
  return (
    <form
      className="flex flex-col gap-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
      onSubmit={e => {
        e.preventDefault()
        if (trimmed) onJoin(trimmed)
      }}
    >
      <div className="text-center">
        <div className="text-5xl">🕶️</div>
        <h1 className="mt-2 text-2xl font-extrabold">Запрошення до гри «Мафія»</h1>
        <p className="mt-1 text-gray-600">
          {info.hostName ? `${info.hostName} кличе грати. ` : ''}Кімната <b className="font-mono">{code}</b>, уже{' '}
          {info.playerCount} з {MAX_PLAYERS} гравців.
        </p>
      </div>
      {removed && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Ведучий прибрав вас зі списку. Можна приєднатися знову.</p>}
      <label className="flex flex-col gap-2">
        <span className="font-semibold">Як тебе звати?</span>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={MAX_NAME}
          autoFocus
          placeholder="Ім’я або нікнейм"
          className="min-h-12 rounded-xl border border-gray-200 px-4 text-lg focus:border-indigo-400 focus:outline-none"
        />
        <span className="text-xs text-gray-500">Його побачать інші гравці. Справжнє прізвище писати не потрібно.</span>
      </label>
      <button
        type="submit"
        disabled={!trimmed || busy}
        className="min-h-12 rounded-2xl bg-indigo-600 px-5 font-bold text-white disabled:bg-indigo-300"
      >
        Приєднатися
      </button>
    </form>
  )
}

function RoomLobby({
  room,
  busy,
  act
}: {
  room: RoomResponse
  busy: boolean
  act: ReturnType<typeof useRoom>['act']
}) {
  const { lobby, players, isHost } = room
  const settings = lobby.settings
  const theme = THEMES[settings.theme]
  const n = players.length
  const setup: RoleSetup = lobby.customSetup ?? defaultSetup(Math.max(n, MIN_PLAYERS))
  const setupError = n >= MIN_PLAYERS ? validateSetup(n, setup) : null
  const roles = buildRoles(Math.max(n, MIN_PLAYERS), setup)
  const count = (r: RoleId) => roles.filter(x => x === r).length
  const host = players.find(p => p.id === room.hostId)

  const update = (patch: Partial<LobbySettings>) => act({ type: 'updateLobby', lobby: { ...lobby, ...patch } })
  const setSettings = (patch: Partial<Settings>) => update({ settings: { ...settings, ...patch } })

  return (
    <div className="flex flex-col gap-5 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="text-center">
        <div className="text-4xl">{theme.roles.mafia.icon}</div>
        <h1 className="mt-1 text-2xl font-extrabold">Кімната {room.code}</h1>
        <p className="text-sm text-gray-500">Кожен грає зі свого телефона. Ведучий: {host?.name}</p>
      </div>

      <InvitePanel code={room.code} compact={n >= MIN_PLAYERS} />

      <Section title={`Гравці · ${n} з ${MAX_PLAYERS}`}>
        <ul className="flex flex-col gap-2">
          {players.map(p => (
            <li key={p.id} className="flex min-h-11 items-center gap-3 rounded-xl bg-gray-50 px-3">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.online ? 'bg-emerald-500' : 'bg-gray-300'}`}
                title={p.online ? 'на зв’язку' : 'не на зв’язку'}
              />
              <span className="min-w-0 flex-1 break-words font-semibold">
                {p.name}
                {p.id === room.meId && <span className="font-normal text-gray-500"> (ти)</span>}
              </span>
              {p.id === room.hostId && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">ведучий</span>}
              {isHost && p.id !== room.meId && (
                <button
                  type="button"
                  aria-label={`Прибрати ${p.name}`}
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Прибрати гравця ${p.name} з кімнати?`)) act({ type: 'kick', playerId: p.id })
                  }}
                  className="h-9 w-9 rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
        {n < MIN_PLAYERS && (
          <p className="text-center text-sm font-semibold text-gray-500">
            Потрібно ще {MIN_PLAYERS - n} {MIN_PLAYERS - n === 1 ? 'гравець' : 'гравці'}, щоб почати
          </p>
        )}
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
        {n < MIN_PLAYERS && <p className="text-xs text-gray-500">Склад показано для {MIN_PLAYERS} гравців і зміниться, коли всі зберуться.</p>}
        {isHost && (
          <div className="flex flex-col gap-3 rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {theme.roles.mafia.icon} {theme.roles.mafia.name}
              </span>
              <Stepper
                value={setup.mafia}
                min={1}
                max={Math.max(1, Math.ceil(Math.max(n, MIN_PLAYERS) / 2) - 1)}
                onChange={v => update({ customSetup: { ...setup, mafia: v } })}
              />
            </div>
            <label className="flex min-h-11 items-center justify-between font-semibold">
              <span>
                {theme.roles.doctor.icon} {theme.roles.doctor.name}
              </span>
              <input type="checkbox" className="h-6 w-6" checked={setup.doctor} onChange={e => update({ customSetup: { ...setup, doctor: e.target.checked } })} />
            </label>
            <label className="flex min-h-11 items-center justify-between font-semibold">
              <span>
                {theme.roles.detective.icon} {theme.roles.detective.name}
              </span>
              <input
                type="checkbox"
                className="h-6 w-6"
                checked={setup.detective}
                onChange={e => update({ customSetup: { ...setup, detective: e.target.checked } })}
              />
            </label>
            {lobby.customSetup && (
              <button type="button" onClick={() => update({ customSetup: null })} className="self-start text-sm font-semibold text-indigo-600 underline">
                Повернути рекомендований склад
              </button>
            )}
          </div>
        )}
      </Section>

      <Section title="Налаштування">
        {isHost ? (
          <>
            <Toggle
              value={settings.theme}
              onChange={v => setSettings({ theme: v })}
              options={[
                { id: 'city', label: `${THEMES.city.icon} Місто` },
                { id: 'forest', label: `${THEMES.forest.icon} Ліс` }
              ]}
            />
            <Toggle
              value={settings.voteMode}
              onChange={v => setSettings({ voteMode: v })}
              options={[
                { id: 'open', label: '✋ Відкрите голосування' },
                { id: 'secret', label: '🤫 Таємне' }
              ]}
            />
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
          </>
        ) : (
          <ul className="flex flex-col gap-1 text-sm text-gray-700">
            <li>
              Тема: {theme.icon} {theme.title}
            </li>
            <li>Голосування: {settings.voteMode === 'open' ? 'відкрите' : 'таємне'}</li>
            <li>Обговорення: {settings.discussionSeconds / 60} хв</li>
            <li>Роль того, хто вибув: {settings.revealRoleOnElimination ? 'показується' : 'прихована'}</li>
          </ul>
        )}
      </Section>

      {setupError && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{setupError}</p>}

      {isHost ? (
        <Btn disabled={busy || n < MIN_PLAYERS || !!setupError} onClick={() => act({ type: 'start' })}>
          {n < MIN_PLAYERS ? `Чекаємо гравців (${n}/${MIN_PLAYERS})` : 'Почати гру'}
        </Btn>
      ) : (
        <div className="rounded-2xl bg-gray-50 p-4 text-center font-semibold text-gray-600">⏳ Чекаємо, поки ведучий почне гру…</div>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={() => {
          const msg = isHost ? 'Закрити кімнату для всіх?' : 'Вийти з кімнати?'
          if (window.confirm(msg)) act({ type: 'leave' })
        }}
        className="self-center text-sm font-semibold text-gray-500 underline"
      >
        {isHost ? 'Закрити кімнату' : 'Вийти з кімнати'}
      </button>
    </div>
  )
}
