// Серверна частина онлайн-кімнат «Мафії»: збереження в БД, токени пристроїв, дії в кімнаті.
// Стан гри зберігається як JSON; кожна зміна збільшує version (оптимістичне блокування).

import crypto from 'crypto'
import { db } from '../../db'
import { DEFAULT_SETTINGS, MAX_PLAYERS, MIN_PLAYERS, createGame, defaultSetup, validateSetup } from './engine'
import { applyOnlineAction, viewFor, type ClientGameAction, type OnlineState, type PlayerView } from './online'
import type { RoleSetup, Settings } from './types'

export const ROOM_TTL_MS = 24 * 60 * 60 * 1000
const ONLINE_WINDOW_MS = 12_000
const SEEN_THROTTLE_MS = 5_000
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // без схожих символів O/0, I/1/L
const CODE_LENGTH = 5
export const MAX_NAME_LENGTH = 12

export interface LobbySettings {
  settings: Settings
  customSetup: RoleSetup | null
}

type RoomWithPlayers = NonNullable<Awaited<ReturnType<typeof loadRoom>>>

// ---------- Валідація вводу ----------

export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH)
}

export function sanitizeName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const name = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH)
  return name || null
}

// Приймаємо від клієнта лише відомі поля з допустимими значеннями
export function sanitizeLobby(raw: unknown): LobbySettings {
  const input = (raw ?? {}) as { settings?: Partial<Settings>; customSetup?: Partial<RoleSetup> | null }
  const s = input.settings ?? {}
  const settings: Settings = {
    theme: s.theme === 'forest' ? 'forest' : 'city',
    voteMode: s.voteMode === 'secret' ? 'secret' : 'open',
    revealRoleOnElimination: typeof s.revealRoleOnElimination === 'boolean' ? s.revealRoleOnElimination : true,
    discussionSeconds: [60, 120, 180, 240, 300].includes(Number(s.discussionSeconds))
      ? Number(s.discussionSeconds)
      : DEFAULT_SETTINGS.discussionSeconds,
    voice: !!s.voice
  }
  const c = input.customSetup
  const customSetup: RoleSetup | null =
    c && typeof c === 'object'
      ? {
          mafia: Math.min(Math.max(Math.floor(Number(c.mafia) || 1), 1), 5),
          doctor: c.doctor !== false,
          detective: c.detective !== false
        }
      : null
  return { settings, customSetup }
}

// ---------- Токени ----------

export function newToken(): string {
  return crypto.randomBytes(24).toString('base64url')
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function randomCode(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH)
  return Array.from(bytes, b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

// ---------- Робота з БД ----------

export async function loadRoom(code: string) {
  const room = await db.gameRoom.findUnique({
    where: { code: normalizeCode(code) },
    include: { players: { orderBy: { seat: 'asc' } } }
  })
  if (!room || Date.now() - room.updatedAt.getTime() > ROOM_TTL_MS) return null
  return room
}

export function findPlayer(room: RoomWithPlayers, token: string | null) {
  if (!token) return null
  const hash = hashToken(token)
  return room.players.find(p => p.tokenHash === hash) ?? null
}

export async function createRoom(hostName: string, lobby: LobbySettings, userId: string | null) {
  // Прибираємо старі кімнати, щоб таблиця не росла
  await db.gameRoom.deleteMany({ where: { updatedAt: { lt: new Date(Date.now() - ROOM_TTL_MS) } } })

  const token = newToken()
  const playerId = crypto.randomUUID()
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode()
    if (await db.gameRoom.findUnique({ where: { code } })) continue
    await db.gameRoom.create({
      data: {
        code,
        game: 'mafia',
        hostId: playerId,
        lobbyJson: JSON.stringify(lobby),
        createdById: userId,
        players: { create: { id: playerId, name: hostName, tokenHash: hashToken(token), seat: 0 } }
      }
    })
    return { code, token, playerId }
  }
  throw new Error('Не вдалося створити кімнату')
}

export async function joinRoom(code: string, name: string) {
  const room = await loadRoom(code)
  if (!room || room.status === 'closed') return { error: 'Кімнату не знайдено або гру вже завершено', status: 404 }
  if (room.status !== 'lobby') return { error: 'Гра вже почалася. Попросіть ведучого почати нову партію', status: 409 }
  if (room.players.length >= MAX_PLAYERS) return { error: `У кімнаті вже ${MAX_PLAYERS} гравців`, status: 409 }
  if (room.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    return { error: 'Гравець з таким ім’ям уже є. Оберіть інше', status: 409 }
  }
  const token = newToken()
  const playerId = crypto.randomUUID()
  const seat = Math.max(-1, ...room.players.map(p => p.seat)) + 1
  await db.$transaction([
    db.gameRoomPlayer.create({ data: { id: playerId, roomId: room.id, name, tokenHash: hashToken(token), seat } }),
    db.gameRoom.update({ where: { id: room.id }, data: { version: { increment: 1 } } })
  ])
  return { token, playerId }
}

// Позначаємо, що гравець на зв'язку (не частіше ніж раз на кілька секунд)
export async function touchPlayer(player: { id: string; lastSeenAt: Date }) {
  if (Date.now() - player.lastSeenAt.getTime() < SEEN_THROTTLE_MS) return
  await db.gameRoomPlayer.update({ where: { id: player.id }, data: { lastSeenAt: new Date() } })
}

// ---------- Відповідь клієнту ----------

export interface RoomResponse {
  member: true
  code: string
  status: string
  version: number
  serverNow: number
  meId: string
  hostId: string
  isHost: boolean
  players: { id: string; name: string; online: boolean }[]
  lobby: LobbySettings
  view: PlayerView | null
}

export function roomResponse(room: RoomWithPlayers, meId: string): RoomResponse {
  const now = Date.now()
  const state = room.stateJson ? (JSON.parse(room.stateJson) as OnlineState) : null
  return {
    member: true,
    code: room.code,
    status: room.status,
    version: room.version,
    serverNow: now,
    meId,
    hostId: room.hostId,
    isHost: room.hostId === meId,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      online: p.id === meId || now - p.lastSeenAt.getTime() < ONLINE_WINDOW_MS
    })),
    lobby: JSON.parse(room.lobbyJson) as LobbySettings,
    view: state && room.status === 'playing' ? viewFor(state, meId) : null
  }
}

