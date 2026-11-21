import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  checkWinner,
  createGame,
  currentActor,
  defaultSetup,
  nightTargets,
  reduce,
  validateSetup
} from './engine'
import { ABSTAIN, type GameAction, type GameState, type RoleId, type Settings } from './types'

const NAMES = ['Оля', 'Петро', 'Іра', 'Марко', 'Соня', 'Тарас', 'Ліна', 'Денис']

// Гра з наперед заданими ролями (за місцями)
function gameWith(roles: RoleId[], settings: Partial<Settings> = {}): GameState {
  const base = createGame(NAMES.slice(0, roles.length), { ...DEFAULT_SETTINGS, ...settings }, defaultSetup(roles.length))
  return { ...base, players: base.players.map((p, i) => ({ ...p, role: roles[i] })) }
}

function run(state: GameState, actions: GameAction[]): GameState {
  return actions.reduce(reduce, state)
}

function toNight(state: GameState): GameState {
  let s = state
  while (s.phase === 'reveal') s = reduce(s, { type: 'revealNext' })
  return reduce(s, { type: 'startNight' })
}

// Проходить нічне коло: choices — playerId → targetId
function playNight(state: GameState, choices: Record<string, string>): GameState {
  let s = state
  while (s.phase === 'night') {
    const actor = currentActor(s)!
    if (choices[actor.id]) s = reduce(s, { type: 'nightChoose', targetId: choices[actor.id] })
    const next = reduce(s, { type: 'nightDone' })
    if (next === s) throw new Error(`Хід ${actor.id} (${actor.role}) не завершився`)
    s = next
  }
  return s
}

// 5 гравців: p1 мафія, p2 лікар, p3 комісар, p4 і p5 мирні
const FIVE: RoleId[] = ['mafia', 'doctor', 'detective', 'civilian', 'civilian']

describe('склад ролей', () => {
  it('за замовчуванням відповідає таблиці з ТЗ', () => {
    expect(defaultSetup(5).mafia).toBe(1)
    expect(defaultSetup(6).mafia).toBe(1)
    expect(defaultSetup(7).mafia).toBe(2)
    expect(defaultSetup(9).mafia).toBe(2)
    expect(defaultSetup(10).mafia).toBe(3)
    expect(defaultSetup(12).mafia).toBe(3)
  })

  it('валідація забороняє мафію ≥ половини та неправильну кількість гравців', () => {
    for (let n = 5; n <= 12; n++) expect(validateSetup(n, defaultSetup(n))).toBeNull()
    expect(validateSetup(4, defaultSetup(5))).not.toBeNull()
    expect(validateSetup(6, { mafia: 3, doctor: true, detective: true })).not.toBeNull()
    expect(validateSetup(5, { mafia: 0, doctor: true, detective: true })).not.toBeNull()
  })

  it('createGame роздає рівно стільки ролей, скільки задано', () => {
    const g = createGame(NAMES, DEFAULT_SETTINGS, defaultSetup(8))
    const count = (r: RoleId) => g.players.filter(p => p.role === r).length
    expect(count('mafia')).toBe(2)
    expect(count('doctor')).toBe(1)
    expect(count('detective')).toBe(1)
    expect(count('civilian')).toBe(4)
  })
})

describe('роздача ролей', () => {
  it('проходить усіх гравців і переходить до ночі', () => {
    let s = gameWith(FIVE)
    for (let i = 0; i < 5; i++) {
      expect(currentActor(s)!.id).toBe(`p${i + 1}`)
      s = reduce(s, { type: 'revealNext' })
    }
    expect(s.phase).toBe('nightIntro')
  })
})

