'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// Гра-платформер для повторення теми: паросток біжить рівнем, а кожні 30 секунд
// відповідає на питання. Правильна відповідь +30 с, неправильна −30 с.

export interface GameQuestion {
  paragraph: number
  text: string
  correct: string
  wrong: string[]
  explanation: string
}

const W = 800
const H = 400
const GROUND = 330
const PW = 28 // ширина персонажа
const START_TIME = 300 // 5 хвилин
const QUESTION_EVERY = 30
const TIME_STEP = 30
const TOTAL_QUESTIONS = 20

type Phase = 'intro' | 'playing' | 'question' | 'dead' | 'timeout' | 'won'
type Keys = { left: boolean; right: boolean; up: boolean; down: boolean }
type KeyName = keyof Keys

interface Enemy {
  kind: 'beetle' | 'bee'
  x: number
  y: number
  w: number
  h: number
  minX: number
  maxX: number
  vx: number
}

interface World {
  px: number
  py: number // координата ніг
  vy: number
  onGround: boolean
  duck: boolean
  facing: 1 | -1
  walk: number
  camX: number
  genX: number
  pits: { x: number; w: number }[]
  spikes: { x: number; w: number }[]
  platforms: { x: number; y: number; w: number }[]
  enemies: Enemy[]
  drops: { x: number; y: number }[]
  timeLeft: number
  sinceQuestion: number
  dropCount: number
  grace: number // секунди невразливості після питання
}

interface ActiveQuestion {
  question: GameQuestion
  options: string[]
  correctIndex: number
}

const rand = (min: number, max: number) => min + Math.random() * (max - min)

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
    px: 120,
    py: GROUND,
    vy: 0,
    onGround: true,
    duck: false,
    facing: 1,
    walk: 0,
    camX: 0,
    genX: 600,
    pits: [],
    spikes: [],
    platforms: [],
    enemies: [],
    drops: [],
    timeLeft: START_TIME,
    sinceQuestion: 0,
    dropCount: 0,
    grace: 0
  }
}

// Добудовує рівень праворуч від камери й прибирає те, що лишилося позаду
function extendLevel(w: World) {
  while (w.genX < w.camX + W * 2) {
    let x = w.genX
    const r = Math.random()
    if (r < 0.22) {
      const n = 1 + Math.floor(Math.random() * 3)
      w.spikes.push({ x, w: n * 24 })
      w.drops.push({ x: x + n * 12, y: GROUND - 95 })
      x += n * 24
    } else if (r < 0.42) {
      const pw = rand(70, 110)
      w.pits.push({ x, w: pw })
      w.drops.push({ x: x + pw / 2, y: GROUND - 90 })
      x += pw
    } else if (r < 0.6) {
      w.enemies.push({ kind: 'beetle', x: x + 100, y: GROUND - 20, w: 30, h: 20, minX: x, maxX: x + 150, vx: -50 })
      x += 180
    } else if (r < 0.75) {
      w.enemies.push({ kind: 'bee', x: x + 80, y: GROUND - 52, w: 28, h: 22, minX: x, maxX: x + 120, vx: -70 })
      x += 150
    } else if (r < 0.9) {
      w.spikes.push({ x: x + 40, w: 120 })
      w.platforms.push({ x: x + 20, y: GROUND - 75, w: 160 })
      w.drops.push({ x: x + 70, y: GROUND - 100 }, { x: x + 130, y: GROUND - 100 })
      x += 200
    } else {
      w.platforms.push({ x, y: GROUND - 70, w: 100 }, { x: x + 130, y: GROUND - 130, w: 100 })
      w.drops.push({ x: x + 50, y: GROUND - 95 }, { x: x + 180, y: GROUND - 155 })
      x += 240
    }
    w.genX = x + rand(150, 240)
  }
  const behind = w.camX - 200
  w.pits = w.pits.filter(o => o.x + o.w > behind)
  w.spikes = w.spikes.filter(o => o.x + o.w > behind)
  w.platforms = w.platforms.filter(o => o.x + o.w > behind)
  w.enemies = w.enemies.filter(o => o.maxX + o.w > behind)
  w.drops = w.drops.filter(o => o.x > behind)
}

const overlap = (ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) =>
  ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by

