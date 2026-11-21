// Ядро гри «Мафія» — чистий редʼюсер без залежностей від UI.
// Порядок ходів, обмеження ролей, розв'язання ночі, голосування й умови перемоги.

import {
  ABSTAIN,
  type DayEvent,
  type GameAction,
  type GameMode,
  type GameState,
  type NightEvent,
  type Player,
  type RoleId,
  type RoleSetup,
  type Settings,
  type Team
} from './types'

export const MIN_PLAYERS = 5
export const MAX_PLAYERS = 12

export const DEFAULT_SETTINGS: Settings = {
  theme: 'city',
  voteMode: 'open',
  revealRoleOnElimination: true,
  discussionSeconds: 180,
  voice: false
}

// Склад ролей за замовчуванням (див. docs/games/mafia-scenarios.md, варіант A)
export function defaultSetup(playerCount: number): RoleSetup {
  const mafia = playerCount <= 6 ? 1 : playerCount <= 9 ? 2 : 3
  return { mafia, doctor: true, detective: true }
}

// Повертає текст помилки або null, якщо склад допустимий
export function validateSetup(playerCount: number, setup: RoleSetup): string | null {
  if (playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    return `Потрібно від ${MIN_PLAYERS} до ${MAX_PLAYERS} гравців`
  }
  if (setup.mafia < 1) return 'Має бути хоча б одна мафія'
  if (setup.mafia * 2 >= playerCount) return 'Мафії має бути менше, ніж половина гравців'
  const specials = (setup.doctor ? 1 : 0) + (setup.detective ? 1 : 0)
  if (setup.mafia + specials > playerCount) return 'Забагато ролей для такої кількості гравців'
  return null
}