describe('ніч', () => {
  it('нічне коло включає всіх живих гравців у порядку місць', () => {
    let s = toNight(gameWith(FIVE))
    const order: string[] = []
    while (s.phase === 'night') {
      const actor = currentActor(s)!
      order.push(actor.id)
      const target = nightTargets(s, actor)[0]
      if (actor.role !== 'civilian') s = reduce(s, { type: 'nightChoose', targetId: target.id })
      s = reduce(s, { type: 'nightDone' })
    }
    expect(order).toEqual(['p1', 'p2', 'p3', 'p4', 'p5'])
  })

  it('ролі з дією не можуть завершити хід без вибору, мирні можуть', () => {
    let s = toNight(gameWith(FIVE))
    s = reduce(s, { type: 'nightDone' }) // мафія без вибору
    expect(s.turn).toBe(0)
    s = run(s, [{ type: 'nightChoose', targetId: 'p4' }, { type: 'nightDone' }])
    expect(s.turn).toBe(1)
  })

  it('ціль мафії вибуває, якщо лікар її не врятував', () => {
    const s = playNight(toNight(gameWith(FIVE)), { p1: 'p4', p2: 'p5', p3: 'p1' })
    expect(s.phase).toBe('morning')
    expect(s.players.find(p => p.id === 'p4')!.alive).toBe(false)
    expect(s.log.at(-1)).toMatchObject({ kind: 'night', mafiaTargetId: 'p4', eliminatedId: 'p4' })
  })

  it('лікар рятує ціль мафії', () => {
    const s = playNight(toNight(gameWith(FIVE)), { p1: 'p4', p2: 'p4', p3: 'p5' })
    expect(s.players.every(p => p.alive)).toBe(true)
    expect(s.log.at(-1)).toMatchObject({ eliminatedId: null, doctorTargetId: 'p4' })
  })

  it('комісар отримує результат перевірки й не може її змінити', () => {
    let s = toNight(gameWith(FIVE))
    s = run(s, [{ type: 'nightChoose', targetId: 'p4' }, { type: 'nightDone' }])
    s = run(s, [{ type: 'nightChoose', targetId: 'p5' }, { type: 'nightDone' }])
    s = reduce(s, { type: 'nightChoose', targetId: 'p1' })
    s = reduce(s, { type: 'nightChoose', targetId: 'p4' }) // зміна ігнорується
    expect(s.nightChoices.p3).toBe('p1')
    s = playNight(s, {})
    expect(s.detectiveChecks).toEqual([{ round: 1, targetId: 'p1', isMafia: true }])
  })

  it('мафія не може обрати мафію, комісар — себе', () => {
    const s = toNight(gameWith(['mafia', 'mafia', 'doctor', 'detective', 'civilian', 'civilian', 'civilian']))
    const mafia = s.players[0]
    expect(nightTargets(s, mafia).map(p => p.role)).not.toContain('mafia')
    expect(nightTargets(s, s.players[3]).map(p => p.id)).not.toContain('p4')
  })

  it('при різних цілях мафії діє вибір першого мафіозі за місцями', () => {
    const roles: RoleId[] = ['civilian', 'mafia', 'doctor', 'mafia', 'detective', 'civilian', 'civilian']
    const s = playNight(toNight(gameWith(roles)), { p2: 'p6', p4: 'p7', p3: 'p1', p5: 'p1' })
    expect(s.log.at(-1)).toMatchObject({ mafiaTargetId: 'p6', eliminatedId: 'p6' })
  })

  it('лікар не лікує того самого двічі поспіль і себе лише раз за гру', () => {
    const roles: RoleId[] = ['mafia', 'doctor', 'detective', 'civilian', 'civilian', 'civilian']
    let s = playNight(toNight(gameWith(roles)), { p1: 'p4', p2: 'p2', p3: 'p4' })
    expect(s.doctorSelfUsed).toBe(true)
    // День без вибування → наступна ніч
    s = run(s, [{ type: 'continue' }, { type: 'toVote' }, { type: 'skipVote' }, { type: 'continue' }, { type: 'startNight' }])
    const doctor = s.players[1]
    const ids = nightTargets(s, doctor).map(p => p.id)
    expect(ids).not.toContain('p2') // і себе вже використав, і лікував минулої ночі
    s = playNight(s, { p1: 'p5', p2: 'p5', p3: 'p5' })
    s = run(s, [{ type: 'continue' }, { type: 'toVote' }, { type: 'finishVote' }, { type: 'continue' }, { type: 'startNight' }])
    const ids3 = nightTargets(s, s.players[1]).map(p => p.id)
    expect(ids3).not.toContain('p5')
    expect(ids3).not.toContain('p2')
    expect(ids3).toContain('p3')
  })

  it('мирні записують підозри для статистики', () => {
    const s = playNight(toNight(gameWith(FIVE)), { p1: 'p4', p2: 'p4', p3: 'p5', p4: 'p1', p5: 'p2' })
    expect(s.suspicions).toEqual([
      { round: 1, byId: 'p4', targetId: 'p1' },
      { round: 1, byId: 'p5', targetId: 'p2' }
    ])
  })
})

