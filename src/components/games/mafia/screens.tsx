'use client'

import { useState, type ReactNode } from 'react'
import {
  alivePlayers,
  currentActor,
  getPlayer,
  lastEvent,
  mafiaTarget,
  nightChoiceRequired,
  nightTargets,
  tallyVotes,
  teamOf,
  voteOptions
} from '../../../lib/games/mafia/engine'
import { THEMES, type ThemeStrings } from '../../../lib/games/mafia/themes'
import { ABSTAIN, type GameAction, type GameState, type Player } from '../../../lib/games/mafia/types'
import { Btn, HoldToReveal, PassGate, Picker, Screen, SpeechTimer, Title, formatTime, useCountdown } from './ui'

type Dispatch = (a: GameAction) => void

interface ScreenProps {
  state: GameState
  dispatch: Dispatch
}

const MIN_TURN_SECONDS = 5

function themeOf(state: GameState): ThemeStrings {
  return THEMES[state.settings.theme]
}

function name(state: GameState, id: string | null): string {
  return id ? getPlayer(state, id).name : '—'
}

function RoleBadge({ theme, player }: { theme: ThemeStrings; player: Player }) {
  const role = theme.roles[player.role]
  return (
    <span className="whitespace-nowrap">
      {role.icon} {role.name}
    </span>
  )
}

// ---------- Роздача ролей ----------

export function RoleCard({ state, player }: { state: GameState; player: Player }) {
  const theme = themeOf(state)
  const role = theme.roles[player.role]
  const partners = state.players.filter(p => p.role === 'mafia' && p.id !== player.id)
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-6xl">{role.icon}</div>
      <div className="text-3xl font-extrabold">{role.name}</div>
      <div className="text-sm font-semibold text-amber-300">Команда: {theme.teams[teamOf(player.role)]}</div>
      <p className="mt-1 text-base">{role.goal}</p>
      <p className="text-sm opacity-80">{role.night}</p>
      {player.role === 'mafia' && partners.length > 0 && (
        <p className="mt-1 text-sm font-bold text-amber-200">Твої партнери: {partners.map(p => p.name).join(', ')}</p>
      )}
    </div>
  )
}

export function RevealScreen({ state, dispatch }: ScreenProps) {
  const player = currentActor(state)!
  return (
    <PassGate key={player.id} name={player.name} hint="Подивися свою роль так, щоб ніхто не бачив екран." night>
      <RevealInner state={state} player={player} dispatch={dispatch} />
    </PassGate>
  )
}

function RevealInner({ state, player, dispatch }: ScreenProps & { player: Player }) {
  const [seen, setSeen] = useState(false)
  const last = state.turn === state.players.length - 1
  return (
    <Screen night>
      <Title sub="Запам'ятай свою роль і нікому її не показуй">{player.name}</Title>
      <HoldToReveal onSeen={() => setSeen(true)}>
        <RoleCard state={state} player={player} />
      </HoldToReveal>
      <Btn variant="night" disabled={!seen} onClick={() => dispatch({ type: 'revealNext' })}>
        {last ? 'Запам’ятав(ла). Усі ролі роздано' : 'Запам’ятав(ла), передаю далі'}
      </Btn>
    </Screen>
  )
}

// ---------- Ніч ----------

export function NightIntroScreen({ state, dispatch }: ScreenProps) {
  const theme = themeOf(state)
  return (
    <Screen night>
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="text-7xl">🌙</div>
        <Title sub={`Ніч ${state.round}`}>{theme.sleep}</Title>
        <p className="max-w-sm opacity-80">
          Зараз телефон піде по колу. Кожен по черзі таємно зробить свій нічний хід — навіть ті, у кого немає особливої
          ролі. Так ніхто не здогадається, хто є хто.
        </p>
        <p className="max-w-sm text-sm opacity-60">Першим телефон бере: {alivePlayers(state)[0]?.name}</p>
        <Btn variant="night" onClick={() => dispatch({ type: 'startNight' })}>
          Почати ніч
        </Btn>
      </div>
    </Screen>
  )
}

export function NightScreen({ state, dispatch }: ScreenProps) {
  const player = currentActor(state)!
  return (
    <PassGate key={`${state.round}-${player.id}`} name={player.name} hint="Тримай телефон так, щоб ніхто не бачив екран." night>
      <NightTurn state={state} player={player} dispatch={dispatch} />
    </PassGate>
  )
}

