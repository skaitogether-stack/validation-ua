'use client'

import { useState, type ReactNode } from 'react'
import { THEMES, type ThemeStrings } from '../../../../lib/games/mafia/themes'
import type { ClientGameAction, PlayerView } from '../../../../lib/games/mafia/online'
import type { RoomResponse } from '../../../../lib/games/mafia/rooms'
import { ABSTAIN, type RoleId } from '../../../../lib/games/mafia/types'
import { GameOverScreen } from '../screens'
import { Btn, HoldToReveal, Picker, Screen, SpeechTimer, Title, formatTime } from '../ui'
import type { useRoom } from './useRoom'
import { useNow } from './useRoom'

type Act = ReturnType<typeof useRoom>['act']
type GameFn = (action: ClientGameAction) => Promise<boolean>

interface Props {
  room: RoomResponse
  busy: boolean
  act: Act
  clockOffset: number
}

function nameOf(view: PlayerView, id: string | null): string {
  if (!id) return '—'
  return view.players.find(p => p.id === id)?.name ?? '—'
}

function RoleLabel({ theme, role }: { theme: ThemeStrings; role: RoleId }) {
  return (
    <span className="whitespace-nowrap">
      {theme.roles[role].icon} {theme.roles[role].name}
    </span>
  )
}

// Рядок «чекаємо на ведучого» для гравців, які не керують переходами
function WaitHost({ room, night, children }: { room: RoomResponse; night?: boolean; children?: ReactNode }) {
  const host = room.players.find(p => p.id === room.hostId)?.name ?? 'ведучий'
  return (
    <div className={`rounded-2xl p-4 text-center text-sm font-semibold ${night ? 'bg-white/10' : 'bg-gray-50 text-gray-600'}`}>
      {children ?? `⏳ Чекаємо, поки ${host} продовжить`}
    </div>
  )
}

// Кнопка ведучого «не чекати» для гравців, що загубили зв'язок
function ForceButton({ game, busy, night }: { game: GameFn; busy: boolean; night?: boolean }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        if (window.confirm('Не чекати решту гравців? Хто не встиг — пропустить хід.')) game({ type: 'forceAdvance' })
      }}
      className={`self-center text-sm font-semibold underline ${night ? 'text-indigo-200' : 'text-gray-500'}`}
    >
      Не чекати тих, хто не відповідає
    </button>
  )
}

function Progress({ done, total, label, night }: { done: number; total: number; label: string; night?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-center text-sm font-semibold opacity-80">
        {label}: {done} з {total}
      </div>
      <div className={`h-2 overflow-hidden rounded-full ${night ? 'bg-white/15' : 'bg-gray-100'}`}>
        <div className={`h-full rounded-full ${night ? 'bg-amber-300' : 'bg-indigo-500'}`} style={{ width: `${(done / Math.max(total, 1)) * 100}%` }} />
      </div>
    </div>
  )
}

export function OnlineGame({ room, busy, act, clockOffset }: Props) {
  const view = room.view!
  const theme = THEMES[view.settings.theme]
  const game: GameFn = action => act({ type: 'game', action })
  const props = { room, view, theme, busy, game, clockOffset }

  let screen: ReactNode
  switch (view.phase) {
    case 'reveal':
      screen = <Reveal {...props} />
      break
    case 'nightIntro':
      screen = <NightIntro {...props} />
      break
    case 'night':
      screen = <Night {...props} />
      break
    case 'morning':
      screen = <Morning {...props} />
      break
    case 'discussion':
      screen = <Discussion {...props} />
      break
    case 'vote':
      screen = <Vote {...props} />
      break
    case 'runoff':
      screen = <Runoff {...props} />
      break
    case 'voteResult':
      screen = <VoteResult {...props} />
      break
    case 'gameOver':
      screen = (
        <GameOverScreen
          state={view.final!}
          onReplay={room.isHost ? () => act({ type: 'rematch' }) : undefined}
          replayLabel="Нова партія з тими самими гравцями"
          onNewPlayers={
            room.isHost
              ? () => {
                  if (window.confirm('Закрити кімнату для всіх?')) act({ type: 'close' })
                }
              : undefined
          }
          newPlayersLabel="Закрити кімнату"
          footer={room.isHost ? null : <WaitHost room={room}>⏳ Ведучий може почати нову партію — сторінка оновиться сама</WaitHost>}
        />
      )
      break
  }

  return (
    <>
      {view.phase !== 'gameOver' && <TopBar view={view} theme={theme} room={room} />}
      {screen}
    </>
  )
}