// Один крок фізики; повертає подію, якщо гра має зупинитися
function step(w: World, k: Keys, dt: number): 'dead' | 'question' | 'timeout' | null {
  w.grace = Math.max(0, w.grace - dt)
  w.duck = k.down && w.onGround
  const dir = (k.right ? 1 : 0) - (k.left ? 1 : 0)
  if (dir) w.facing = dir as 1 | -1
  const vx = dir * (w.duck ? 110 : 230)
  if (dir && w.onGround) w.walk += dt * 12

  if (k.up && w.onGround) {
    w.vy = -640
    w.onGround = false
  }
  if (!k.up && w.vy < -250) w.vy = -250 // короткий стрибок, якщо кнопку відпущено
  w.vy += (k.down && !w.onGround ? 3600 : 1800) * dt

  // рух по горизонталі; у ямі стіни не дають вийти назад на землю
  const pitBelow = w.py > GROUND ? w.pits.find(p => w.px + PW / 2 > p.x && w.px + PW / 2 < p.x + p.w) : undefined
  w.px = Math.max(w.camX, w.px + vx * dt)
  if (pitBelow) w.px = Math.min(Math.max(w.px, pitBelow.x), pitBelow.x + pitBelow.w - PW)

  // рух по вертикалі та приземлення
  const prevFeet = w.py
  w.py += w.vy * dt
  w.onGround = false
  const overPit = w.pits.some(p => w.px + 8 > p.x && w.px + PW - 8 < p.x + p.w)
  if (w.vy >= 0) {
    if (!overPit && prevFeet <= GROUND && w.py >= GROUND) {
      w.py = GROUND
      w.vy = 0
      w.onGround = true
    } else {
      for (const p of w.platforms) {
        if (prevFeet <= p.y && w.py >= p.y && w.px + PW > p.x && w.px < p.x + p.w) {
          w.py = p.y
          w.vy = 0
          w.onGround = true
          break
        }
      }
    }
  }
  if (w.py > H + 80) return 'dead'

  const ph = w.duck ? 22 : 40
  const bx = w.px + 4
  const by = w.py - ph
  const bw = PW - 8

  w.drops = w.drops.filter(d => {
    const hit = overlap(bx, by, bw, ph, d.x - 10, d.y - 12, 20, 24)
    if (hit) w.dropCount++
    return !hit
  })

  for (const e of w.enemies) {
    e.x += e.vx * dt
    if (e.x < e.minX || e.x > e.maxX) {
      e.x = Math.min(Math.max(e.x, e.minX), e.maxX)
      e.vx = -e.vx
    }
  }
  const hitEnemy = w.enemies.find(e => overlap(bx, by, bw, ph, e.x + 3, e.y + 3, e.w - 6, e.h - 3))
  if (hitEnemy) {
    if (w.vy > 0 && prevFeet <= hitEnemy.y + 10) {
      // стрибок на ворога зверху
      w.enemies = w.enemies.filter(e => e !== hitEnemy)
      w.vy = -420
    } else if (w.grace <= 0) {
      return 'dead'
    }
  }
  if (w.grace <= 0 && w.spikes.some(s => overlap(bx, by, bw, ph, s.x + 5, GROUND - 15, s.w - 10, 15))) return 'dead'

  w.camX = Math.max(w.camX, w.px - 280)
  extendLevel(w)

  w.timeLeft -= dt
  w.sinceQuestion += dt
  if (w.sinceQuestion >= QUESTION_EVERY) return 'question'
  if (w.timeLeft <= 0) return 'timeout'
  return null
}

