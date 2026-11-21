// Типи гри «Мафія» (класичний варіант «Місто засинає»).
// Ядро гри — чистий редʼюсер (engine.ts), UI лише показує стан і надсилає дії.

export type RoleId = 'mafia' | 'doctor' | 'detective' | 'civilian'
export type Team = 'town' | 'mafia'
export type ThemeId = 'city' | 'forest'
export type VoteMode = 'open' | 'secret'
// local — один телефон по колу; online — кожен зі свого пристрою
export type GameMode = 'local' | 'online'

export interface RoleSetup {
  mafia: number
  doctor: boolean
  detective: boolean
}

export interface Settings {
  theme: ThemeId
  voteMode: VoteMode
  revealRoleOnElimination: boolean
  discussionSeconds: number
  voice: boolean
}

export interface Player {
  id: string
  name: string
  role: RoleId
  alive: boolean
}

export type Phase =
  | 'reveal' // роздача ролей по колу
  | 'nightIntro' // «Місто засинає»
  | 'night' // нічне коло
  | 'morning' // результат ночі
  | 'discussion' // обговорення
  | 'vote' // голосування
  | 'runoff' // виправдання при нічиїй
  | 'voteResult' // результат голосування
  | 'gameOver'

export interface DetectiveCheck {
  round: number
  targetId: string
  isMafia: boolean
}

export interface Suspicion {
  round: number
  byId: string
  targetId: string
}

export interface NightEvent {
  kind: 'night'
  round: number
  mafiaTargetId: string | null
  doctorTargetId: string | null
  detectiveTargetId: string | null
  eliminatedId: string | null
}

export interface DayEvent {
  kind: 'day'
  round: number
  tally: Record<string, number>
  abstain: number
  runoff: boolean
  skipped: boolean
  eliminatedId: string | null
}

export type GameEvent = NightEvent | DayEvent

export interface VoteState {
  candidates: string[] // за кого можна голосувати
  voters: string[] // хто голосує (живі гравці в порядку місць)
  votes: Record<string, string> // voterId → targetId | ABSTAIN
  turn: number // для таємного голосування: чий хід
  runoff: boolean
}

export interface GameState {
  version: 1
  mode: GameMode
  settings: Settings
  players: Player[] // у порядку місць за столом
  round: number // номер ночі/дня, починається з 1
  phase: Phase
  turn: number // індекс у черзі поточного кола (роздача / ніч), лише для local
  ready: string[] // online: хто вже завершив поточний крок (роздача / ніч)
  nightChoices: Record<string, string> // playerId → targetId
  lastDoctorTargetId: string | null
  doctorSelfUsed: boolean
  detectiveChecks: DetectiveCheck[]
  suspicions: Suspicion[]
  vote: VoteState | null
  log: GameEvent[]
  winner: Team | null
}

export const ABSTAIN = '__abstain__'

export type GameAction =
  | { type: 'revealNext' } // local: наступний гравець дивиться роль
  | { type: 'ready'; actorId: string } // online: гравець подивився роль
  | { type: 'startNight' }
  | { type: 'nightChoose'; targetId: string | null; actorId?: string } // actorId — лише online
  | { type: 'nightDone'; actorId?: string }
  | { type: 'forceAdvance' } // online: ведучий не чекає тих, хто не відповідає
  | { type: 'toVote' }
  | { type: 'skipVote' }
  | { type: 'castVote'; voterId: string; targetId: string }
  | { type: 'secretVoteDone' }
  | { type: 'finishVote' }
  | { type: 'runoffDone' }
  | { type: 'continue' } // після ранку/результату голосування
