import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, createGame, defaultSetup } from './engine'
import { applyOnlineAction, viewFor, type ClientGameAction, type OnlineState } from './online'
import type { RoleId } from './types'

const IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
const NAMES = ['Оля', 'Петро', 'Іра', 'Марко', 'Соня', 'Тарас', 'Ліна']

function online(roles: RoleId[], voteMode: 'open' | 'secret' = 'open'): OnlineState {
  const n = roles.length
  const game = createGame(NAMES.slice(0, n), { ...DEFAULT_SETTINGS, voteMode }, defaultSetup(n), {
    ids: IDS.slice(0, n),
    mode: 'online'
  })
  return { game: { ...game, players: game.players.map((p, i) => ({ ...p, role: roles[i] })) }, meta: { discussionEndsAt: null } }
}

const HOST = 'a'
function act(s: OnlineState, playerId: string, action: ClientGameAction, now = 1000): OnlineState {
  const next = applyOnlineAction(s, playerId, playerId === HOST, action, now)
  if (typeof next === 'string') throw new Error(`${playerId} ${action.type}: ${next}`)
  return next
}
function tryAct(s: OnlineState, playerId: string, action: ClientGameAction) {
  return applyOnlineAction(s, playerId, playerId === HOST, action, 1000)
}

// a мирний (ведучий), b мафія, c лікар, d комісар, e мирний
const FIVE: RoleId[] = ['civilian', 'mafia', 'doctor', 'detective', 'civilian']

function toNight(s: OnlineState): OnlineState {
  for (const id of s.game.players.map(p => p.id)) s = act(s, id, { type: 'ready' })
  return act(s, HOST, { type: 'startNight' })
}

describe('online: роздача і ніч', () => {
  it('роздача завершується, коли всі натиснули «Готово»', () => {
    let s = online(FIVE)
    for (const id of ['a', 'b', 'c', 'd']) s = act(s, id, { type: 'ready' })
    expect(s.game.phase).toBe('reveal')
    expect(viewFor(s, 'a')!.readyCount).toBe(4)
    s = act(s, 'e', { type: 'ready' })
    expect(s.game.phase).toBe('nightIntro')
  })

  it('ведучий може не чекати тих, хто не відповідає', () => {
    let s = act(online(FIVE), 'b', { type: 'ready' })
    expect(tryAct(s, 'b', { type: 'forceAdvance' })).toBeTypeOf('string')
    s = act(s, HOST, { type: 'forceAdvance' })
    expect(s.game.phase).toBe('nightIntro')
  })

  it('усі ходять одночасно, ніч розв’язується після останнього', () => {
    let s = toNight(online(FIVE))
    s = act(s, 'e', { type: 'nightDone' })
    s = act(s, 'b', { type: 'nightChoose', targetId: 'e' })
    s = act(s, 'b', { type: 'nightDone' })
    s = act(s, 'd', { type: 'nightChoose', targetId: 'b' })
    s = act(s, 'd', { type: 'nightDone' })
    s = act(s, 'a', { type: 'nightDone' })
    expect(s.game.phase).toBe('night')
    s = act(s, 'c', { type: 'nightChoose', targetId: 'a' })
    s = act(s, 'c', { type: 'nightDone' })
    expect(s.game.phase).toBe('morning')
    expect(s.game.players.find(p => p.id === 'e')!.alive).toBe(false)
  })

  it('після «Готово» вибір не змінити; ролі з дією не можуть завершити без вибору', () => {
    let s = toNight(online(FIVE))
    expect(tryAct(s, 'b', { type: 'nightDone' })).toBeTypeOf('string')
    s = act(s, 'b', { type: 'nightChoose', targetId: 'e' })
    s = act(s, 'b', { type: 'nightDone' })
    expect(tryAct(s, 'b', { type: 'nightChoose', targetId: 'a' })).toBeTypeOf('string')
  })

  it('гравець не може діяти за іншого чи виконувати дії ведучого', () => {
    const s = toNight(online(FIVE))
    expect(tryAct(s, 'b', { type: 'startNight' })).toBe('Цю дію виконує лише ведучий')
    // навіть якщо клієнт надішле actorId, сервер підставляє свій
    const next = act(s, 'e', { type: 'nightChoose', targetId: 'b', actorId: 'b' } as ClientGameAction)
    expect(next.game.nightChoices).toEqual({ e: 'b' })
  })

  it('вибулий гравець не ходить уночі', () => {
    let s = toNight(online(FIVE))
    for (const [id, t] of [['b', 'e'], ['c', 'a'], ['d', 'b']] as const) {
      s = act(s, id, { type: 'nightChoose', targetId: t })
    }
    for (const id of ['a', 'b', 'c', 'd', 'e']) s = act(s, id, { type: 'nightDone' })
    s = act(s, HOST, { type: 'continue' })
    s = act(s, HOST, { type: 'toVote' })
    s = act(s, HOST, { type: 'skipVote' })
    s = act(s, HOST, { type: 'continue' })
    s = act(s, HOST, { type: 'startNight' })
    expect(tryAct(s, 'e', { type: 'nightDone' })).toBeTypeOf('string')
    expect(viewFor(s, 'e')!.night).toBeNull()
    expect(viewFor(s, 'a')!.readyTotal).toBe(4)
  })
})

