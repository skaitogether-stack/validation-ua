// Онлайн-режим «Мафії»: кожен грає зі свого пристрою.
// Тут чисті функції без доступу до БД:
//  - хто яку дію може виконати (ведучий / гравець);
//  - що саме бачить кожен гравець (чужі ролі й нічні вибори сервер не віддає).

import { alivePlayers, nightChoiceRequired, nightTargets, reduce, voteOptions } from './engine'
import type {
  DayEvent,
  DetectiveCheck,
  GameAction,
  GameState,
  Phase,
  RoleId,
  Settings,
  Team
} from './types'

export interface RoomMeta {
  discussionEndsAt: number | null // мс, спільний таймер обговорення
}

export interface OnlineState {
  game: GameState
  meta: RoomMeta
}

// Дії, які надсилає клієнт. actorId / voterId сервер підставляє сам.
export type ClientGameAction =
  | { type: 'ready' }
  | { type: 'nightChoose'; targetId: string | null }
  | { type: 'nightDone' }
  | { type: 'castVote'; targetId: string }
  | { type: 'startNight' }
  | { type: 'continue' }
  | { type: 'toVote' }
  | { type: 'skipVote' }
  | { type: 'finishVote' }
  | { type: 'runoffDone' }
  | { type: 'forceAdvance' }
  | { type: 'extendDiscussion' }

const HOST_ACTIONS = new Set<ClientGameAction['type']>([
  'startNight',
  'continue',
  'toVote',
  'skipVote',
  'finishVote',
  'runoffDone',
  'forceAdvance',
  'extendDiscussion'
])

export function isHostAction(type: string): boolean {
  return HOST_ACTIONS.has(type as ClientGameAction['type'])
}

function toEngineAction(action: ClientGameAction, playerId: string): GameAction | null {
  switch (action.type) {
    case 'ready':
      return { type: 'ready', actorId: playerId }
    case 'nightChoose':
      return { type: 'nightChoose', actorId: playerId, targetId: action.targetId }
    case 'nightDone':
      return { type: 'nightDone', actorId: playerId }
    case 'castVote':
      return { type: 'castVote', voterId: playerId, targetId: action.targetId }
    case 'startNight':
    case 'continue':
    case 'toVote':
    case 'skipVote':
    case 'finishVote':
    case 'runoffDone':
    case 'forceAdvance':
      return { type: action.type }
    default:
      return null
  }
}

const EXTEND_MS = 30_000

// Застосовує дію гравця. Повертає новий стан або текст помилки.
export function applyOnlineAction(
  state: OnlineState,
  playerId: string,
  isHost: boolean,
  action: ClientGameAction,
  now: number
): OnlineState | string {
  if (!action || typeof action.type !== 'string') return 'Некоректна дія'
  if (isHostAction(action.type) && !isHost) return 'Цю дію виконує лише ведучий'

  if (action.type === 'extendDiscussion') {
    if (state.game.phase !== 'discussion') return 'Зараз не обговорення'
    const base = Math.max(now, state.meta.discussionEndsAt ?? now)
    return { ...state, meta: { ...state.meta, discussionEndsAt: base + EXTEND_MS } }
  }

  const engineAction = toEngineAction(action, playerId)
  if (!engineAction) return 'Некоректна дія'
  const game = reduce(state.game, engineAction)
  if (game === state.game) return 'Цю дію зараз виконати не можна'

  let meta = state.meta
  if (game.phase === 'discussion' && state.game.phase !== 'discussion') {
    meta = { ...meta, discussionEndsAt: now + game.settings.discussionSeconds * 1000 }
  } else if (game.phase !== 'discussion' && meta.discussionEndsAt !== null) {
    meta = { ...meta, discussionEndsAt: null }
  }
  return { game, meta }
}

// ---------- Що бачить конкретний гравець ----------

export interface PlayerSummary {
  id: string
  name: string
  alive: boolean
  role: RoleId | null // null — роль цьому гравцю невідома
  ready: boolean
}

