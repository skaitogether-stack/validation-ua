'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { GameQuestion } from '../biology/PlantRunnerGame'

// Гра-стрілялка для повторення теми: зореліт збиває ворожі кораблі й астероїди,
// а кожні 30 секунд відповідає на питання. Правильна відповідь +30 с, неправильна −30 с.
// Швидкість гри стала: вороги летять рівномірно від початку до кінця.

const W = 800
const H = 450
const SHIP_Y = H - 46
const SHIP_SPEED = 430
const BULLET_SPEED = 720
const ENEMY_SPEED = 115
const SPAWN_EVERY = 1.05
const FIRE_EVERY = 0.2
const MAX_SPAWN_SHIFT = 320 // наступний ворог з'являється не далі від попереднього, щоб його реально було наздогнати
const START_TIME = 300 // 5 хвилин
const QUESTION_EVERY = 30
const TIME_STEP = 30
const TOTAL_QUESTIONS = 20

type Phase = 'intro' | 'playing' | 'question' | 'dead' | 'timeout' | 'won'
type Keys = { left: boolean; right: boolean; fire: boolean }
type KeyName = keyof Keys

interface Enemy {
  kind: 'ship' | 'rock'
  baseX: number
  x: number
  y: number
  r: number
  hp: number
  seed: number
  flash: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

interface World {
  px: number
  tilt: number
  enemies: Enemy[]
  bullets: { x: number; y: number }[]
  particles: Particle[]
  cooldown: number
  spawnIn: number
  lastSpawnX: number
  time: number
  timeLeft: number
  sinceQuestion: number
  kills: number
}

interface ActiveQuestion {
  question: GameQuestion
  options: string[]
  correctIndex: number
}

const rand = (min: number, max: number) => min + Math.random() * (max - min)
const noKeys = (): Keys => ({ left: false, right: false, fire: false })

function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 20 випадкових питань, рівномірно з усіх параграфів теми
function pickQuestions(pool: GameQuestion[]): GameQuestion[] {
  const byParagraph = new Map<number, GameQuestion[]>()
  for (const q of shuffle(pool)) {
    byParagraph.set(q.paragraph, [...(byParagraph.get(q.paragraph) ?? []), q])
  }
  const groups = shuffle([...byParagraph.values()])
  const picked: GameQuestion[] = []
  while (picked.length < TOTAL_QUESTIONS && groups.some(g => g.length)) {
    for (const g of groups) {
      const q = g.pop()
      if (q && picked.length < TOTAL_QUESTIONS) picked.push(q)
    }
  }
  return shuffle(picked)
}

function newWorld(): World {
  return {
    px: W / 2,
    tilt: 0,
    enemies: [],
    bullets: [],
    particles: [],
    cooldown: 0,
    spawnIn: 1,
    lastSpawnX: W / 2,
    time: 0,
    timeLeft: START_TIME,
    sinceQuestion: 0,
    kills: 0
  }
}

function spawnEnemy(w: World) {
  const x = Math.min(W - 50, Math.max(50, w.lastSpawnX + rand(-MAX_SPAWN_SHIFT, MAX_SPAWN_SHIFT)))
  w.lastSpawnX = x
  const seed = Math.random() * 1000
  if (Math.random() < 0.45) {
    w.enemies.push({ kind: 'ship', baseX: x, x, y: -30, r: 19, hp: 1, seed, flash: 0 })
  } else {
    const big = Math.random() < 0.35
    w.enemies.push({ kind: 'rock', baseX: x, x, y: -30, r: big ? 28 : 20, hp: big ? 2 : 1, seed, flash: 0 })
  }
}

function explode(w: World, x: number, y: number, color: string, count: number) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2)
    const v = rand(40, 220)
    w.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.3, 0.7), color })
  }
}