function draw(ctx: CanvasRenderingContext2D, w: World, t: number) {
  const cam = w.camX

  // небо, сонце, хмари, пагорби
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND)
  sky.addColorStop(0, '#a5dcff')
  sky.addColorStop(1, '#e8f8ff')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#fde68a'
  ctx.beginPath()
  ctx.arc(690, 70, 34, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  for (let i = 0; i < 5; i++) {
    const x = ((((i * 290 - cam * 0.15) % 1450) + 1450) % 1450) - 150
    const y = 50 + ((i * 37) % 80)
    ctx.beginPath()
    ctx.ellipse(x, y, 46, 16, 0, 0, Math.PI * 2)
    ctx.ellipse(x + 26, y - 12, 30, 16, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#bbe7b0'
  for (let i = 0; i < 5; i++) {
    const x = ((((i * 330 - cam * 0.4) % 1650) + 1650) % 1650) - 250
    ctx.beginPath()
    ctx.ellipse(x, GROUND + 10, 190, 70 + ((i * 23) % 50), 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // земля та ями
  ctx.fillStyle = '#8b5a2b'
  ctx.fillRect(0, GROUND, W, H - GROUND)
  ctx.fillStyle = '#4ade80'
  ctx.fillRect(0, GROUND, W, 12)
  ctx.fillStyle = '#16a34a'
  ctx.fillRect(0, GROUND + 12, W, 3)
  for (const p of w.pits) {
    const hole = ctx.createLinearGradient(0, GROUND, 0, H)
    hole.addColorStop(0, '#e8f8ff')
    hole.addColorStop(1, '#7dd3fc')
    ctx.fillStyle = hole
    ctx.fillRect(p.x - cam, GROUND, p.w, H - GROUND)
    ctx.fillStyle = '#6b4423'
    ctx.fillRect(p.x - cam - 3, GROUND, 3, H - GROUND)
    ctx.fillRect(p.x - cam + p.w, GROUND, 3, H - GROUND)
  }

  for (const p of w.platforms) {
    ctx.fillStyle = '#a16207'
    ctx.beginPath()
    ctx.roundRect(p.x - cam, p.y, p.w, 16, 6)
    ctx.fill()
    ctx.fillStyle = '#4ade80'
    ctx.beginPath()
    ctx.roundRect(p.x - cam, p.y, p.w, 7, 4)
    ctx.fill()
  }

  // шипи
  for (const s of w.spikes) {
    for (let x = s.x; x < s.x + s.w; x += 24) {
      ctx.fillStyle = '#64748b'
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x - cam + 1, GROUND)
      ctx.lineTo(x - cam + 12, GROUND - 22)
      ctx.lineTo(x - cam + 23, GROUND)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  }

  // краплі води
  for (const d of w.drops) {
    const x = d.x - cam
    const y = d.y + Math.sin(t * 3 + d.x) * 3
    ctx.fillStyle = '#38bdf8'
    ctx.beginPath()
    ctx.moveTo(x, y - 12)
    ctx.quadraticCurveTo(x + 11, y + 2, x, y + 10)
    ctx.quadraticCurveTo(x - 11, y + 2, x, y - 12)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.beginPath()
    ctx.arc(x - 3, y + 2, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }

  for (const e of w.enemies) {
    const x = e.x - cam
    const cx = x + e.w / 2
    if (e.kind === 'beetle') {
      ctx.strokeStyle = '#1f2937'
      ctx.lineWidth = 2
      for (let i = -1; i <= 1; i++) {
        const sway = Math.sin(t * 14 + i) * 3
        ctx.beginPath()
        ctx.moveTo(cx + i * 8, e.y + e.h - 6)
        ctx.lineTo(cx + i * 10 + sway, e.y + e.h)
        ctx.stroke()
      }
      ctx.fillStyle = '#b91c1c'
      ctx.beginPath()
      ctx.ellipse(cx, e.y + e.h / 2, e.w / 2, e.h / 2 - 1, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#1f2937'
      ctx.beginPath()
      ctx.arc(cx + (e.vx < 0 ? -11 : 11), e.y + e.h / 2 + 1, 6, 0, Math.PI * 2)
      ctx.arc(cx - 3, e.y + 7, 2.5, 0, Math.PI * 2)
      ctx.arc(cx + 5, e.y + 12, 2.5, 0, Math.PI * 2)
      ctx.fill()
    } else {
      const cy = e.y + e.h / 2 + Math.sin(t * 6 + e.minX) * 2
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      const flap = Math.abs(Math.sin(t * 30)) * 7 + 3
      ctx.beginPath()
      ctx.ellipse(cx - 3, cy - 10, 6, flap, -0.3, 0, Math.PI * 2)
      ctx.ellipse(cx + 5, cy - 10, 6, flap, 0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#facc15'
      ctx.beginPath()
      ctx.ellipse(cx, cy, e.w / 2, e.h / 2 - 2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#1f2937'
      ctx.fillRect(cx - 5, cy - 8, 4, 16)
      ctx.fillRect(cx + 3, cy - 7, 4, 14)
      ctx.beginPath()
      ctx.arc(cx + (e.vx < 0 ? -10 : 10), cy - 2, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // персонаж-паросток
  if (w.grace <= 0 || Math.floor(t * 10) % 2 === 0) {
    const ph = w.duck ? 22 : 40
    const x = w.px - cam
    const top = w.py - ph
    const cx = x + PW / 2
    const legs = w.onGround ? Math.sin(w.walk) * 4 : 3
    ctx.fillStyle = '#365314'
    ctx.fillRect(cx - 8 + legs, w.py - 5, 6, 5)
    ctx.fillRect(cx + 2 - legs, w.py - 5, 6, 5)
    ctx.fillStyle = '#84cc16'
    ctx.strokeStyle = '#3f6212'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(x + 1, top + 6, PW - 2, ph - 10, 10)
    ctx.fill()
    ctx.stroke()
    // листочки на маківці
    ctx.fillStyle = '#22c55e'
    ctx.beginPath()
    ctx.ellipse(cx - 7, top + 3, 9, 4.5, -0.6, 0, Math.PI * 2)
    ctx.ellipse(cx + 7, top + 3, 9, 4.5, 0.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    // очі
    const eyeY = top + (w.duck ? 13 : 18)
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(cx - 5 + w.facing * 2, eyeY, 4.5, 0, Math.PI * 2)
    ctx.arc(cx + 5 + w.facing * 2, eyeY, 4.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1f2937'
    ctx.beginPath()
    ctx.arc(cx - 5 + w.facing * 3.5, eyeY, 2, 0, Math.PI * 2)
    ctx.arc(cx + 5 + w.facing * 3.5, eyeY, 2, 0, Math.PI * 2)
    ctx.fill()
  }

  // шкала до наступного питання
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.beginPath()
  ctx.roundRect(W / 2 - 100, 12, 200, 10, 5)
  ctx.fill()
  ctx.fillStyle = '#10b981'
  ctx.beginPath()
  ctx.roundRect(W / 2 - 100, 12, Math.max(10, 200 * Math.min(1, w.sinceQuestion / QUESTION_EVERY)), 10, 5)
  ctx.fill()
  ctx.fillStyle = '#065f46'
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('до питання', W / 2, 36)
}

const KEY_MAP: Record<string, KeyName> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  Space: 'up',
  ArrowDown: 'down',
  KeyS: 'down'
}

const formatTime = (seconds: number) => {
  const s = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function PlantRunnerGame({ pool, sectionTitle, backHref }: { pool: GameQuestion[]; sectionTitle: string; backHref: string }) {
  const total = Math.min(TOTAL_QUESTIONS, pool.length)
  const [phase, setPhaseState] = useState<Phase>('intro')
  const [hud, setHud] = useState({ time: START_TIME, left: total, drops: 0 })
  const [active, setActive] = useState<ActiveQuestion | null>(null)
  const [chosen, setChosen] = useState<number | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<World | null>(null)
  const phaseRef = useRef<Phase>('intro')
  const queueRef = useRef<GameQuestion[]>([])
  const keysRef = useRef<Keys>({ left: false, right: false, up: false, down: false })

  const setPhase = (p: Phase) => {
    phaseRef.current = p
    setPhaseState(p)
  }
  const releaseKeys = () => {
    keysRef.current = { left: false, right: false, up: false, down: false }
  }

  const startGame = () => {
    worldRef.current = newWorld()
    queueRef.current = pickQuestions(pool)
    releaseKeys()
    setActive(null)
    setChosen(null)
    setHud({ time: START_TIME, left: queueRef.current.length, drops: 0 })
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
    if (!worldRef.current) {
      worldRef.current = newWorld()
      extendLevel(worldRef.current)
    }

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
            keysRef.current = { left: false, right: false, up: false, down: false }
            setActive({ question, options, correctIndex: options.indexOf(question.correct) })
            setChosen(null)
            phaseRef.current = 'question'
            setPhaseState('question')
          } else if (event) {
            phaseRef.current = event
            setPhaseState(event)
          }
          const key = `${Math.ceil(w.timeLeft)}-${w.dropCount}`
          if (key !== shown) {
            shown = key
            setHud(h => ({ ...h, time: w.timeLeft, drops: w.dropCount }))
          }
        }
        draw(ctx, w, now / 1000)
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
      keysRef.current = { left: false, right: false, up: false, down: false }
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
    setHud({ time: w.timeLeft, left: queue.length, drops: w.dropCount })
  }

  const continueGame = () => {
    const w = worldRef.current
    if (!w) return
    if (queueRef.current.length === 0) return setPhase('won')
    if (w.timeLeft <= 0) return setPhase('timeout')
    w.sinceQuestion = 0
    w.grace = 1.5
    releaseKeys()
    setPhase('playing')
  }

  const padButton = (name: KeyName, label: string, aria: string) => {
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
        className="h-14 w-14 select-none touch-none rounded-2xl border border-emerald-200 bg-white text-2xl font-bold text-emerald-700 shadow-sm active:bg-emerald-100"
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
      <div className="mt-2 text-sm font-bold text-emerald-700">{sectionTitle}</div>
      <h1 className="text-2xl font-bold mb-4">🌱 Гра «Пригоди паростка»</h1>

      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm font-bold">
        <div className={`rounded-xl border bg-white py-2 ${hud.time < 60 ? 'border-red-200 text-red-600' : 'border-gray-100 text-gray-800'}`}>
          ⏱ {formatTime(hud.time)}
        </div>
        <div className="rounded-xl border border-gray-100 bg-white py-2 text-gray-800">
          ❓ {answeredCount} / {total}
        </div>
        <div className="rounded-xl border border-gray-100 bg-white py-2 text-gray-800">💧 {hud.drops}</div>
      </div>

      <canvas ref={canvasRef} className="block w-full rounded-2xl border border-gray-100 shadow-sm" style={{ aspectRatio: `${W} / ${H}` }} />

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-2">
          {padButton('left', '←', 'Назад')}
          {padButton('right', '→', 'Вперед')}
        </div>
        <div className="hidden text-center text-xs text-gray-400 sm:block">
          Стрілки або WASD: ← → рух, ↑ / пробіл — стрибок, ↓ — присісти
        </div>
        <div className="flex gap-2">
          {padButton('down', '↓', 'Присісти')}
          {padButton('up', '↑', 'Стрибок')}
        </div>
      </div>

      {phase !== 'playing' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            {phase === 'intro' && (
              <>
                <div className="text-4xl mb-2">🌱</div>
                <h2 className="text-xl font-bold mb-3">Пригоди паростка</h2>
                <ul className="mb-5 flex flex-col gap-2 text-sm text-gray-600">
                  <li>🏃 Біжи вперед, перестрибуй шипи та ями, оминай жуків і бджіл (під бджолою можна присісти).</li>
                  <li>⏱ Маєш 5 хвилин. Кожні 30 секунд — питання з теми.</li>
                  <li>✅ Правильна відповідь: +30 секунд. ❌ Неправильна: −30 секунд.</li>
                  <li>🏆 Дай правильну відповідь на всі {total} питань — і ти переміг!</li>
                  <li>💥 Якщо паросток загине або закінчиться час — гра почнеться спочатку.</li>
                </ul>
                <button onClick={startGame} className="w-full rounded-xl bg-emerald-500 py-3 font-bold text-white hover:bg-emerald-600">
                  Почати гру
                </button>
              </>
            )}

            {phase === 'question' && active && (
              <>
                <div className="mb-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Питання {Math.min(answeredCount + (chosen === null ? 1 : isCorrect ? 0 : 1), total)} з {total} · § {active.question.paragraph}
                </div>
                <h2 className="text-lg font-bold mb-4">{active.question.text}</h2>
                <div className="flex flex-col gap-2">
                  {active.options.map((option, i) => {
                    const state =
                      chosen === null
                        ? 'border-gray-200 hover:border-emerald-400 hover:bg-emerald-50'
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
                    <button onClick={continueGame} className="mt-4 w-full rounded-xl bg-emerald-500 py-3 font-bold text-white hover:bg-emerald-600">
                      Далі →
                    </button>
                  </div>
                )}
              </>
            )}

            {(phase === 'dead' || phase === 'timeout') && (
              <>
                <div className="text-4xl mb-2">{phase === 'dead' ? '💥' : '⏰'}</div>
                <h2 className="text-xl font-bold mb-2">{phase === 'dead' ? 'Ой! Паросток загинув' : 'Час вийшов'}</h2>
                <p className="mb-5 text-sm text-gray-600">
                  Ти встиг відповісти на {answeredCount} з {total} питань. Гра починається спочатку — цього разу все вийде!
                </p>
                <button onClick={startGame} className="w-full rounded-xl bg-emerald-500 py-3 font-bold text-white hover:bg-emerald-600">
                  Почати спочатку
                </button>
              </>
            )}

            {phase === 'won' && (
              <>
                <div className="text-4xl mb-2">🏆</div>
                <h2 className="text-xl font-bold mb-2">Перемога!</h2>
                <p className="mb-5 text-sm text-gray-600">
                  Ти відповів на всі {total} питань теми й зібрав {hud.drops} 💧. Паросток виріс у справжню рослину!
                </p>
                <div className="flex gap-2">
                  <button onClick={startGame} className="flex-1 rounded-xl bg-emerald-500 py-3 font-bold text-white hover:bg-emerald-600">
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