function toDayVote(roles: RoleId[], settings: Partial<Settings> = {}): GameState {
  // Ніч без вибування: лікар рятує ціль мафії
  const mafia = roles.indexOf('mafia') + 1
  const doctor = roles.indexOf('doctor') + 1
  const detective = roles.indexOf('detective') + 1
  const victim = roles.indexOf('civilian') + 1
  let s = playNight(toNight(gameWith(roles, settings)), {
    [`p${mafia}`]: `p${victim}`,
    [`p${doctor}`]: `p${victim}`,
    [`p${detective}`]: `p${mafia}`
  })
  s = run(s, [{ type: 'continue' }, { type: 'toVote' }])
  return s
}

function castAll(state: GameState, votes: Record<string, string>): GameState {
  return Object.entries(votes).reduce(
    (s, [voterId, targetId]) => reduce(s, { type: 'castVote', voterId, targetId }),
    state
  )
}

describe('голосування', () => {
  it('вибуває гравець з найбільшою кількістю голосів', () => {
    let s = toDayVote(['civilian', 'doctor', 'detective', 'civilian', 'mafia', 'civilian'])
    s = castAll(s, { p1: 'p4', p2: 'p4', p3: 'p5', p4: 'p1', p5: 'p4', p6: ABSTAIN })
    s = reduce(s, { type: 'finishVote' })
    expect(s.phase).toBe('voteResult')
    expect(s.log.at(-1)).toMatchObject({ kind: 'day', eliminatedId: 'p4', abstain: 1 })
    expect(s.players.find(p => p.id === 'p4')!.alive).toBe(false)
  })

  it('не можна голосувати за себе', () => {
    let s = toDayVote(FIVE)
    s = reduce(s, { type: 'castVote', voterId: 'p1', targetId: 'p1' })
    expect(s.vote!.votes.p1).toBeUndefined()
  })

  it('нічия веде до переголосування лише між лідерами', () => {
    let s = toDayVote(['civilian', 'doctor', 'detective', 'civilian', 'mafia', 'civilian'])
    s = castAll(s, { p1: 'p4', p2: 'p4', p3: 'p5', p4: 'p5', p5: 'p6', p6: 'p1' })
    s = reduce(s, { type: 'finishVote' })
    expect(s.phase).toBe('runoff')
    expect(s.vote!.candidates).toEqual(['p4', 'p5'])
    s = reduce(s, { type: 'runoffDone' })
    expect(s.phase).toBe('vote')
    s = castAll(s, { p1: 'p5', p2: 'p5', p3: 'p5', p4: 'p5', p5: 'p4', p6: 'p4' })
    s = reduce(s, { type: 'finishVote' })
    expect(s.log.at(-1)).toMatchObject({ eliminatedId: 'p5', runoff: true })
    expect(s.winner).toBe('town')
  })

  it('повторна нічия — ніхто не вибуває', () => {
    let s = toDayVote(['civilian', 'doctor', 'detective', 'civilian', 'mafia', 'civilian'])
    s = castAll(s, { p1: 'p4', p2: 'p4', p3: 'p5', p4: 'p5' })
    s = run(s, [{ type: 'finishVote' }, { type: 'runoffDone' }])
    s = castAll(s, { p1: 'p4', p2: 'p4', p3: 'p5', p4: 'p5', p5: 'p4', p6: 'p5' })
    s = reduce(s, { type: 'finishVote' })
    expect(s.phase).toBe('voteResult')
    expect(s.log.at(-1)).toMatchObject({ eliminatedId: null })
    expect(s.players.every(p => p.alive)).toBe(true)
  })

  it('якщо утрималися не менше, ніж за лідера, ніхто не вибуває', () => {
    let s = toDayVote(['civilian', 'doctor', 'detective', 'civilian', 'mafia', 'civilian'])
    s = castAll(s, { p1: 'p4', p2: 'p4', p3: ABSTAIN })
    s = reduce(s, { type: 'finishVote' })
    expect(s.log.at(-1)).toMatchObject({ eliminatedId: null, abstain: 4 })
  })

  it('перше голосування можна пропустити, друге — ні', () => {
    let s = toDayVote(FIVE)
    s = reduce(s, { type: 'skipVote' })
    expect(s.log.at(-1)).toMatchObject({ kind: 'day', skipped: true, eliminatedId: null })
    s = run(s, [{ type: 'continue' }, { type: 'startNight' }])
    s = playNight(s, { p1: 'p4', p2: 'p2', p3: 'p5' })
    s = run(s, [{ type: 'continue' }, { type: 'toVote' }])
    const before = s
    s = reduce(s, { type: 'skipVote' })
    expect(s).toBe(before)
  })

  it('таємне голосування йде по колу і не завершується, доки всі не проголосують', () => {
    let s = toDayVote(FIVE, { voteMode: 'secret' })
    expect(currentActor(s)!.id).toBe('p1')
    s = reduce(s, { type: 'secretVoteDone' }) // без голосу не можна
    expect(s.vote!.turn).toBe(0)
    s = run(s, [{ type: 'castVote', voterId: 'p1', targetId: 'p4' }, { type: 'secretVoteDone' }])
    expect(currentActor(s)!.id).toBe('p2')
    const before = s
    expect(reduce(s, { type: 'finishVote' })).toBe(before)
    for (const id of ['p2', 'p3', 'p4', 'p5']) {
      s = run(s, [{ type: 'castVote', voterId: id, targetId: id === 'p1' ? 'p2' : 'p1' }, { type: 'secretVoteDone' }])
    }
    s = reduce(s, { type: 'finishVote' })
    expect(s.log.at(-1)).toMatchObject({ eliminatedId: 'p1' })
    expect(s.winner).toBe('town')
  })
})