function NightTurn({ state, player, dispatch }: ScreenProps & { player: Player }) {
  const theme = themeOf(state)
  const role = theme.roles[player.role]
  const { left } = useCountdown(MIN_TURN_SECONDS, true)
  const choice = state.nightChoices[player.id] ?? null
  const targets = nightTargets(state, player)
  const targetIds = new Set(targets.map(t => t.id))
  const required = nightChoiceRequired(state, player)
  const others = alivePlayers(state).filter(p => p.id !== player.id || player.role === 'doctor')

  const options = others.map(p => {
    let note: string | undefined
    if (!targetIds.has(p.id) && player.role === 'doctor') {
      note = p.id === state.lastDoctorTargetId ? 'лікував(ла) минулої ночі' : 'себе вже лікував(ла)'
    }
    if (player.role === 'mafia' && p.role === 'mafia') note = 'партнер'
    return {
      id: p.id,
      label: p.id === player.id ? `${p.name} (я)` : p.name,
      disabled: !targetIds.has(p.id) || (player.role === 'detective' && !!choice),
      note
    }
  })

  const partners = state.players.filter(p => p.role === 'mafia' && p.id !== player.id)
  const currentMafiaTarget = mafiaTarget(state)
  const checked = player.role === 'detective' && choice ? getPlayer(state, choice) : null

  return (
    <Screen night>
      <div className="text-center">
        <div className="text-sm opacity-70">Ніч {state.round} · {player.name}</div>
        <div className="mt-1 text-2xl font-extrabold">
          {role.icon} {role.name}
        </div>
      </div>

      {player.role === 'mafia' && (
        <div className="rounded-2xl bg-white/10 p-3 text-sm">
          {partners.length > 0 ? (
            <>
              <div>
                Партнери:{' '}
                {partners.map(p => `${p.name}${p.alive ? '' : ' (вибув)'}`).join(', ')}
              </div>
              {currentMafiaTarget && (
                <div className="mt-1 font-bold text-amber-200">Уже обрано: {name(state, currentMafiaTarget)}</div>
              )}
              <div className="mt-1 opacity-70">Обирайте одну ціль. Якщо вибори різні, діє вибір першого за місцем.</div>
            </>
          ) : (
            <div>Ти дієш сам(а).</div>
          )}
        </div>
      )}

      {player.role === 'detective' && state.detectiveChecks.length > 0 && (
        <div className="rounded-2xl bg-white/10 p-3 text-sm">
          <div className="font-bold">Твої попередні перевірки:</div>
          {state.detectiveChecks.map(c => (
            <div key={c.round}>
              Ніч {c.round}: {name(state, c.targetId)} — {c.isMafia ? `${theme.roles.mafia.name} ❗` : `не ${theme.roles.mafia.name.toLowerCase()}`}
            </div>
          ))}
        </div>
      )}

      <div className="font-semibold">{role.action}</div>
      <Picker night options={options} value={choice} onChange={id => dispatch({ type: 'nightChoose', targetId: id })} />

      {checked && (
        <div className={`rounded-2xl p-4 text-center text-xl font-extrabold ${checked.role === 'mafia' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
          {checked.name} — {checked.role === 'mafia' ? theme.roles.mafia.name : `не ${theme.roles.mafia.name.toLowerCase()}`}
        </div>
      )}

      {!required && choice && (
        <button type="button" className="self-start text-sm underline opacity-70" onClick={() => dispatch({ type: 'nightChoose', targetId: null })}>
          Скасувати вибір
        </button>
      )}

      <Btn variant="night" disabled={left > 0 || (required && !choice)} onClick={() => dispatch({ type: 'nightDone' })}>
        {left > 0 ? `Готово (${left})` : 'Готово, передаю далі'}
      </Btn>
    </Screen>
  )
}

// ---------- Ранок ----------

function EliminatedRole({ state, player }: { state: GameState; player: Player }) {
  const theme = themeOf(state)
  if (!state.settings.revealRoleOnElimination) return null
  return (
    <div className="text-center text-lg">
      Роль: <b><RoleBadge theme={theme} player={player} /></b>
    </div>
  )
}

export function MorningScreen({ state, dispatch }: ScreenProps) {
  const theme = themeOf(state)
  const night = lastEvent(state, 'night')
  const out = night?.eliminatedId ? getPlayer(state, night.eliminatedId) : null
  return (
    <Screen>
      <div className="text-center text-6xl">☀️</div>
      <Title sub={`День ${state.round}`}>{theme.wake}</Title>
      <div className={`rounded-2xl p-5 text-center text-xl font-bold ${out ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'}`}>
        {out ? theme.nightEliminated(out.name) : theme.nightNobody}
      </div>
      {out && (
        <>
          <EliminatedRole state={state} player={out} />
          {!state.winner && (
            <>
              <SpeechTimer seconds={30} label={`Останнє слово: ${out.name}`} />
              <p className="text-center text-sm text-gray-500">{theme.spectator}</p>
            </>
          )}
        </>
      )}
      <Btn onClick={() => dispatch({ type: 'continue' })}>{state.winner ? 'Підсумки гри' : 'До обговорення'}</Btn>
    </Screen>
  )
}

// ---------- Обговорення ----------

export function DiscussionScreen({ state, dispatch }: ScreenProps) {
  const [mode, setMode] = useState<'free' | 'turns'>('free')
  const alive = alivePlayers(state)
  return (
    <Screen>
      <Title sub={`День ${state.round} · у грі ${alive.length}`}>Обговорення 🗣️</Title>
      <div className="flex rounded-2xl bg-gray-100 p-1">
        {(['free', 'turns'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`min-h-11 flex-1 rounded-xl text-sm font-bold ${mode === m ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'}`}
          >
            {m === 'free' ? 'Вільно' : 'По черзі'}
          </button>
        ))}
      </div>
      {mode === 'free' ? <FreeDiscussion key="free" seconds={state.settings.discussionSeconds} /> : <TurnDiscussion key="turns" players={alive} />}
      <div className="flex flex-wrap justify-center gap-2">
        {alive.map(p => (
          <span key={p.id} className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold">
            {p.name}
          </span>
        ))}
      </div>
      <Btn onClick={() => dispatch({ type: 'toVote' })}>До голосування</Btn>
    </Screen>
  )
}

function FreeDiscussion({ seconds }: { seconds: number }) {
  const timer = useCountdown(seconds, true)
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-gray-50 p-5">
      <div className={`text-6xl font-extrabold tabular-nums ${timer.left === 0 ? 'text-rose-500' : ''}`}>{formatTime(timer.left)}</div>
      {timer.left === 0 && <div className="font-bold text-rose-600">Час вийшов — переходьте до голосування!</div>}
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-xl bg-white px-4 py-2 text-sm font-bold shadow-sm"
          onClick={() => (timer.running ? timer.pause() : timer.start())}
          disabled={timer.left === 0}
        >
          {timer.running ? '⏸ Пауза' : '▶ Продовжити'}
        </button>
        <button type="button" className="rounded-xl bg-white px-4 py-2 text-sm font-bold shadow-sm" onClick={() => timer.add(30)}>
          +30 с
        </button>
      </div>
    </div>
  )
}

function TurnDiscussion({ players }: { players: Player[] }) {
  const [i, setI] = useState(0)
  const speaker = players[i]
  if (!speaker) {
    return <div className="rounded-2xl bg-gray-50 p-5 text-center font-bold">Усі висловилися 👍</div>
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="text-center text-sm text-gray-500">
        Говорить {i + 1} з {players.length}
      </div>
      <SpeakerTurn key={speaker.id} name={speaker.name} onNext={() => setI(i + 1)} />
    </div>
  )
}

function SpeakerTurn({ name: speaker, onNext }: { name: string; onNext: () => void }) {
  const timer = useCountdown(30, true)
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-gray-50 p-5">
      <div className="text-2xl font-extrabold">{speaker}</div>
      <div className={`text-5xl font-extrabold tabular-nums ${timer.left === 0 ? 'text-rose-500' : ''}`}>{formatTime(timer.left)}</div>
      <button type="button" className="rounded-xl bg-white px-4 py-2 text-sm font-bold shadow-sm" onClick={onNext}>
        Наступний →
      </button>
    </div>
  )
}

// ---------- Голосування ----------

function Tally({ state }: { state: GameState }) {
  const { tally, abstain } = tallyVotes(state)
  const rows = Object.entries(tally).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])
  if (rows.length === 0 && abstain === 0) return null
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-gray-50 p-4 text-sm">
      {rows.map(([id, n]) => (
        <div key={id} className="flex justify-between">
          <span>{name(state, id)}</span>
          <b>{n}</b>
        </div>
      ))}
      <div className="flex justify-between text-gray-500">
        <span>Утримались / не проголосували</span>
        <b>{abstain}</b>
      </div>
    </div>
  )
}