function TopBar({ view, theme, room }: { view: PlayerView; theme: ThemeStrings; room: RoomResponse }) {
  const [show, setShow] = useState(false)
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-semibold text-gray-500">
        {theme.icon} Кімната {room.code} · раунд {view.round}
      </span>
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm"
      >
        {show ? <RoleLabel theme={theme} role={view.myRole} /> : '👁 Моя роль'}
        {!view.alive && ' · вибув(ла)'}
      </button>
    </div>
  )
}

interface ScreenProps {
  room: RoomResponse
  view: PlayerView
  theme: ThemeStrings
  busy: boolean
  game: GameFn
  clockOffset: number
}

// ---------- Роздача ----------

function Reveal({ room, view, theme, busy, game }: ScreenProps) {
  const [seen, setSeen] = useState(false)
  const me = view.players.find(p => p.id === view.meId)!
  const role = theme.roles[view.myRole]
  const partners = view.players.filter(p => p.role === 'mafia' && p.id !== view.meId)
  return (
    <Screen night>
      <Title sub="Подивися свою роль так, щоб ніхто не бачив екран">Твоя роль</Title>
      {me.ready ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <div className="text-5xl">👍</div>
          <div className="text-lg font-bold">Роль запам’ятав(ла)</div>
        </div>
      ) : (
        <>
          <HoldToReveal onSeen={() => setSeen(true)}>
            <div className="flex flex-col items-center gap-2">
              <div className="text-6xl">{role.icon}</div>
              <div className="text-3xl font-extrabold">{role.name}</div>
              <div className="text-sm font-semibold text-amber-300">
                Команда: {theme.teams[view.myRole === 'mafia' ? 'mafia' : 'town']}
              </div>
              <p className="mt-1 text-base">{role.goal}</p>
              <p className="text-sm opacity-80">{role.night}</p>
              {partners.length > 0 && <p className="mt-1 text-sm font-bold text-amber-200">Твої партнери: {partners.map(p => p.name).join(', ')}</p>}
            </div>
          </HoldToReveal>
          <Btn variant="night" disabled={!seen || busy} onClick={() => game({ type: 'ready' })}>
            Запам’ятав(ла)
          </Btn>
        </>
      )}
      <Progress night done={view.readyCount} total={view.readyTotal} label="Готові" />
      {room.isHost && <ForceButton game={game} busy={busy} night />}
    </Screen>
  )
}

// ---------- Ніч ----------

function NightIntro({ room, view, theme, busy, game }: ScreenProps) {
  return (
    <Screen night>
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="text-7xl">🌙</div>
        <Title sub={`Ніч ${view.round}`}>{theme.sleep}</Title>
        <p className="max-w-sm opacity-80">Кожен таємно зробить свій нічний хід на своєму телефоні. Не підглядай у чужі екрани!</p>
        {room.isHost ? (
          <Btn variant="night" disabled={busy} onClick={() => game({ type: 'startNight' })}>
            Почати ніч
          </Btn>
        ) : (
          <WaitHost room={room} night>
            ⏳ Ведучий ось-ось почне ніч
          </WaitHost>
        )}
      </div>
    </Screen>
  )
}