// ---------- Дії в кімнаті ----------

export type RoomAction =
  | { type: 'updateLobby'; lobby: unknown }
  | { type: 'kick'; playerId: string }
  | { type: 'leave' }
  | { type: 'start' }
  | { type: 'rematch' }
  | { type: 'close' }
  | { type: 'game'; action: ClientGameAction }

interface Change {
  status?: string
  lobbyJson?: string
  stateJson?: string | null
  deletePlayerId?: string
}

function decide(room: RoomWithPlayers, meId: string, action: RoomAction): Change | string {
  const isHost = room.hostId === meId
  if (room.status === 'closed') return 'Гру завершено'

  switch (action.type) {
    case 'updateLobby': {
      if (!isHost) return 'Налаштування змінює лише ведучий'
      if (room.status !== 'lobby') return 'Гра вже йде'
      return { lobbyJson: JSON.stringify(sanitizeLobby(action.lobby)) }
    }
    case 'kick': {
      if (!isHost) return 'Видаляти гравців може лише ведучий'
      if (room.status !== 'lobby') return 'Під час гри гравців не видаляють'
      if (action.playerId === meId || !room.players.some(p => p.id === action.playerId)) return 'Гравця не знайдено'
      return { deletePlayerId: action.playerId }
    }
    case 'leave': {
      if (room.status !== 'lobby') return 'Під час гри вийти не можна'
      // Ведучий виходить — кімната закривається
      if (isHost) return { status: 'closed' }
      return { deletePlayerId: meId }
    }
    case 'start': {
      if (!isHost) return 'Почати гру може лише ведучий'
      if (room.status !== 'lobby') return 'Гра вже йде'
      const n = room.players.length
      if (n < MIN_PLAYERS) return `Потрібно щонайменше ${MIN_PLAYERS} гравців`
      const lobby = JSON.parse(room.lobbyJson) as LobbySettings
      const setup = lobby.customSetup && !validateSetup(n, lobby.customSetup) ? lobby.customSetup : defaultSetup(n)
      const error = validateSetup(n, setup)
      if (error) return error
      const game = createGame(
        room.players.map(p => p.name),
        lobby.settings,
        setup,
        { ids: room.players.map(p => p.id), mode: 'online' }
      )
      const state: OnlineState = { game, meta: { discussionEndsAt: null } }
      return { status: 'playing', stateJson: JSON.stringify(state) }
    }
    case 'rematch': {
      if (!isHost) return 'Нову партію починає ведучий'
      if (room.status !== 'playing') return 'Гра ще не почалася'
      return { status: 'lobby', stateJson: null }
    }
    case 'close': {
      if (!isHost) return 'Завершити гру може лише ведучий'
      return { status: 'closed' }
    }
    case 'game': {
      if (room.status !== 'playing' || !room.stateJson) return 'Гра ще не почалася'
      const state = JSON.parse(room.stateJson) as OnlineState
      const next = applyOnlineAction(state, meId, isHost, action.action, Date.now())
      if (typeof next === 'string') return next
      return { stateJson: JSON.stringify(next) }
    }
    default:
      return 'Невідома дія'
  }
}

// Застосовує дію з повторною спробою, якщо хтось інший змінив кімнату одночасно
export async function applyRoomAction(code: string, token: string | null, action: RoomAction) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const room = await loadRoom(code)
    if (!room) return { error: 'Кімнату не знайдено', status: 404 }
    const me = findPlayer(room, token)
    if (!me) return { error: 'Ви не в цій кімнаті', status: 403 }

    const change = decide(room, me.id, action)
    if (typeof change === 'string') return { error: change, status: 409 }

    const { deletePlayerId, ...data } = change
    const updated = await db.gameRoom.updateMany({
      where: { id: room.id, version: room.version },
      data: { ...data, version: room.version + 1 }
    })
    if (updated.count === 1) {
      if (deletePlayerId) await db.gameRoomPlayer.delete({ where: { id: deletePlayerId } }).catch(() => null)
      const fresh = await loadRoom(code)
      if (!fresh) return { error: 'Кімнату не знайдено', status: 404 }
      if (!fresh.players.some(p => p.id === me.id)) return { left: true as const }
      return { room: roomResponse(fresh, me.id) }
    }
  }
  return { error: 'Сервер зайнятий, спробуйте ще раз', status: 503 }
}
