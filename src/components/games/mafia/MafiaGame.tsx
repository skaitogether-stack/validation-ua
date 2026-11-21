'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DEFAULT_SETTINGS, MIN_PLAYERS, createGame, lastEvent, getPlayer, reduce } from '../../../lib/games/mafia/engine'
import { THEMES } from '../../../lib/games/mafia/themes'
import type { GameAction, GameState } from '../../../lib/games/mafia/types'
import { Lobby, effectiveSetup, type LobbyConfig } from './Lobby'
import {
  DiscussionScreen,
  GameOverScreen,
  MorningScreen,
  NightIntroScreen,
  NightScreen,
  RevealScreen,
  RunoffScreen,
  VoteResultScreen,
  VoteScreen
} from './screens'
import { speak } from './ui'
import { CreateRoom } from './online/CreateRoom'

// Гра «Мафія» на одному телефоні: стан живе лише в браузері (localStorage),
// тож випадкове оновлення сторінки не перериває партію.

const STORAGE_KEY = 'validation.games.mafia.v1'

interface Saved {
  lobby: LobbyConfig
  game: GameState | null
}

function defaultLobby(): LobbyConfig {
  return {
    names: Array.from({ length: MIN_PLAYERS }, (_, i) => `Гравець ${i + 1}`),
    settings: DEFAULT_SETTINGS,
    customSetup: null
  }
}

function load(): Saved {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Saved
      if (saved?.lobby?.names?.length) {
        return {
          lobby: { ...saved.lobby, settings: { ...DEFAULT_SETTINGS, ...saved.lobby.settings } },
          // збереження з попередньої версії гри не мали mode/ready
          game: saved.game?.version === 1 ? { ...saved.game, mode: 'local', ready: saved.game.ready ?? [] } : null
        }
      }
    }
  } catch {
    // пошкоджені або недоступні дані — починаємо з чистого лобі
  }
  return { lobby: defaultLobby(), game: null }
}

function save(data: Saved) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // приватний режим або переповнене сховище — гра працює й без збереження
  }
}

// Текст, який ведучий озвучує на ключових фазах
function announcement(state: GameState): string | null {
  const theme = THEMES[state.settings.theme]
  switch (state.phase) {
    case 'nightIntro':
      return theme.sleep
    case 'morning': {
      const e = lastEvent(state, 'night')
      const out = e?.eliminatedId ? getPlayer(state, e.eliminatedId).name : null
      return `${theme.wake}. ${out ? theme.nightEliminated(out) : theme.nightNobody}`
    }
    case 'voteResult': {
      const e = lastEvent(state, 'day')
      const out = e?.eliminatedId ? getPlayer(state, e.eliminatedId).name : null
      return out ? theme.dayEliminated(out) : theme.dayNobody
    }
    case 'gameOver':
      return state.winner ? theme.win[state.winner] : null
    default:
      return null
  }
}

export function MafiaGame({ backHref }: { backHref: string }) {
  const [data, setData] = useState<Saved>(load)
  const [mode, setMode] = useState<'local' | 'online'>('local')
  const { lobby, game } = data

  useEffect(() => save(data), [data])

  const phaseKey = game ? `${game.phase}-${game.round}` : 'lobby'
  useEffect(() => {
    if (!game?.settings.voice) return
    const text = announcement(game)
    if (text) speak(text)
    // озвучуємо лише при зміні фази
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseKey])

  // Нова фаза — з початку сторінки, щоб не лишатися посеред попереднього екрана
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [phaseKey, game?.turn, game?.vote?.turn])

  const dispatch = (action: GameAction) =>
    setData(d => (d.game ? { ...d, game: reduce(d.game, action) } : d))

  const start = (config: LobbyConfig = lobby) => {
    const names = config.names.map(n => n.trim())
    setData({ lobby: { ...config, names }, game: createGame(names, config.settings, effectiveSetup(config)) })
  }

  const exit = () => {
    if (window.confirm('Завершити поточну гру? Прогрес буде втрачено.')) setData(d => ({ ...d, game: null }))
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-3 px-4 py-4">
      <div className="flex items-center justify-between">
        {game ? (
          <button type="button" onClick={exit} className="rounded-xl px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-white">
            ✕ Вийти з гри
          </button>
        ) : (
          <Link href={backHref} className="rounded-xl px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-white">
            ← До ігор
          </Link>
        )}
        {game && game.phase !== 'gameOver' && (
          <span className="text-sm font-semibold text-gray-500">
            {THEMES[game.settings.theme].icon} Раунд {game.round}
          </span>
        )}
      </div>

      {!game && (
        <>
          <div className="flex rounded-2xl bg-white p-1 shadow-sm">
            {(
              [
                ['local', '📱 Один телефон'],
                ['online', '🌐 Кожен зі свого']
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={`min-h-11 flex-1 rounded-xl px-3 text-sm font-bold transition-colors ${
                  mode === id ? 'bg-indigo-600 text-white' : 'text-gray-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === 'local' ? (
            <Lobby config={lobby} onChange={c => setData(d => ({ ...d, lobby: c }))} onStart={() => start()} />
          ) : (
            <CreateRoom settings={lobby.settings} />
          )}
        </>
      )}
      {game && <PhaseView game={game} dispatch={dispatch} onReplay={() => start()} onNewPlayers={() => setData(d => ({ ...d, game: null }))} />}
    </main>
  )
}

function PhaseView({
  game,
  dispatch,
  onReplay,
  onNewPlayers
}: {
  game: GameState
  dispatch: (a: GameAction) => void
  onReplay: () => void
  onNewPlayers: () => void
}) {
  const props = { state: game, dispatch }
  switch (game.phase) {
    case 'reveal':
      return <RevealScreen {...props} />
    case 'nightIntro':
      return <NightIntroScreen {...props} />
    case 'night':
      return <NightScreen {...props} />
    case 'morning':
      return <MorningScreen {...props} />
    case 'discussion':
      return <DiscussionScreen {...props} />
    case 'vote':
      return <VoteScreen {...props} />
    case 'runoff':
      return <RunoffScreen {...props} />
    case 'voteResult':
      return <VoteResultScreen {...props} />
    case 'gameOver':
      return <GameOverScreen state={game} onReplay={onReplay} onNewPlayers={onNewPlayers} />
  }
}