function Night({ room, view, theme, busy, game }: ScreenProps) {
  const night = view.night
  const force = room.isHost ? <ForceButton game={game} busy={busy} night /> : null

  if (!night) {
    return (
      <Screen night>
        <Title sub={theme.spectator}>Ніч {view.round} 🌙</Title>
        <Progress night done={view.readyCount} total={view.readyTotal} label="Зробили хід" />
        {force}
      </Screen>
    )
  }

  if (night.done) {
    return (
      <Screen night>
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <div className="text-6xl">😴</div>
          <Title sub="Чекаємо, поки походять інші">Хід зроблено</Title>
        </div>
        <Progress night done={view.readyCount} total={view.readyTotal} label="Зробили хід" />
        {force}
      </Screen>
    )
  }

  const role = theme.roles[view.myRole]
  const targets = new Set(night.targets)
  const alive = view.players.filter(p => p.alive && (p.id !== view.meId || view.myRole === 'doctor'))
  const options = alive.map(p => {
    let note: string | undefined
    if (view.myRole === 'doctor' && !targets.has(p.id)) {
      note = p.id === night.doctorLastId ? 'лікував(ла) минулої ночі' : 'себе вже лікував(ла)'
    }
    if (view.myRole === 'mafia' && p.role === 'mafia') note = 'партнер'
    return {
      id: p.id,
      label: p.id === view.meId ? `${p.name} (я)` : p.name,
      disabled: !targets.has(p.id) || (view.myRole === 'detective' && !!night.choice),
      note
    }
  })
  const partners = view.players.filter(p => p.role === 'mafia' && p.id !== view.meId)

  return (
    <Screen night>
      <div className="text-center">
        <div className="text-sm opacity-70">Ніч {view.round}</div>
        <div className="mt-1 text-2xl font-extrabold">
          {role.icon} {role.name}
        </div>
      </div>

      {view.myRole === 'mafia' && (
        <div className="rounded-2xl bg-white/10 p-3 text-sm">
          {partners.length > 0 ? (
            <>
              <div>Партнери: {partners.map(p => `${p.name}${p.alive ? '' : ' (вибув)'}`).join(', ')}</div>
              {Object.entries(night.partnerChoices).map(([pid, target]) => (
                <div key={pid} className="mt-1 font-bold text-amber-200">
                  {nameOf(view, pid)} обирає: {nameOf(view, target)}
                </div>
              ))}
              <div className="mt-1 opacity-70">Домовтеся поглядом 😉 Якщо вибори різні, діє вибір першого за списком.</div>
            </>
          ) : (
            <div>Ти дієш сам(а).</div>
          )}
        </div>
      )}

      {view.myRole === 'detective' && view.detectiveChecks.length > 0 && (
        <div className="rounded-2xl bg-white/10 p-3 text-sm">
          <div className="font-bold">Твої попередні перевірки:</div>
          {view.detectiveChecks.map(c => (
            <div key={c.round}>
              Ніч {c.round}: {nameOf(view, c.targetId)} — {c.isMafia ? `${theme.roles.mafia.name} ❗` : `не ${theme.roles.mafia.name.toLowerCase()}`}
            </div>
          ))}
        </div>
      )}

      <div className="font-semibold">{role.action}</div>
      <Picker night options={options} value={night.choice} onChange={id => game({ type: 'nightChoose', targetId: id })} />

      {night.checkResult !== null && night.choice && (
        <div className={`rounded-2xl p-4 text-center text-xl font-extrabold text-white ${night.checkResult ? 'bg-rose-500' : 'bg-emerald-500'}`}>
          {nameOf(view, night.choice)} — {night.checkResult ? theme.roles.mafia.name : `не ${theme.roles.mafia.name.toLowerCase()}`}
        </div>
      )}

      {!night.required && night.choice && (
        <button type="button" className="self-start text-sm underline opacity-70" onClick={() => game({ type: 'nightChoose', targetId: null })}>
          Скасувати вибір
        </button>
      )}

      <Btn variant="night" disabled={busy || (night.required && !night.choice)} onClick={() => game({ type: 'nightDone' })}>
        Готово
      </Btn>
      <Progress night done={view.readyCount} total={view.readyTotal} label="Зробили хід" />
      {force}
    </Screen>
  )
}

// ---------- День ----------