export function buildRoles(playerCount: number, setup: RoleSetup): RoleId[] {
  const roles: RoleId[] = Array.from({ length: setup.mafia }, () => 'mafia' as const)
  if (setup.doctor) roles.push('doctor')
  if (setup.detective) roles.push('detective')
  while (roles.length < playerCount) roles.push('civilian')
  return roles
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function createGame(
  names: string[],
  settings: Settings,
  setup: RoleSetup,
  opts: { rng?: () => number; ids?: string[]; mode?: GameMode } = {}
): GameState {
  const error = validateSetup(names.length, setup)
  if (error) throw new Error(error)
  const roles = shuffle(buildRoles(names.length, setup), opts.rng)
  return {
    version: 1,
    mode: opts.mode ?? 'local',
    settings,
    players: names.map((name, i) => ({ id: opts.ids?.[i] ?? `p${i + 1}`, name, role: roles[i], alive: true })),
    round: 1,
    phase: 'reveal',
    turn: 0,
    ready: [],
    nightChoices: {},
    lastDoctorTargetId: null,
    doctorSelfUsed: false,
    detectiveChecks: [],
    suspicions: [],
    vote: null,
    log: [],
    winner: null
  }
}

// ---------- Довідкові функції для UI ----------

export function teamOf(role: RoleId): Team {
  return role === 'mafia' ? 'mafia' : 'town'
}

export function getPlayer(state: GameState, id: string): Player {
  const p = state.players.find(pl => pl.id === id)
  if (!p) throw new Error(`Unknown player ${id}`)
  return p
}

export function alivePlayers(state: GameState): Player[] {
  return state.players.filter(p => p.alive)
}

// Черга нічного кола — усі живі гравці в порядку місць
export function nightQueue(state: GameState): Player[] {
  return alivePlayers(state)
}

// Чий зараз хід у колі (роздача ролей, ніч, таємне голосування). В online черги немає.
export function currentActor(state: GameState): Player | null {
  if (state.mode === 'online') return null
  if (state.phase === 'reveal') return state.players[state.turn] ?? null
  if (state.phase === 'night') return nightQueue(state)[state.turn] ?? null
  if (state.phase === 'vote' && state.settings.voteMode === 'secret' && state.vote) {
    const id = state.vote.voters[state.vote.turn]
    return id ? getPlayer(state, id) : null
  }
  return null
}

// Кого гравець може обрати своєю нічною дією
export function nightTargets(state: GameState, actor: Player): Player[] {
  const alive = alivePlayers(state)
  switch (actor.role) {
    case 'mafia':
      return alive.filter(p => p.role !== 'mafia')
    case 'doctor':
      return alive.filter(
        p => p.id !== state.lastDoctorTargetId && !(p.id === actor.id && state.doctorSelfUsed)
      )
    case 'detective':
      return alive.filter(p => p.id !== actor.id)
    case 'civilian':
      return alive.filter(p => p.id !== actor.id)
  }
}

// Чи обов'язково зробити вибір перед «Готово»
export function nightChoiceRequired(state: GameState, actor: Player): boolean {
  return actor.role !== 'civilian' && nightTargets(state, actor).length > 0
}

// Ціль мафії: вибір першого (за місцями) живого мафіозі, який уже обрав
export function mafiaTarget(state: GameState): string | null {
  for (const p of alivePlayers(state)) {
    if (p.role === 'mafia' && state.nightChoices[p.id]) return state.nightChoices[p.id]
  }
  return null
}

export function checkWinner(players: Player[]): Team | null {
  const alive = players.filter(p => p.alive)
  const mafia = alive.filter(p => p.role === 'mafia').length
  if (mafia === 0) return 'town'
  if (mafia >= alive.length - mafia) return 'mafia'
  return null
}

export function tallyVotes(state: GameState): { tally: Record<string, number>; abstain: number } {
  const vote = state.vote
  const tally: Record<string, number> = {}
  let abstain = 0
  if (!vote) return { tally, abstain }
  for (const c of vote.candidates) tally[c] = 0
  for (const voterId of vote.voters) {
    const target = vote.votes[voterId]
    if (target && target !== ABSTAIN && target in tally) tally[target]++
    else abstain++
  }
  return { tally, abstain }
}

// Кандидати, за яких може голосувати конкретний гравець (не за себе)
export function voteOptions(state: GameState, voterId: string): string[] {
  return state.vote ? state.vote.candidates.filter(id => id !== voterId) : []
}

export function lastEvent<K extends 'night' | 'day'>(
  state: GameState,
  kind: K
): (K extends 'night' ? NightEvent : DayEvent) | null {
  for (let i = state.log.length - 1; i >= 0; i--) {
    if (state.log[i].kind === kind) return state.log[i] as K extends 'night' ? NightEvent : DayEvent
  }
  return null
}

// ---------- Редʼюсер ----------

function eliminate(players: Player[], id: string | null): Player[] {
  if (!id) return players
  return players.map(p => (p.id === id ? { ...p, alive: false } : p))
}

// Хто робить нічний хід: у local — поточний у черзі, в online — переданий живий гравець
function nightActor(state: GameState, actorId?: string): Player | null {
  if (state.mode !== 'online') return currentActor(state)
  const p = actorId ? state.players.find(pl => pl.id === actorId) : undefined
  return p && p.alive ? p : null
}

function resolveNight(state: GameState): GameState {
  const alive = alivePlayers(state)
  const targetId = mafiaTarget(state)
  const doctor = alive.find(p => p.role === 'doctor')
  const detective = alive.find(p => p.role === 'detective')
  const doctorTargetId = doctor ? state.nightChoices[doctor.id] ?? null : null
  const detectiveTargetId = detective ? state.nightChoices[detective.id] ?? null : null

  const eliminatedId = targetId && targetId !== doctorTargetId ? targetId : null
  const players = eliminate(state.players, eliminatedId)

  const detectiveChecks = detectiveTargetId
    ? [
        ...state.detectiveChecks,
        {
          round: state.round,
          targetId: detectiveTargetId,
          isMafia: getPlayer(state, detectiveTargetId).role === 'mafia'
        }
      ]
    : state.detectiveChecks

  const suspicions = [
    ...state.suspicions,
    ...alive
      .filter(p => p.role === 'civilian' && state.nightChoices[p.id])
      .map(p => ({ round: state.round, byId: p.id, targetId: state.nightChoices[p.id] }))
  ]

  const event: NightEvent = {
    kind: 'night',
    round: state.round,
    mafiaTargetId: targetId,
    doctorTargetId,
    detectiveTargetId,
    eliminatedId
  }

  return {
    ...state,
    players,
    phase: 'morning',
    turn: 0,
    ready: [],
    nightChoices: {},
    lastDoctorTargetId: doctorTargetId,
    doctorSelfUsed: state.doctorSelfUsed || (!!doctor && doctorTargetId === doctor.id),
    detectiveChecks,
    suspicions,
    log: [...state.log, event],
    winner: checkWinner(players)
  }
}

function finishDay(state: GameState, eliminatedId: string | null, skipped: boolean): GameState {
  const { tally, abstain } = tallyVotes(state)
  const players = eliminate(state.players, eliminatedId)
  const event: DayEvent = {
    kind: 'day',
    round: state.round,
    tally,
    abstain,
    runoff: !!state.vote?.runoff,
    skipped,
    eliminatedId
  }
  return {
    ...state,
    players,
    phase: 'voteResult',
    vote: null,
    log: [...state.log, event],
    winner: checkWinner(players)
  }
}

function resolveVote(state: GameState): GameState {
  const vote = state.vote
  if (!vote) return state
  const { tally, abstain } = tallyVotes(state)
  const max = Math.max(0, ...Object.values(tally))
  const leaders = Object.keys(tally).filter(id => tally[id] === max)

  // Ніхто не вибуває, якщо голосів немає або «утримались» не менше, ніж за лідера
  if (max === 0 || max <= abstain) return finishDay(state, null, false)
  if (leaders.length === 1) return finishDay(state, leaders[0], false)
  if (!vote.runoff) {
    return {
      ...state,
      phase: 'runoff',
      vote: { candidates: leaders, voters: vote.voters, votes: {}, turn: 0, runoff: true }
    }
  }
  return finishDay(state, null, false)
}

export function reduce(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'revealNext': {
      if (state.phase !== 'reveal' || state.mode === 'online') return state
      const turn = state.turn + 1
      if (turn >= state.players.length) return { ...state, phase: 'nightIntro', turn: 0 }
      return { ...state, turn }
    }

    case 'ready': {
      if (state.phase !== 'reveal' || state.mode !== 'online') return state
      if (!state.players.some(p => p.id === action.actorId) || state.ready.includes(action.actorId)) return state
      const ready = [...state.ready, action.actorId]
      if (ready.length >= state.players.length) return { ...state, phase: 'nightIntro', ready: [] }
      return { ...state, ready }
    }

    case 'forceAdvance': {
      if (state.mode !== 'online') return state
      if (state.phase === 'reveal') return { ...state, phase: 'nightIntro', ready: [] }
      if (state.phase === 'night') return resolveNight(state)
      return state
    }

    case 'startNight': {
      if (state.phase !== 'nightIntro') return state
      return { ...state, phase: 'night', turn: 0, ready: [], nightChoices: {} }
    }

    case 'nightChoose': {
      if (state.phase !== 'night') return state
      const actor = nightActor(state, action.actorId)
      if (!actor) return state
      // Після «Готово» вибір в online уже не змінити
      if (state.ready.includes(actor.id)) return state
      // Комісар бачить результат одразу, тож змінити перевірку вже не можна
      if (actor.role === 'detective' && state.nightChoices[actor.id]) return state
      const nightChoices = { ...state.nightChoices }
      if (action.targetId === null) {
        if (actor.role === 'detective') return state
        delete nightChoices[actor.id]
      } else {
        if (!nightTargets(state, actor).some(p => p.id === action.targetId)) return state
        nightChoices[actor.id] = action.targetId
      }
      return { ...state, nightChoices }
    }

    case 'nightDone': {
      if (state.phase !== 'night') return state
      const actor = nightActor(state, action.actorId)
      if (!actor) return state
      if (nightChoiceRequired(state, actor) && !state.nightChoices[actor.id]) return state
      if (state.mode === 'online') {
        if (state.ready.includes(actor.id)) return state
        const ready = [...state.ready, actor.id]
        if (ready.length >= nightQueue(state).length) return resolveNight({ ...state, ready })
        return { ...state, ready }
      }
      const turn = state.turn + 1
      if (turn >= nightQueue(state).length) return resolveNight(state)
      return { ...state, turn }
    }

    case 'continue': {
      if (state.phase === 'morning') {
        return state.winner ? { ...state, phase: 'gameOver' } : { ...state, phase: 'discussion' }
      }
      if (state.phase === 'voteResult') {
        if (state.winner) return { ...state, phase: 'gameOver' }
        return { ...state, phase: 'nightIntro', round: state.round + 1, turn: 0 }
      }
      return state
    }

    case 'toVote': {
      if (state.phase !== 'discussion') return state
      const ids = alivePlayers(state).map(p => p.id)
      return {
        ...state,
        phase: 'vote',
        vote: { candidates: ids, voters: ids, votes: {}, turn: 0, runoff: false }
      }
    }

    case 'skipVote': {
      // Перше голосування можна пропустити (для малих компаній)
      if (state.phase !== 'vote' || state.round !== 1 || state.vote?.runoff) return state
      return finishDay({ ...state, vote: state.vote ? { ...state.vote, votes: {} } : null }, null, true)
    }

    case 'castVote': {
      const vote = state.vote
      if (state.phase !== 'vote' || !vote) return state
      if (!vote.voters.includes(action.voterId)) return state
      if (action.targetId !== ABSTAIN && !voteOptions(state, action.voterId).includes(action.targetId)) {
        return state
      }
      return { ...state, vote: { ...vote, votes: { ...vote.votes, [action.voterId]: action.targetId } } }
    }

    case 'secretVoteDone': {
      const vote = state.vote
      if (state.phase !== 'vote' || state.mode === 'online' || !vote || vote.turn >= vote.voters.length) return state
      if (!vote.votes[vote.voters[vote.turn]]) return state
      return { ...state, vote: { ...vote, turn: vote.turn + 1 } }
    }

    case 'finishVote': {
      const vote = state.vote
      if (state.phase !== 'vote' || !vote) return state
      // На одному телефоні таємне голосування завершується, лише коли телефон обійшов усіх.
      // В online ведучий підсумовує сам: хто не проголосував — утримався.
      if (state.mode !== 'online' && state.settings.voteMode === 'secret' && vote.turn < vote.voters.length) {
        return state
      }
      return resolveVote(state)
    }

    case 'runoffDone': {
      if (state.phase !== 'runoff') return state
      return { ...state, phase: 'vote' }
    }
  }
}
