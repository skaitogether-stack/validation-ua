'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RoomAction, RoomResponse } from '../../../../lib/games/mafia/rooms'

// Синхронізація кімнати: опитуємо сервер кожні ~1,5 с, дії надсилаємо POST-запитом.
// Токен пристрою зберігається в localStorage окремо для кожної кімнати.

const POLL_MS = 1500
const POLL_HIDDEN_MS = 5000

const tokenKey = (code: string) => `validation.games.mafia.room.${code}`

export function getRoomToken(code: string): string | null {
  try {
    return window.localStorage.getItem(tokenKey(code))
  } catch {
    return null
  }
}

export function setRoomToken(code: string, token: string) {
  try {
    window.localStorage.setItem(tokenKey(code), token)
  } catch {
    // без localStorage гравець не зможе повернутися після оновлення сторінки, але гра працює
  }
}

function clearRoomToken(code: string) {
  try {
    window.localStorage.removeItem(tokenKey(code))
  } catch {}
}

export interface GuestInfo {
  status: string
  playerCount: number
  hostName: string | null
}

export type RoomState =
  | { kind: 'loading' }
  | { kind: 'notFound' }
  | { kind: 'guest'; info: GuestInfo; removed: boolean }
  | { kind: 'member'; room: RoomResponse }

export function useRoom(code: string) {
  const [state, setState] = useState<RoomState>({ kind: 'loading' })
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [busy, setBusy] = useState(false)
  const [clockOffset, setClockOffset] = useState(0) // serverNow − Date.now()
  const versionRef = useRef(-1)
  const wasMemberRef = useRef(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const accept = useCallback(
    (data: RoomResponse | ({ member: false } & GuestInfo)) => {
      if (data.member) {
        // Відповідь, старша за вже показану, ігноруємо (опитування й дія могли розминутися)
        if (data.version < versionRef.current) return
        versionRef.current = data.version
        wasMemberRef.current = true
        setClockOffset(data.serverNow - Date.now())
        setState({ kind: 'member', room: data })
      } else {
        // Токен більше не дійсний — гравця видалили з кімнати
        const removed = wasMemberRef.current
        if (removed) clearRoomToken(code)
        wasMemberRef.current = false
        versionRef.current = -1
        setState({ kind: 'guest', info: data, removed })
      }
    },
    [code]
  )

  useEffect(() => {
    let stopped = false
    let timer: number | undefined
    const poll = async () => {
      try {
        const token = getRoomToken(code)
        const res = await fetch(`/api/games/mafia/rooms/${code}`, {
          headers: token ? { 'x-player-token': token } : {},
          cache: 'no-store'
        })
        if (stopped) return
        if (res.status === 404) setState({ kind: 'notFound' })
        else if (res.ok) accept(await res.json())
        setOffline(!res.ok && res.status !== 404)
      } catch {
        if (!stopped) setOffline(true)
      }
      if (!stopped) timer = window.setTimeout(poll, document.hidden ? POLL_HIDDEN_MS : POLL_MS)
    }
    poll()
    return () => {
      stopped = true
      window.clearTimeout(timer)
    }
  }, [code, accept, refreshKey])

  const showError = (message: string) => {
    setError(message)
    window.setTimeout(() => setError(e => (e === message ? null : e)), 4000)
  }

  const act = useCallback(
    async (action: RoomAction): Promise<boolean> => {
      setBusy(true)
      try {
        const res = await fetch(`/api/games/mafia/rooms/${code}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-player-token': getRoomToken(code) ?? '' },
          body: JSON.stringify({ action })
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          showError(data.error ?? 'Не вдалося виконати дію')
          return false
        }
        if (data.left) {
          clearRoomToken(code)
          wasMemberRef.current = false
          setRefreshKey(k => k + 1)
        } else accept(data)
        return true
      } catch {
        showError('Немає зв’язку з сервером')
        return false
      } finally {
        setBusy(false)
      }
    },
    [code, accept]
  )

  const join = useCallback(
    async (name: string): Promise<boolean> => {
      setBusy(true)
      try {
        const res = await fetch(`/api/games/mafia/rooms/${code}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          showError(data.error ?? 'Не вдалося приєднатися')
          return false
        }
        setRoomToken(code, data.token)
        setRefreshKey(k => k + 1)
        return true
      } catch {
        showError('Немає зв’язку з сервером')
        return false
      } finally {
        setBusy(false)
      }
    },
    [code]
  )

  return { state, error, offline, busy, clockOffset, act, join }
}

// Поточний час, що оновлюється кілька разів на секунду (для спільних таймерів)
export function useNow(intervalMs = 250) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}