function Morning({ room, view, theme, busy, game }: ScreenProps) {
  const out = view.lastNight?.eliminatedId ?? null
  const outPlayer = view.players.find(p => p.id === out)
  return (
    <Screen>
      <div className="text-center text-6xl">☀️</div>
      <Title sub={`День ${view.round}`}>{theme.wake}</Title>
      <div className={`rounded-2xl p-5 text-center text-xl font-bold ${out ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'}`}>
        {out ? theme.nightEliminated(nameOf(view, out)) : theme.nightNobody}
      </div>
      {outPlayer?.role && (
        <div className="text-center text-lg">
          Роль: <b><RoleLabel theme={theme} role={outPlayer.role} /></b>
        </div>
      )}
      {out === view.meId && <p className="text-center text-sm text-gray-500">{theme.spectator}</p>}
      {out && !view.winner && <SpeechTimer seconds={30} label={`Останнє слово: ${nameOf(view, out)}`} />}
      {room.isHost ? (
        <Btn disabled={busy} onClick={() => game({ type: 'continue' })}>
          {view.winner ? 'Підсумки гри' : 'До обговорення'}
        </Btn>
      ) : (
        <WaitHost room={room} />
      )}
    </Screen>
  )
}

function Discussion({ room, view, busy, game, clockOffset }: ScreenProps) {
  const now = useNow() + clockOffset
  const left = view.discussionEndsAt ? Math.max(0, Math.ceil((view.discussionEndsAt - now) / 1000)) : 0
  const alive = view.players.filter(p => p.alive)
  return (
    <Screen>
      <Title sub={`День ${view.round} · у грі ${alive.length}`}>Обговорення 🗣️</Title>
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-gray-50 p-5">
        <div className={`text-6xl font-extrabold tabular-nums ${left === 0 ? 'text-rose-500' : ''}`}>{formatTime(left)}</div>
        {left === 0 && <div className="font-bold text-rose-600">Час вийшов — переходьте до голосування!</div>}
        {room.isHost && (
          <button type="button" disabled={busy} className="rounded-xl bg-white px-4 py-2 text-sm font-bold shadow-sm" onClick={() => game({ type: 'extendDiscussion' })}>
            +30 с
          </button>
        )}
      </div>
      <p className="text-center text-sm text-gray-500">Обговорюйте вголос або в чаті. Хто, на вашу думку, {view.settings.theme === 'forest' ? 'вовк' : 'мафія'}?</p>
      <div className="flex flex-wrap justify-center gap-2">
        {alive.map(p => (
          <span key={p.id} className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold">
            {p.name}
          </span>
        ))}
      </div>
      {room.isHost ? (
        <Btn disabled={busy} onClick={() => game({ type: 'toVote' })}>
          До голосування
        </Btn>
      ) : (
        <WaitHost room={room}>⏳ Ведучий відкриє голосування</WaitHost>
      )}
    </Screen>
  )
}