// Один крок гри; повертає подію, якщо гра має зупинитися
function step(w: World, k: Keys, dt: number): 'dead' | 'question' | 'timeout' | null {
  w.time += dt

  const dir = (k.right ? 1 : 0) - (k.left ? 1 : 0)
  w.px = Math.min(W - 24, Math.max(24, w.px + dir * SHIP_SPEED * dt))
  w.tilt += (dir - w.tilt) * Math.min(1, dt * 12)

  w.cooldown -= dt
  if (k.fire && w.cooldown <= 0) {
    w.bullets.push({ x: w.px, y: SHIP_Y - 22 })
    w.cooldown = FIRE_EVERY
  }

  w.spawnIn -= dt
  if (w.spawnIn <= 0) {
    spawnEnemy(w)
    w.spawnIn += SPAWN_EVERY
  }

  for (const b of w.bullets) b.y -= BULLET_SPEED * dt
  w.bullets = w.bullets.filter(b => b.y > -20)

  let dead = false
  for (const e of w.enemies) {
    e.y += ENEMY_SPEED * dt
    e.flash = Math.max(0, e.flash - dt)
    // ворожі кораблі трохи погойдуються, астероїди летять прямо
    if (e.kind === 'ship') e.x = Math.min(W - 24, Math.max(24, e.baseX + Math.sin(w.time * 2 + e.seed) * 28))

    for (const b of w.bullets) {
      if (b.y > -50 && Math.abs(b.x - e.x) < e.r + 4 && Math.abs(b.y - e.y) < e.r + 6) {
        b.y = -100 // куля зникає
        e.hp--
        e.flash = 0.1
        explode(w, b.x, e.y + e.r * 0.6, '#fde68a', 5)
        if (e.hp <= 0) break
      }
    }
    if (e.hp <= 0) {
      w.kills++
      explode(w, e.x, e.y, e.kind === 'ship' ? '#fb7185' : '#d6d3d1', e.kind === 'ship' ? 18 : 12 + e.r / 2)
      continue
    }
    // ворог прорвався за нижній край або врізався в зореліт
    if (e.y - e.r > H || Math.hypot(e.x - w.px, e.y - SHIP_Y) < e.r + 15) dead = true
  }
  w.enemies = w.enemies.filter(e => e.hp > 0)

  for (const p of w.particles) {
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.life -= dt
  }
  w.particles = w.particles.filter(p => p.life > 0)

  if (dead) {
    explode(w, w.px, SHIP_Y, '#7dd3fc', 30)
    return 'dead'
  }

  w.timeLeft -= dt
  w.sinceQuestion += dt
  if (w.sinceQuestion >= QUESTION_EVERY) return 'question'
  if (w.timeLeft <= 0) return 'timeout'
  return null
}