describe('online: що бачить гравець', () => {
  it('мирний не бачить чужих ролей, мафія бачить партнерів', () => {
    const s = online(['civilian', 'mafia', 'doctor', 'detective', 'civilian', 'civilian', 'mafia'])
    const civ = viewFor(s, 'a')!
    expect(civ.myRole).toBe('civilian')
    expect(civ.players.filter(p => p.role !== null).map(p => p.id)).toEqual(['a'])
    expect(civ.final).toBeNull()
    const maf = viewFor(s, 'b')!
    expect(maf.players.filter(p => p.role === 'mafia').map(p => p.id)).toEqual(['b', 'g'])
    expect(JSON.stringify(civ)).not.toContain('"mafia"')
  })

  it('уночі мафія бачить вибір партнера, інші — ні', () => {
    let s = toNight(online(['civilian', 'mafia', 'doctor', 'detective', 'civilian', 'civilian', 'mafia']))
    s = act(s, 'b', { type: 'nightChoose', targetId: 'e' })
    expect(viewFor(s, 'g')!.night!.partnerChoices).toEqual({ b: 'e' })
    expect(viewFor(s, 'a')!.night!.partnerChoices).toEqual({})
    expect(JSON.stringify(viewFor(s, 'c'))).not.toContain('"e"}')
  })

  it('комісар бачить результат лише своєї перевірки', () => {
    let s = toNight(online(FIVE))
    s = act(s, 'd', { type: 'nightChoose', targetId: 'b' })
    expect(viewFor(s, 'd')!.night!.checkResult).toBe(true)
    expect(viewFor(s, 'a')!.night!.checkResult).toBeNull()
    expect(viewFor(s, 'a')!.detectiveChecks).toEqual([])
  })

  it('таємне голосування приховує голоси, відкрите — показує', () => {
    const run = (mode: 'open' | 'secret') => {
      let s = toNight(online(FIVE, mode))
      s = act(s, 'b', { type: 'nightChoose', targetId: 'e' })
      s = act(s, 'c', { type: 'nightChoose', targetId: 'e' })
      s = act(s, 'd', { type: 'nightChoose', targetId: 'a' })
      for (const id of ['a', 'b', 'c', 'd', 'e']) s = act(s, id, { type: 'nightDone' })
      s = act(s, HOST, { type: 'continue' })
      s = act(s, HOST, { type: 'toVote' })
      s = act(s, 'c', { type: 'castVote', targetId: 'b' })
      return s
    }
    const secret = viewFor(run('secret'), 'a')!.vote!
    expect(secret.votes).toBeNull()
    expect(secret.votedIds).toEqual(['c'])
    expect(viewFor(run('open'), 'a')!.vote!.votes).toEqual({ c: 'b' })
  })

  it('ведучий підсумовує голосування, навіть якщо хтось не проголосував', () => {
    let s = toNight(online(FIVE, 'secret'))
    s = act(s, 'b', { type: 'nightChoose', targetId: 'e' })
    s = act(s, 'c', { type: 'nightChoose', targetId: 'e' })
    s = act(s, 'd', { type: 'nightChoose', targetId: 'a' })
    for (const id of ['a', 'b', 'c', 'd', 'e']) s = act(s, id, { type: 'nightDone' })
    s = act(s, HOST, { type: 'continue' })
    s = act(s, HOST, { type: 'toVote' })
    for (const id of ['a', 'c', 'd']) s = act(s, id, { type: 'castVote', targetId: 'b' })
    s = act(s, HOST, { type: 'finishVote' })
    expect(s.game.winner).toBe('town')
    s = act(s, HOST, { type: 'continue' })
    const view = viewFor(s, 'e')!
    expect(view.final).not.toBeNull()
    expect(view.players.every(p => p.role !== null)).toBe(true)
  })

  it('обговорення має спільний таймер, ведучий може додати 30 с', () => {
    let s = toNight(online(FIVE))
    s = act(s, 'b', { type: 'nightChoose', targetId: 'e' })
    s = act(s, 'c', { type: 'nightChoose', targetId: 'e' })
    s = act(s, 'd', { type: 'nightChoose', targetId: 'a' })
    for (const id of ['a', 'b', 'c', 'd', 'e']) s = act(s, id, { type: 'nightDone' })
    s = act(s, HOST, { type: 'continue' }, 10_000)
    expect(viewFor(s, 'b')!.discussionEndsAt).toBe(10_000 + DEFAULT_SETTINGS.discussionSeconds * 1000)
    s = act(s, HOST, { type: 'extendDiscussion' }, 20_000)
    expect(s.meta.discussionEndsAt).toBe(10_000 + (DEFAULT_SETTINGS.discussionSeconds + 30) * 1000)
    expect(tryAct(s, 'b', { type: 'extendDiscussion' })).toBeTypeOf('string')
    s = act(s, HOST, { type: 'toVote' })
    expect(s.meta.discussionEndsAt).toBeNull()
  })
})