export function VoteScreen({ state, dispatch }: ScreenProps) {
  const vote = state.vote!
  const canSkip = state.round === 1 && !vote.runoff
  const skip = canSkip ? (
    <button type="button" className="self-center text-sm font-semibold text-gray-500 underline" onClick={() => dispatch({ type: 'skipVote' })}>
      Пропустити перше голосування
    </button>
  ) : null

  if (state.settings.voteMode === 'secret') {
    const voter = currentActor(state)
    if (voter) {
      return (
        <PassGate key={`${vote.runoff}-${voter.id}`} name={voter.name} hint="Проголосуй так, щоб ніхто не бачив екран.">
          <SecretBallot state={state} voter={voter} dispatch={dispatch} />
        </PassGate>
      )
    }
    return (
      <Screen>
        <Title sub="Усі проголосували">Голосування завершено 🗳️</Title>
        <Btn onClick={() => dispatch({ type: 'finishVote' })}>Показати результат</Btn>
      </Screen>
    )
  }

  return (
    <Screen>
      <Title sub={vote.runoff ? 'Переголосування між лідерами' : 'На рахунок «три» кожен показує пальцем на того, кого підозрює'}>
        Голосування ✋
      </Title>
      {vote.runoff && (
        <div className="text-center font-bold">Кандидати: {vote.candidates.map(id => name(state, id)).join(', ')}</div>
      )}
      <p className="text-sm text-gray-500">Позначте, хто на кого показав. Хто не показав ні на кого — «утримуюсь».</p>
      <div className="flex flex-col gap-2">
        {vote.voters.map(voterId => (
          <label key={voterId} className="flex items-center justify-between gap-3">
            <span className="min-w-0 break-words font-semibold">{name(state, voterId)}</span>
            <select
              value={vote.votes[voterId] ?? ABSTAIN}
              onChange={e => dispatch({ type: 'castVote', voterId, targetId: e.target.value })}
              className="min-h-11 w-40 shrink-0 rounded-xl border border-gray-200 bg-white px-2"
              aria-label={`Голос гравця ${name(state, voterId)}`}
            >
              <option value={ABSTAIN}>— утримуюсь</option>
              {voteOptions(state, voterId).map(id => (
                <option key={id} value={id}>
                  проти {name(state, id)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <Tally state={state} />
      <Btn onClick={() => dispatch({ type: 'finishVote' })}>Підрахувати голоси</Btn>
      {skip}
    </Screen>
  )
}

function SecretBallot({ state, voter, dispatch }: ScreenProps & { voter: Player }) {
  const vote = state.vote!
  const choice = vote.votes[voter.id] ?? null
  const options = [
    ...voteOptions(state, voter.id).map(id => ({ id, label: name(state, id) })),
    { id: ABSTAIN, label: 'Утримуюсь' }
  ]
  return (
    <Screen>
      <Title sub={vote.runoff ? 'Переголосування між лідерами' : `День ${state.round}`}>{voter.name}, твій голос</Title>
      <Picker options={options} value={choice} onChange={id => dispatch({ type: 'castVote', voterId: voter.id, targetId: id })} />
      <Btn disabled={!choice} onClick={() => dispatch({ type: 'secretVoteDone' })}>
        Проголосувати й передати далі
      </Btn>
    </Screen>
  )
}

export function RunoffScreen({ state, dispatch }: ScreenProps) {
  const candidates = state.vote!.candidates
  const [i, setI] = useState(0)
  const speaker = candidates[i]
  return (
    <Screen>
      <Title sub={`Порівну голосів: ${candidates.map(id => name(state, id)).join(', ')}`}>Нічия ⚖️</Title>
      <p className="text-center text-gray-600">Кожен кандидат має 30 секунд, щоб виправдатися. Потім — переголосування лише між ними.</p>
      {speaker ? (
        <SpeakerTurn key={speaker} name={name(state, speaker)} onNext={() => setI(i + 1)} />
      ) : (
        <div className="rounded-2xl bg-gray-50 p-5 text-center font-bold">Усі кандидати висловилися</div>
      )}
      <Btn onClick={() => dispatch({ type: 'runoffDone' })}>До переголосування</Btn>
    </Screen>
  )
}

export function VoteResultScreen({ state, dispatch }: ScreenProps) {
  const theme = themeOf(state)
  const day = lastEvent(state, 'day')
  const out = day?.eliminatedId ? getPlayer(state, day.eliminatedId) : null
  const rows = day ? Object.entries(day.tally).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]) : []
  return (
    <Screen>
      <div className="text-center text-6xl">{out ? '🚪' : '🤝'}</div>
      <Title sub={day?.skipped ? 'Перше голосування пропущено' : day?.runoff ? 'Після переголосування' : undefined}>
        {out ? theme.dayEliminated(out.name) : theme.dayNobody}
      </Title>
      {out && <EliminatedRole state={state} player={out} />}
      {rows.length > 0 && (
        <div className="flex flex-col gap-1 rounded-2xl bg-gray-50 p-4 text-sm">
          {rows.map(([id, n]) => (
            <div key={id} className="flex justify-between">
              <span>{name(state, id)}</span>
              <b>{n}</b>
            </div>
          ))}
          <div className="flex justify-between text-gray-500">
            <span>Утримались</span>
            <b>{day!.abstain}</b>
          </div>
        </div>
      )}
      {out && !state.winner && <SpeechTimer seconds={30} label={`Останнє слово: ${out.name}`} />}
      <Btn onClick={() => dispatch({ type: 'continue' })}>{state.winner ? 'Підсумки гри' : 'Настає ніч 🌙'}</Btn>
    </Screen>
  )
}

// ---------- Кінець гри ----------

export function GameOverScreen({
  state,
  onReplay,
  onNewPlayers,
  replayLabel = 'Ще раз (ті самі гравці)',
  newPlayersLabel = 'Змінити гравців і налаштування',
  footer
}: {
  state: GameState
  onReplay?: () => void
  onNewPlayers?: () => void
  replayLabel?: string
  newPlayersLabel?: string
  footer?: ReactNode
}) {
  const theme = themeOf(state)
  const winner = state.winner!
  const suspicionCount = new Map<string, number>()
  for (const s of state.suspicions) suspicionCount.set(s.targetId, (suspicionCount.get(s.targetId) ?? 0) + 1)
  const topSuspects = [...suspicionCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)

  const timeline: string[] = []
  for (const e of state.log) {
    if (e.kind === 'night') {
      const parts = [`🌙 Ніч ${e.round}. ${theme.roles.mafia.icon} ${theme.roles.mafia.name}: ${name(state, e.mafiaTargetId)}`]
      if (e.doctorTargetId) parts.push(`${theme.roles.doctor.icon} ${theme.roles.doctor.name}: ${name(state, e.doctorTargetId)}`)
      if (e.detectiveTargetId) parts.push(`${theme.roles.detective.icon} ${theme.roles.detective.name}: ${name(state, e.detectiveTargetId)}`)
      parts.push(e.eliminatedId ? `вибуває ${name(state, e.eliminatedId)}` : 'ніхто не вибув')
      timeline.push(parts.join(' · '))
    } else {
      timeline.push(
        `☀️ День ${e.round}. ${e.skipped ? 'Голосування пропущено' : e.eliminatedId ? `Вибуває ${name(state, e.eliminatedId)}` : 'Ніхто не вибув'}`
      )
    }
  }

  return (
    <Screen>
      <div className="text-center text-7xl">{winner === 'town' ? '🎉' : theme.roles.mafia.icon}</div>
      <Title>{theme.win[winner]}</Title>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Хто ким був</h3>
        {state.players.map(p => (
          <div
            key={p.id}
            className={`flex items-center justify-between rounded-xl px-3 py-2 ${teamOf(p.role) === winner ? 'bg-emerald-50' : 'bg-gray-50'}`}
          >
            <span className={`font-semibold ${p.alive ? '' : 'text-gray-400 line-through'}`}>{p.name}</span>
            <RoleBadge theme={theme} player={p} />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Як це було</h3>
        {timeline.map((t, i) => (
          <div key={i} className="text-sm">
            {t}
          </div>
        ))}
      </div>

      {topSuspects.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Кого найбільше підозрювали вночі</h3>
          {topSuspects.map(([id, n]) => (
            <div key={id} className="flex justify-between text-sm">
              <span>
                {name(state, id)} (<RoleBadge theme={theme} player={getPlayer(state, id)} />)
              </span>
              <b>{n}</b>
            </div>
          ))}
        </div>
      )}

      {onReplay && <Btn onClick={onReplay}>{replayLabel}</Btn>}
      {onNewPlayers && (
        <Btn variant="secondary" onClick={onNewPlayers}>
          {newPlayersLabel}
        </Btn>
      )}
      {footer}
    </Screen>
  )
}