function draw(ctx: CanvasRenderingContext2D, w: World, t: number, alive: boolean) {
  // космос і зорі
  const sky = ctx.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, '#0b1026')
  sky.addColorStop(1, '#1b1445')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)
  for (let i = 0; i < 70; i++) {
    const layer = (i % 3) + 1
    const x = (i * 97.3) % W
    const y = (i * 53.7 + t * 18 * layer) % H
    ctx.fillStyle = `rgba(255,255,255,${0.25 + layer * 0.2})`
    ctx.fillRect(x, y, layer * 0.8, layer * 0.8)
  }

  // кулі
  ctx.fillStyle = '#fef08a'
  ctx.shadowColor = '#facc15'
  ctx.shadowBlur = 8
  for (const b of w.bullets) {
    ctx.beginPath()
    ctx.roundRect(b.x - 2, b.y - 8, 4, 14, 2)
    ctx.fill()
  }
  ctx.shadowBlur = 0

  for (const e of w.enemies) {
    ctx.save()
    ctx.translate(e.x, e.y)
    if (e.kind === 'rock') {
      ctx.rotate(t * (0.4 + (e.seed % 1)) * (e.seed % 2 < 1 ? 1 : -1))
      ctx.fillStyle = e.flash > 0 ? '#fff' : e.hp > 1 ? '#78716c' : '#a8a29e'
      ctx.strokeStyle = '#44403c'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2
        const rr = e.r * (0.8 + 0.22 * Math.sin(e.seed * (i + 1) * 1.7))
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = 'rgba(68,64,60,0.55)'
      ctx.beginPath()
      ctx.arc(-e.r * 0.3, -e.r * 0.2, e.r * 0.2, 0, Math.PI * 2)
      ctx.arc(e.r * 0.3, e.r * 0.25, e.r * 0.14, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // ворожий корабель носом донизу
      ctx.fillStyle = '#fb923c'
      ctx.beginPath()
      ctx.ellipse(0, -e.r - 2, 5, 6 + Math.sin(t * 30 + e.seed) * 3, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = e.flash > 0 ? '#fff' : '#e11d48'
      ctx.strokeStyle = '#4c0519'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, e.r)
      ctx.lineTo(e.r, -e.r * 0.2)
      ctx.lineTo(e.r * 0.75, -e.r)
      ctx.lineTo(0, -e.r * 0.55)
      ctx.lineTo(-e.r * 0.75, -e.r)
      ctx.lineTo(-e.r, -e.r * 0.2)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#a5f3fc'
      ctx.beginPath()
      ctx.ellipse(0, e.r * 0.15, e.r * 0.3, e.r * 0.36, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  // зореліт гравця
  if (alive) {
    ctx.save()
    ctx.translate(w.px, SHIP_Y)
    ctx.rotate(w.tilt * 0.18)
    ctx.fillStyle = '#fb923c'
    ctx.beginPath()
    ctx.ellipse(0, 22, 5, 8 + Math.sin(t * 40) * 3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#38bdf8'
    ctx.strokeStyle = '#0c4a6e'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, -24)
    ctx.lineTo(9, -2)
    ctx.lineTo(24, 14)
    ctx.lineTo(8, 12)
    ctx.lineTo(5, 18)
    ctx.lineTo(-5, 18)
    ctx.lineTo(-8, 12)
    ctx.lineTo(-24, 14)
    ctx.lineTo(-9, -2)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#f0f9ff'
    ctx.beginPath()
    ctx.ellipse(0, -5, 4, 8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  for (const p of w.particles) {
    ctx.globalAlpha = Math.min(1, p.life * 2.5)
    ctx.fillStyle = p.color
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4)
  }
  ctx.globalAlpha = 1

  // шкала до наступного питання
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.beginPath()
  ctx.roundRect(W / 2 - 100, 12, 200, 10, 5)
  ctx.fill()
  ctx.fillStyle = '#34d399'
  ctx.beginPath()
  ctx.roundRect(W / 2 - 100, 12, Math.max(10, 200 * Math.min(1, w.sinceQuestion / QUESTION_EVERY)), 10, 5)
  ctx.fill()
  ctx.fillStyle = '#a7f3d0'
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('до питання', W / 2, 36)
}

const KEY_MAP: Record<string, KeyName> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'fire'
}

const formatTime = (seconds: number) => {
  const s = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function SpaceShooterGame({ pool, sectionTitle, backHref }: { pool: GameQuestion[]; sectionTitle: string; backHref: string }) {
  const total = Math.min(TOTAL_QUESTIONS, pool.length)
  const [phase, setPhaseState] = useState<Phase>('intro')
  const [hud, setHud] = useState({ time: START_TIME, left: total, kills: 0 })
  const [active, setActive] = useState<ActiveQuestion | null>(null)
  const [chosen, setChosen] = useState<number | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<World | null>(null)
  const phaseRef = useRef<Phase>('intro')
  const queueRef = useRef<GameQuestion[]>([])
  const keysRef = useRef<Keys>(noKeys())

  const setPhase = (p: Phase) => {
    phaseRef.current = p
    setPhaseState(p)
  }

  const startGame = () => {
    worldRef.current = newWorld()
    queueRef.current = pickQuestions(pool)
    keysRef.current = noKeys()
    setActive(null)
    setChosen(null)
    setHud({ time: START_TIME, left: queueRef.current.length, kills: 0 })
    setPhase('playing')
  }

  // ігровий цикл
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (!worldRef.current) worldRef.current = newWorld()

    let raf = 0
    let last = performance.now()
    let shown = ''
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      const w = worldRef.current
      if (w) {
        if (phaseRef.current === 'playing') {
          const event = step(w, keysRef.current, dt)
          if (event === 'question') {
            const question = queueRef.current[0]
            const options = shuffle([question.correct, shuffle(question.wrong)[0]])
            keysRef.current = noKeys()
            setActive({ question, options, correctIndex: options.indexOf(question.correct) })
            setChosen(null)
            phaseRef.current = 'question'
            setPhaseState('question')
          } else if (event) {
            phaseRef.current = event
            setPhaseState(event)
          }
          const key = `${Math.ceil(w.timeLeft)}-${w.kills}`
          if (key !== shown) {
            shown = key
            setHud(h => ({ ...h, time: w.timeLeft, kills: w.kills }))
          }
        }
        draw(ctx, w, now / 1000, phaseRef.current !== 'dead')
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  // клавіатура
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const name = KEY_MAP[e.code]
      if (!name || phaseRef.current !== 'playing') return
      e.preventDefault()
      keysRef.current[name] = e.type === 'keydown'
    }
    const onBlur = () => {
      keysRef.current = noKeys()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  const answer = (index: number) => {
    const w = worldRef.current
    if (!w || !active || chosen !== null) return
    setChosen(index)
    const queue = queueRef.current
    const current = queue.shift()
    if (index === active.correctIndex) {
      w.timeLeft += TIME_STEP
    } else {
      w.timeLeft -= TIME_STEP
      if (current) queue.push(current) // неправильне питання повернеться наприкінці
    }
    setHud({ time: w.timeLeft, left: queue.length, kills: w.kills })
  }

  const continueGame = () => {
    const w = worldRef.current
    if (!w) return
    if (queueRef.current.length === 0) return setPhase('won')
    if (w.timeLeft <= 0) return setPhase('timeout')
    // після питання небо чисте: гравець не втрачає корабель через паузу
    w.enemies = []
    w.bullets = []
    w.spawnIn = 1
    w.lastSpawnX = w.px
    w.sinceQuestion = 0
    keysRef.current = noKeys()
    setPhase('playing')
  }

  const padButton = (name: KeyName, label: string, aria: string, wide = false) => {
    const set = (value: boolean) => () => {
      if (phaseRef.current === 'playing') keysRef.current[name] = value
    }
    return (
      <button
        type="button"
        aria-label={aria}
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId)
          set(true)()
        }}
        onPointerUp={set(false)}
        onPointerCancel={set(false)}
        onLostPointerCapture={set(false)}
        onContextMenu={e => e.preventDefault()}
        className={`h-14 ${wide ? 'w-28' : 'w-14'} select-none touch-none rounded-2xl border border-indigo-200 bg-white text-2xl font-bold text-indigo-700 shadow-sm active:bg-indigo-100`}
      >
        {label}
      </button>
    )
  }

  const answeredCount = total - hud.left
  const isCorrect = chosen !== null && active !== null && chosen === active.correctIndex

  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-6">
      <Link href={backHref} className="text-sm text-gray-500 hover:text-gray-800">
        ← Усі теми
      </Link>
      <div className="mt-2 text-sm font-bold text-indigo-700">{sectionTitle}</div>
      <h1 className="text-2xl font-bold mb-4">🚀 Гра «Зоряний патруль»</h1>

      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm font-bold">
        <div className={`rounded-xl border bg-white py-2 ${hud.time < 60 ? 'border-red-200 text-red-600' : 'border-gray-100 text-gray-800'}`}>
          ⏱ {formatTime(hud.time)}
        </div>
        <div className="rounded-xl border border-gray-100 bg-white py-2 text-gray-800">
          ❓ {answeredCount} / {total}
        </div>
        <div className="rounded-xl border border-gray-100 bg-white py-2 text-gray-800">💥 {hud.kills}</div>
      </div>

      <canvas ref={canvasRef} className="block w-full rounded-2xl border border-gray-100 shadow-sm" style={{ aspectRatio: `${W} / ${H}` }} />

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-2">
          {padButton('left', '←', 'Ліворуч')}
          {padButton('right', '→', 'Праворуч')}
        </div>
        <div className="hidden text-center text-xs text-gray-400 sm:block">Стрілки ← → — рух, пробіл — постріл</div>
        {padButton('fire', '🔥', 'Постріл', true)}
      </div>

      {phase !== 'playing' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            {phase === 'intro' && (
              <>
                <div className="text-4xl mb-2">🚀</div>
                <h2 className="text-xl font-bold mb-3">Зоряний патруль</h2>
                <ul className="mb-5 flex flex-col gap-2 text-sm text-gray-600">
                  <li>🎯 Керуй зорельотом стрілками ← → і стріляй пробілом. Збивай усі ворожі кораблі й астероїди (великі астероїди — з двох влучань).</li>
                  <li>💥 Якщо хоч один ворог прорветься повз тебе або влучить у зореліт — гра почнеться спочатку.</li>
                  <li>⏱ Маєш 5 хвилин. Кожні 30 секунд — питання з теми.</li>
                  <li>✅ Правильна відповідь: +30 секунд. ❌ Неправильна: −30 секунд.</li>
                  <li>🏆 Дай правильну відповідь на всі {total} питань — і ти переміг! Якщо час закінчиться — гра почнеться спочатку.</li>
                </ul>
                <button onClick={startGame} className="w-full rounded-xl bg-indigo-500 py-3 font-bold text-white hover:bg-indigo-600">
                  Почати гру
                </button>
              </>
            )}

            {phase === 'question' && active && (
              <>
                <div className="mb-1 text-xs font-bold uppercase tracking-wide text-indigo-700">
                  Питання {Math.min(answeredCount + (chosen === null ? 1 : isCorrect ? 0 : 1), total)} з {total} · § {active.question.paragraph}
                </div>
                <h2 className="text-lg font-bold mb-4">{active.question.text}</h2>
                <div className="flex flex-col gap-2">
                  {active.options.map((option, i) => {
                    const state =
                      chosen === null
                        ? 'border-gray-200 hover:border-indigo-400 hover:bg-indigo-50'
                        : i === active.correctIndex
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                          : i === chosen
                            ? 'border-red-400 bg-red-50 text-red-700'
                            : 'border-gray-200 opacity-60'
                    return (
                      <button
                        key={option}
                        onClick={() => answer(i)}
                        disabled={chosen !== null}
                        className={`rounded-xl border-2 px-4 py-3 text-left font-semibold transition-colors ${state}`}
                      >
                        {option}
                      </button>
                    )
                  })}
                </div>
                {chosen !== null && (
                  <div className="mt-4">
                    <div className={`font-bold ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isCorrect ? '✅ Правильно! +30 секунд' : '❌ Неправильно. −30 секунд'}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{active.question.explanation}</p>
                    <button onClick={continueGame} className="mt-4 w-full rounded-xl bg-indigo-500 py-3 font-bold text-white hover:bg-indigo-600">
                      Далі →
                    </button>
                  </div>
                )}
              </>
            )}

            {(phase === 'dead' || phase === 'timeout') && (
              <>
                <div className="text-4xl mb-2">{phase === 'dead' ? '💥' : '⏰'}</div>
                <h2 className="text-xl font-bold mb-2">{phase === 'dead' ? 'Ворог прорвався!' : 'Час вийшов'}</h2>
                <p className="mb-5 text-sm text-gray-600">
                  Ти встиг відповісти на {answeredCount} з {total} питань і збив {hud.kills} 💥. Гра починається спочатку — цього разу все вийде!
                </p>
                <button onClick={startGame} className="w-full rounded-xl bg-indigo-500 py-3 font-bold text-white hover:bg-indigo-600">
                  Почати спочатку
                </button>
              </>
            )}

            {phase === 'won' && (
              <>
                <div className="text-4xl mb-2">🏆</div>
                <h2 className="text-xl font-bold mb-2">Перемога!</h2>
                <p className="mb-5 text-sm text-gray-600">
                  Ти відповів на всі {total} питань теми й збив {hud.kills} ворогів. Африка під надійним захистом!
                </p>
                <div className="flex gap-2">
                  <button onClick={startGame} className="flex-1 rounded-xl bg-indigo-500 py-3 font-bold text-white hover:bg-indigo-600">
                    Грати ще раз
                  </button>
                  <Link href={backHref} className="flex-1 rounded-xl border border-gray-200 py-3 text-center font-bold text-gray-700 hover:bg-gray-50">
                    До тем
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