function Vote({ room, view, busy, game }: ScreenProps) {
  const vote = view.vote!
  const canVote = vote.voters.includes(view.meId)
  const options = [...vote.options.map(id => ({ id, label: nameOf(view, id) })), { id: ABSTAIN, label: 'Утримуюсь' }]
  const openRows = vote.votes ? vote.voters.filter(id => vote.votes![id]) : []
  return (
    <Screen>
      <Title sub={vote.runoff ? `Переголосування: ${vote.candidates.map(id => nameOf(view, id)).join(', ')}` : view.settings.voteMode === 'secret' ? 'Таємне: ніхто не бачить, хто за кого' : 'Відкрите: усі бачать голоси'}>
        Голосування {view.settings.voteMode === 'secret' ? '🤫' : '✋'}
      </Title>

      {canVote ? (
        <>
          <div className="font-semibold">Проти кого ти голосуєш?</div>
          <Picker options={options} value={vote.myVote} onChange={id => game({ type: 'castVote', targetId: id })} />
          {vote.myVote && <p className="text-center text-sm text-gray-500">Голос зараховано. Поки ведучий не підсумував, його можна змінити.</p>}
        </>
      ) : (
        <p className="text-center text-gray-500">Ти спостерігаєш за голосуванням.</p>
      )}

      <Progress done={vote.votedIds.length} total={vote.voters.length} label="Проголосували" />

      {openRows.length > 0 && (
        <div className="flex flex-col gap-1 rounded-2xl bg-gray-50 p-4 text-sm">
          {openRows.map(id => (
            <div key={id} className="flex justify-between gap-2">
              <span>{nameOf(view, id)}</span>
              <b>{vote.votes![id] === ABSTAIN ? 'утримується' : `→ ${nameOf(view, vote.votes![id])}`}</b>
            </div>
          ))}
        </div>
      )}

      {room.isHost ? (
        <>
          <Btn
            disabled={busy}
            onClick={() => {
              const missing = vote.voters.length - vote.votedIds.length
              if (missing === 0 || window.confirm(`Ще не проголосували: ${missing}. Підсумувати? Їхні голоси — «утримуюсь».`)) {
                game({ type: 'finishVote' })
              }
            }}
          >
            Підсумувати голосування
          </Btn>
          {view.round === 1 && !vote.runoff && (
            <button type="button" className="self-center text-sm font-semibold text-gray-500 underline" onClick={() => game({ type: 'skipVote' })}>
              Пропустити перше голосування
            </button>
          )}
        </>
      ) : (
        <WaitHost room={room}>⏳ Ведучий підсумує, коли всі проголосують</WaitHost>
      )}
    </Screen>
  )
}

function Runoff({ room, view, busy, game }: ScreenProps) {
  const candidates = view.vote!.candidates
  return (
    <Screen>
      <Title sub={`Порівну голосів: ${candidates.map(id => nameOf(view, id)).join(', ')}`}>Нічия ⚖️</Title>
      <p className="text-center text-gray-600">Кожен кандидат має 30 секунд, щоб виправдатися. Потім — переголосування лише між ними.</p>
      {candidates.includes(view.meId) && <SpeechTimer seconds={30} label="Твоє виправдання" />}
      {room.isHost ? (
        <Btn disabled={busy} onClick={() => game({ type: 'runoffDone' })}>
          До переголосування
        </Btn>
      ) : (
        <WaitHost room={room}>⏳ Ведучий відкриє переголосування</WaitHost>
      )}
    </Screen>
  )
}

function VoteResult({ room, view, theme, busy, game }: ScreenProps) {
  const day = view.lastDay
  const out = day?.eliminatedId ?? null
  const outPlayer = view.players.find(p => p.id === out)
  const rows = day ? Object.entries(day.tally).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]) : []
  return (
    <Screen>
      <div className="text-center text-6xl">{out ? '🚪' : '🤝'}</div>
      <Title sub={day?.skipped ? 'Перше голосування пропущено' : day?.runoff ? 'Після переголосування' : undefined}>
        {out ? theme.dayEliminated(nameOf(view, out)) : theme.dayNobody}
      </Title>
      {outPlayer?.role && (
        <div className="text-center text-lg">
          Роль: <b><RoleLabel theme={theme} role={outPlayer.role} /></b>
        </div>
      )}
      {rows.length > 0 && (
        <div className="flex flex-col gap-1 rounded-2xl bg-gray-50 p-4 text-sm">
          {rows.map(([id, n]) => (
            <div key={id} className="flex justify-between">
              <span>{nameOf(view, id)}</span>
              <b>{n}</b>
            </div>
          ))}
          <div className="flex justify-between text-gray-500">
            <span>Утримались</span>
            <b>{day!.abstain}</b>
          </div>
        </div>
      )}
      {out === view.meId && <p className="text-center text-sm text-gray-500">{theme.spectator}</p>}
      {out && !view.winner && <SpeechTimer seconds={30} label={`Останнє слово: ${nameOf(view, out)}`} />}
      {room.isHost ? (
        <Btn disabled={busy} onClick={() => game({ type: 'continue' })}>
          {view.winner ? 'Підсумки гри' : 'Настає ніч 🌙'}
        </Btn>
      ) : (
        <WaitHost room={room} />
      )}
    </Screen>
  )
}