export interface NightView {
  choice: string | null
  targets: string[]
  required: boolean
  done: boolean
  partnerChoices: Record<string, string> // для мафії: вибори партнерів
  checkResult: boolean | null // для комісара: чи ціль — мафія
  doctorLastId: string | null
  doctorSelfUsed: boolean
}

export interface VoteView {
  candidates: string[]
  voters: string[]
  runoff: boolean
  options: string[] // за кого можу голосувати я
  myVote: string | null
  votedIds: string[] // хто вже проголосував
  votes: Record<string, string> | null // відкрите голосування — усі голоси, таємне — null
}

export interface PlayerView {
  meId: string
  myRole: RoleId
  alive: boolean
  phase: Phase
  round: number
  settings: Settings
  winner: Team | null
  players: PlayerSummary[]
  readyCount: number
  readyTotal: number
  night: NightView | null
  detectiveChecks: DetectiveCheck[]
  lastNight: { round: number; eliminatedId: string | null } | null
  lastDay: DayEvent | null
  vote: VoteView | null
  discussionEndsAt: number | null
  final: GameState | null // повний стан — лише після завершення гри
}

export function viewFor(state: OnlineState, playerId: string): PlayerView | null {
  const { game, meta } = state
  const me = game.players.find(p => p.id === playerId)
  if (!me) return null
  const over = game.phase === 'gameOver'

  const knowsRole = (p: GameState['players'][number]) =>
    over ||
    p.id === me.id ||
    (me.role === 'mafia' && p.role === 'mafia') ||
    (!p.alive && game.settings.revealRoleOnElimination)

  const players: PlayerSummary[] = game.players.map(p => ({
    id: p.id,
    name: p.name,
    alive: p.alive,
    role: knowsRole(p) ? p.role : null,
    ready: game.ready.includes(p.id)
  }))

  const readyTotal = game.phase === 'night' ? alivePlayers(game).length : game.players.length

  let night: NightView | null = null
  if (game.phase === 'night' && me.alive) {
    const choice = game.nightChoices[me.id] ?? null
    const partnerChoices: Record<string, string> = {}
    if (me.role === 'mafia') {
      for (const p of game.players) {
        if (p.role === 'mafia' && p.id !== me.id && game.nightChoices[p.id]) partnerChoices[p.id] = game.nightChoices[p.id]
      }
    }
    night = {
      choice,
      targets: nightTargets(game, me).map(p => p.id),
      required: nightChoiceRequired(game, me),
      done: game.ready.includes(me.id),
      partnerChoices,
      checkResult:
        me.role === 'detective' && choice ? game.players.find(p => p.id === choice)?.role === 'mafia' : null,
      doctorLastId: me.role === 'doctor' ? game.lastDoctorTargetId : null,
      doctorSelfUsed: me.role === 'doctor' ? game.doctorSelfUsed : false
    }
  }

  let lastNight: PlayerView['lastNight'] = null
  let lastDay: DayEvent | null = null
  for (const e of game.log) {
    if (e.kind === 'night') lastNight = { round: e.round, eliminatedId: e.eliminatedId }
    else lastDay = e
  }

  let vote: VoteView | null = null
  if (game.vote) {
    const v = game.vote
    vote = {
      candidates: v.candidates,
      voters: v.voters,
      runoff: v.runoff,
      options: voteOptions(game, me.id),
      myVote: v.votes[me.id] ?? null,
      votedIds: v.voters.filter(id => v.votes[id]),
      votes: game.settings.voteMode === 'open' ? v.votes : null
    }
  }

  return {
    meId: me.id,
    myRole: me.role,
    alive: me.alive,
    phase: game.phase,
    round: game.round,
    settings: game.settings,
    winner: game.winner, // переможець відомий усім, щойно вибуття сталося
    players,
    readyCount: game.ready.length,
    readyTotal,
    night,
    detectiveChecks: me.role === 'detective' ? game.detectiveChecks : [],
    lastNight,
    lastDay,
    vote,
    discussionEndsAt: game.phase === 'discussion' ? meta.discussionEndsAt : null,
    final: over ? game : null
  }
}