describe('перемога', () => {
  it('місто перемагає, коли мафії не лишилось', () => {
    const g = gameWith(FIVE)
    expect(checkWinner(g.players.map(p => (p.role === 'mafia' ? { ...p, alive: false } : p)))).toBe('town')
  })

  it('мафія перемагає при рівності', () => {
    const g = gameWith(FIVE)
    const players = g.players.map(p => (['p2', 'p3', 'p4'].includes(p.id) ? { ...p, alive: false } : p))
    expect(checkWinner(players)).toBe('mafia')
    expect(checkWinner(g.players)).toBeNull()
  })

  it('після перемоги «Далі» веде на екран кінця гри', () => {
    // 5 гравців: ніч забирає p4, день — помилково p5, наступна ніч — p3 → 1 мафія проти 1
    let s = playNight(toNight(gameWith(FIVE)), { p1: 'p4', p2: 'p5', p3: 'p2' })
    s = run(s, [{ type: 'continue' }, { type: 'toVote' }])
    s = castAll(s, { p1: 'p5', p2: 'p5', p3: 'p5' })
    s = run(s, [{ type: 'finishVote' }, { type: 'continue' }, { type: 'startNight' }])
    s = playNight(s, { p1: 'p3', p2: 'p2', p3: 'p1' })
    expect(s.winner).toBe('mafia')
    expect(s.phase).toBe('morning')
    s = reduce(s, { type: 'continue' })
    expect(s.phase).toBe('gameOver')
  })
})
