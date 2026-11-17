'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { pickQuestions, shuffle, type GameQuestion } from '../games/quiz'

// Гра-тир для повторення теми: боєць спецзагону стоїть за мішками з піском, а терористи
// виглядають з вікон, дверей і з-за ящиків. Над кожним — таймер: не встиг влучити — він стріляє першим.
// Кожні 30 секунд — питання. Правильна відповідь +30 с, неправильна −30 с.
// Швидкість гри стала: однаковий час на реакцію від початку до кінця.

const W = 800
const H = 450
const GROUND_Y = 372
const AIM_SPEED = 460 // px/с — увесь екран приціл проходить приблизно за 1,6 с
const REACT = 2.4 // секунди від появи терориста до його пострілу
const RISE = 0.25 // анімація появи
const SPAWN_EVERY = 1.25
const MAX_ACTIVE = 2
const MAX_SPOT_SHIFT = 3 // наступний терорист не далі ніж за 3 укриття від попереднього — завжди можна встигнути
const FIRE_EVERY = 0.25
const HIT_RANGE = 30
const DEFAULT_AIM_Y = 250
const START_TIME = 300 // 5 хвилин
const QUESTION_EVERY = 30
const TIME_STEP = 30
const TOTAL_QUESTIONS = 20

type Phase = 'intro' | 'playing' | 'question' | 'dead' | 'timeout' | 'won'
type Keys = { left: boolean; right: boolean }
type CoverKind = 'crate' | 'window' | 'barrel' | 'door'

interface Spot {
  x: number
  kind: CoverKind
  anchorY: number // де груди терориста, коли він повністю з'явився
  scale: number
}

const SPOTS: Spot[] = [
  { x: 70, kind: 'crate', anchorY: 300, scale: 0.95 },
  { x: 180, kind: 'window', anchorY: 172, scale: 0.7 },
  { x: 290, kind: 'barrel', anchorY: 312, scale: 0.95 },
  { x: 400, kind: 'door', anchorY: 296, scale: 0.95 },
  { x: 510, kind: 'window', anchorY: 172, scale: 0.7 },
  { x: 620, kind: 'crate', anchorY: 300, scale: 0.95 },
  { x: 730, kind: 'window', anchorY: 172, scale: 0.7 }
]
const WINDOW_TOP = 118
const WINDOW_BOTTOM = 202
const DOOR_TOP = 248

interface Enemy {
  spot: number
  t: number
  down: number // >0 — терориста знешкоджено, триває анімація падіння
}

interface World {
  cx: number
  cy: number
  enemies: Enemy[]
  holes: { x: number; y: number; life: number }[]
  cooldown: number
  firePressed: boolean
  flash: number
  tracer: { x: number; y: number } | null
  spawnIn: number
  lastSpot: number
  shotBy: number | null
  timeLeft: number
  sinceQuestion: number
  kills: number
}

interface ActiveQuestion {
  question: GameQuestion
  options: string[]
  correctIndex: number
}

const noKeys = (): Keys => ({ left: false, right: false })

function newWorld(): World {
  return {
    cx: W / 2,
    cy: DEFAULT_AIM_Y,
    enemies: [],
    holes: [],
    cooldown: 0,
    firePressed: false,
    flash: 0,
    tracer: null,
    spawnIn: 1,
    lastSpot: 3,
    shotBy: null,
    timeLeft: START_TIME,
    sinceQuestion: 0,
    kills: 0
  }
}

// груди терориста з урахуванням анімації появи/падіння
function enemyAnchor(e: Enemy): { x: number; y: number; alpha: number } {
  const s = SPOTS[e.spot]
  const appear = e.down > 0 ? Math.max(0, 1 - e.down / 0.45) : Math.min(1, e.t / RISE)
  const eased = 1 - (1 - appear) * (1 - appear)
  if (s.kind === 'door') return { x: s.x + (1 - eased) * 70, y: s.anchorY, alpha: e.down > 0 ? eased : 1 }
  return { x: s.x, y: s.anchorY + (1 - eased) * 80 * s.scale, alpha: 1 }
}

function trySpawn(w: World): boolean {
  const busy = new Set(w.enemies.map(e => e.spot))
  if (w.enemies.filter(e => e.down === 0).length >= MAX_ACTIVE) return false
  const free = SPOTS.map((_, i) => i).filter(i => !busy.has(i) && Math.abs(i - w.lastSpot) <= MAX_SPOT_SHIFT && i !== w.lastSpot)
  if (!free.length) return false
  const spot = free[Math.floor(Math.random() * free.length)]
  w.enemies.push({ spot, t: 0, down: 0 })
  w.lastSpot = spot
  return true
}

// Один крок гри; повертає подію, якщо гра має зупинитися
function step(w: World, k: Keys, dt: number): 'dead' | 'question' | 'timeout' | null {
  const dir = (k.right ? 1 : 0) - (k.left ? 1 : 0)
  w.cx = Math.min(W - 30, Math.max(30, w.cx + dir * AIM_SPEED * dt))

  // приціл сам підлаштовується по висоті під терориста в цій «колонці»
  const target = w.enemies.find(e => e.down === 0 && Math.abs(SPOTS[e.spot].x - w.cx) < HIT_RANGE + 20)
  const aimY = target ? SPOTS[target.spot].anchorY - 14 * SPOTS[target.spot].scale : DEFAULT_AIM_Y
  w.cy += (aimY - w.cy) * Math.min(1, dt * 14)

  w.cooldown -= dt
  w.flash = Math.max(0, w.flash - dt)
  if (w.flash === 0) w.tracer = null
  if (w.firePressed && w.cooldown <= 0) {
    w.cooldown = FIRE_EVERY
    w.flash = 0.07
    w.tracer = { x: w.cx, y: w.cy }
    const hit = w.enemies.find(e => e.down === 0 && e.t > RISE * 0.4 && Math.abs(enemyAnchor(e).x - w.cx) < HIT_RANGE)
    if (hit) {
      hit.down = 0.0001
      w.kills++
    } else {
      w.holes.push({ x: w.cx + (Math.random() - 0.5) * 6, y: w.cy + (Math.random() - 0.5) * 6, life: 2.5 })
    }
  }
  w.firePressed = false

  for (const h of w.holes) h.life -= dt
  w.holes = w.holes.filter(h => h.life > 0)

  w.spawnIn -= dt
  if (w.spawnIn <= 0) w.spawnIn = trySpawn(w) ? SPAWN_EVERY : 0.2

  for (const e of w.enemies) {
    if (e.down > 0) {
      e.down += dt
      continue
    }
    e.t += dt
    if (e.t >= REACT) {
      w.shotBy = e.spot
      return 'dead'
    }
  }
  w.enemies = w.enemies.filter(e => e.down < 0.45)

  w.timeLeft -= dt
  w.sinceQuestion += dt
  if (w.sinceQuestion >= QUESTION_EVERY) return 'question'
  if (w.timeLeft <= 0) return 'timeout'
  return null
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, t: number, shooting: boolean) {
  const s = SPOTS[e.spot].scale
  const { x, y, alpha } = enemyAnchor(e)
  ctx.save()
  ctx.globalAlpha = alpha
  // тулуб
  ctx.fillStyle = '#4b5a3f'
  ctx.strokeStyle = '#1f2a17'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(x - 21 * s, y - 12 * s, 42 * s, 70 * s, 12 * s)
  ctx.fill()
  ctx.stroke()
  // голова в балаклаві
  ctx.fillStyle = '#1f2937'
  ctx.beginPath()
  ctx.arc(x, y - 28 * s, 15 * s, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f2c38b'
  ctx.beginPath()
  ctx.roundRect(x - 10 * s, y - 34 * s, 20 * s, 8 * s, 3 * s)
  ctx.fill()
  ctx.fillStyle = '#111827'
  if (e.down > 0) {
    // очі «хрестиками»
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 1.5
    for (const ex of [-5, 5]) {
      ctx.beginPath()
      ctx.moveTo(x + (ex - 2.5) * s, y - 32.5 * s)
      ctx.lineTo(x + (ex + 2.5) * s, y - 27.5 * s)
      ctx.moveTo(x + (ex + 2.5) * s, y - 32.5 * s)
      ctx.lineTo(x + (ex - 2.5) * s, y - 27.5 * s)
      ctx.stroke()
    }
  } else {
    ctx.beginPath()
    ctx.arc(x - 5 * s, y - 30 * s, 2 * s, 0, Math.PI * 2)
    ctx.arc(x + 5 * s, y - 30 * s, 2 * s, 0, Math.PI * 2)
    ctx.fill()
  }
  // руки та зброя, націлена на гравця
  ctx.fillStyle = '#4b5a3f'
  ctx.beginPath()
  ctx.roundRect(x - 16 * s, y + 4 * s, 34 * s, 10 * s, 5 * s)
  ctx.fill()
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.roundRect(x - 4 * s, y - 1 * s, 30 * s, 10 * s, 3 * s)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x + 24 * s, y + 4 * s, 6 * s, 0, Math.PI * 2)
  ctx.fill()
  const warn = e.down === 0 && e.t > REACT - 0.6 && Math.floor(t * 12) % 2 === 0
  if (warn || shooting) {
    ctx.fillStyle = shooting ? '#fde047' : '#ef4444'
    ctx.beginPath()
    ctx.arc(x + 24 * s, y + 4 * s, (shooting ? 16 : 4) * s, 0, Math.PI * 2)
    ctx.fill()
  }
  if (e.down > 0) {
    ctx.fillStyle = '#fde047'
    ctx.font = `${Math.round(18 * s)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('💫', x, y - 48 * s)
  }
  ctx.restore()
}

function drawTimer(ctx: CanvasRenderingContext2D, e: Enemy) {
  if (e.down > 0) return
  const s = SPOTS[e.spot]
  const { x, y } = enemyAnchor(e)
  const left = Math.max(0, 1 - e.t / REACT)
  const cy = y - 60 * s.scale
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(15,23,42,0.45)'
  ctx.beginPath()
  ctx.arc(x, cy, 10, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = left > 0.5 ? '#22c55e' : left > 0.25 ? '#f59e0b' : '#ef4444'
  ctx.beginPath()
  ctx.arc(x, cy, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left)
  ctx.stroke()
}

function draw(ctx: CanvasRenderingContext2D, w: World, t: number, dead: boolean) {
  // небо й Анди на горизонті
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y)
  sky.addColorStop(0, '#7dd3fc')
  sky.addColorStop(1, '#fef3c7')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#94a3b8'
  ctx.beginPath()
  ctx.moveTo(0, 110)
  const peaks = [[60, 40], [150, 85], [240, 25], [340, 80], [430, 35], [540, 90], [640, 30], [730, 75], [800, 50]]
  for (const [px, py] of peaks) ctx.lineTo(px, py)
  ctx.lineTo(W, 110)
  ctx.fill()
  ctx.fillStyle = '#f8fafc'
  for (const [px, py] of peaks) {
    if (py > 50) continue
    ctx.beginPath()
    ctx.moveTo(px - 18, py + 18)
    ctx.lineTo(px, py)
    ctx.lineTo(px + 18, py + 18)
    ctx.fill()
  }

  // фасад будинку
  ctx.fillStyle = '#e7c9a0'
  ctx.fillRect(0, 92, W, GROUND_Y - 92)
  ctx.fillStyle = '#c08457'
  ctx.fillRect(0, 86, W, 12)
  ctx.fillRect(0, 222, W, 8)

  // вікна верхнього поверху: відкриті — укриття, решта з віконницями
  for (const [i, s] of SPOTS.entries()) {
    const x0 = s.x - 36
    if (s.kind !== 'window') {
      ctx.fillStyle = '#93c5fd'
      ctx.fillRect(x0, WINDOW_TOP, 72, WINDOW_BOTTOM - WINDOW_TOP)
      ctx.fillStyle = '#15803d'
      ctx.fillRect(x0, WINDOW_TOP, 34, WINDOW_BOTTOM - WINDOW_TOP)
      ctx.fillRect(x0 + 38, WINDOW_TOP, 34, WINDOW_BOTTOM - WINDOW_TOP)
    } else {
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(x0, WINDOW_TOP, 72, WINDOW_BOTTOM - WINDOW_TOP)
      ctx.save()
      ctx.beginPath()
      ctx.rect(x0, WINDOW_TOP, 72, WINDOW_BOTTOM - WINDOW_TOP)
      ctx.clip()
      for (const e of w.enemies) if (e.spot === i) drawEnemy(ctx, e, t, dead && w.shotBy === i)
      ctx.restore()
    }
    ctx.strokeStyle = '#7c4a2a'
    ctx.lineWidth = 4
    ctx.strokeRect(x0, WINDOW_TOP, 72, WINDOW_BOTTOM - WINDOW_TOP)
    ctx.fillStyle = '#7c4a2a'
    ctx.fillRect(x0 - 6, WINDOW_BOTTOM, 84, 6)
  }

  // двері
  const door = SPOTS.findIndex(s => s.kind === 'door')
  const dx = SPOTS[door].x - 36
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(dx, DOOR_TOP, 72, GROUND_Y - DOOR_TOP)
  ctx.save()
  ctx.beginPath()
  ctx.rect(dx, DOOR_TOP, 72, GROUND_Y - DOOR_TOP)
  ctx.clip()
  for (const e of w.enemies) if (e.spot === door) drawEnemy(ctx, e, t, dead && w.shotBy === door)
  ctx.restore()
  ctx.strokeStyle = '#7c4a2a'
  ctx.lineWidth = 5
  ctx.strokeRect(dx, DOOR_TOP, 72, GROUND_Y - DOOR_TOP)

  // тротуар
  ctx.fillStyle = '#a8a29e'
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y)
  ctx.strokeStyle = '#78716c'
  ctx.lineWidth = 1
  for (let x = 0; x < W; x += 50) {
    ctx.beginPath()
    ctx.moveTo(x, GROUND_Y)
    ctx.lineTo(x - 30, H)
    ctx.stroke()
  }

  // терористи за ящиками й бочками, потім самі укриття
  for (const [i, s] of SPOTS.entries()) {
    if (s.kind !== 'crate' && s.kind !== 'barrel') continue
    for (const e of w.enemies) if (e.spot === i) drawEnemy(ctx, e, t, dead && w.shotBy === i)
    if (s.kind === 'crate') {
      ctx.fillStyle = '#b45309'
      ctx.strokeStyle = '#78350f'
      ctx.lineWidth = 3
      ctx.fillRect(s.x - 42, 300, 84, GROUND_Y - 300)
      ctx.strokeRect(s.x - 42, 300, 84, GROUND_Y - 300)
      ctx.beginPath()
      ctx.moveTo(s.x - 42, 300)
      ctx.lineTo(s.x + 42, GROUND_Y)
      ctx.moveTo(s.x + 42, 300)
      ctx.lineTo(s.x - 42, GROUND_Y)
      ctx.stroke()
    } else {
      for (const bx of [s.x - 20, s.x + 20]) {
        ctx.fillStyle = '#2563eb'
        ctx.strokeStyle = '#1e3a8a'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.roundRect(bx - 19, 312, 38, GROUND_Y - 312, 6)
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(bx - 19, 332)
        ctx.lineTo(bx + 19, 332)
        ctx.moveTo(bx - 19, 352)
        ctx.lineTo(bx + 19, 352)
        ctx.stroke()
      }
    }
  }

  for (const h of w.holes) {
    ctx.globalAlpha = Math.min(1, h.life)
    ctx.fillStyle = '#292524'
    ctx.beginPath()
    ctx.arc(h.x, h.y, 3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  for (const e of w.enemies) drawTimer(ctx, e)

  // мішки з піском перед гравцем
  for (let x = -10; x < W + 40; x += 58) {
    ctx.fillStyle = '#c2a36b'
    ctx.strokeStyle = '#7c6a43'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(x, H - 12, 34, 18, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }

  // зброя гравця, повернута на приціл
  const gx = W / 2 + (w.cx - W / 2) * 0.4
  const gy = H - 10
  const a = Math.atan2(w.cy - gy, w.cx - gx)
  ctx.save()
  ctx.translate(gx, gy)
  ctx.rotate(a)
  ctx.fillStyle = '#334155'
  ctx.beginPath()
  ctx.roundRect(-40, -15, 80, 30, 8)
  ctx.fill()
  ctx.fillStyle = '#1e293b'
  ctx.beginPath()
  ctx.roundRect(30, -6, 70, 12, 4)
  ctx.fill()
  if (w.flash > 0) {
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.arc(104, 0, 13, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
  if (w.tracer) {
    ctx.strokeStyle = 'rgba(253,224,71,0.8)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(gx + Math.cos(a) * 104, gy + Math.sin(a) * 104)
    ctx.lineTo(w.tracer.x, w.tracer.y)
    ctx.stroke()
  }

  // приціл
  ctx.strokeStyle = '#0f172a'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(w.cx, w.cy, 18, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(w.cx, w.cy, 18, 0, Math.PI * 2)
  for (const [x1, y1, x2, y2] of [[-26, 0, -10, 0], [10, 0, 26, 0], [0, -26, 0, -10], [0, 10, 0, 26]]) {
    ctx.moveTo(w.cx + x1, w.cy + y1)
    ctx.lineTo(w.cx + x2, w.cy + y2)
  }
  ctx.stroke()
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.arc(w.cx, w.cy, 3, 0, Math.PI * 2)
  ctx.fill()

  // шкала до наступного питання
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.beginPath()
  ctx.roundRect(W / 2 - 100, 12, 200, 10, 5)
  ctx.fill()
  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  ctx.roundRect(W / 2 - 100, 12, Math.max(10, 200 * Math.min(1, w.sinceQuestion / QUESTION_EVERY)), 10, 5)
  ctx.fill()
  ctx.fillStyle = '#7c2d12'
  ctx.font = 'bold 11px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('до питання', W / 2, 36)

  if (dead) {
    ctx.fillStyle = 'rgba(220,38,38,0.3)'
    ctx.fillRect(0, 0, W, H)
  }
}

const MOVE_KEYS: Record<string, keyof Keys> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right'
}

const formatTime = (seconds: number) => {
  const s = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function AndesOperationGame({ pool, sectionTitle, backHref }: { pool: GameQuestion[]; sectionTitle: string; backHref: string }) {
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
    queueRef.current = pickQuestions(pool, TOTAL_QUESTIONS)
    keysRef.current = noKeys()
    setActive(null)
    setChosen(null)
    setHud({ time: START_TIME, left: queueRef.current.length, kills: 0 })
    setPhase('playing')
  }

  const fire = () => {
    if (phaseRef.current === 'playing' && worldRef.current) worldRef.current.firePressed = true
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
        draw(ctx, w, now / 1000, phaseRef.current === 'dead')
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  // клавіатура: стрілки — рух прицілу, пробіл — один постріл на кожне натискання
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'playing') return
      if (e.code === 'Space') {
        e.preventDefault()
        if (e.type === 'keydown' && !e.repeat) fire()
        return
      }
      const name = MOVE_KEYS[e.code]
      if (!name) return
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
    // після питання вулиця чиста: гравець не програє через паузу
    w.enemies = []
    w.spawnIn = 1
    w.lastSpot = SPOTS.reduce((best, s, i) => (Math.abs(s.x - w.cx) < Math.abs(SPOTS[best].x - w.cx) ? i : best), 0)
    w.sinceQuestion = 0
    keysRef.current = noKeys()
    setPhase('playing')
  }

  const moveButton = (name: keyof Keys, label: string, aria: string) => {
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
        className="h-14 w-14 select-none touch-none rounded-2xl border border-orange-200 bg-white text-2xl font-bold text-orange-700 shadow-sm active:bg-orange-100"
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
      <div className="mt-2 text-sm font-bold text-orange-700">{sectionTitle}</div>
      <h1 className="text-2xl font-bold mb-4">🎯 Гра «Операція „Анди“»</h1>

      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-sm font-bold">
        <div className={`rounded-xl border bg-white py-2 ${hud.time < 60 ? 'border-red-200 text-red-600' : 'border-gray-100 text-gray-800'}`}>
          ⏱ {formatTime(hud.time)}
        </div>
        <div className="rounded-xl border border-gray-100 bg-white py-2 text-gray-800">
          ❓ {answeredCount} / {total}
        </div>
        <div className="rounded-xl border border-gray-100 bg-white py-2 text-gray-800">🎯 {hud.kills}</div>
      </div>

      <canvas ref={canvasRef} className="block w-full rounded-2xl border border-gray-100 shadow-sm" style={{ aspectRatio: `${W} / ${H}` }} />

      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-2">
          {moveButton('left', '←', 'Приціл ліворуч')}
          {moveButton('right', '→', 'Приціл праворуч')}
        </div>
        <div className="hidden text-center text-xs text-gray-400 sm:block">Стрілки ← → — приціл, пробіл — постріл</div>
        <button
          type="button"
          aria-label="Постріл"
          onPointerDown={fire}
          onContextMenu={e => e.preventDefault()}
          className="h-14 w-28 select-none touch-none rounded-2xl border border-orange-200 bg-white text-2xl font-bold text-orange-700 shadow-sm active:bg-orange-100"
        >
          🔫
        </button>
      </div>

      {phase !== 'playing' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            {phase === 'intro' && (
              <>
                <div className="text-4xl mb-2">🎯</div>
                <h2 className="text-xl font-bold mb-3">Операція «Анди»</h2>
                <ul className="mb-5 flex flex-col gap-2 text-sm text-gray-600">
                  <li>🛡 Ти — боєць спецзагону. Терористи визирають з вікон, дверей і з-за ящиків.</li>
                  <li>🎯 Наводь приціл стрілками ← → і стріляй пробілом. Над кожним терористом — таймер: встигни влучити, поки він не вистрілив.</li>
                  <li>💥 Якщо терорист вистрілить першим — гра почнеться спочатку.</li>
                  <li>⏱ Маєш 5 хвилин. Кожні 30 секунд — питання з теми. ✅ Правильна відповідь: +30 секунд, ❌ неправильна: −30 секунд.</li>
                  <li>🏆 Дай правильну відповідь на всі {total} питань — і операцію виконано! Якщо час закінчиться — гра почнеться спочатку.</li>
                </ul>
                <button onClick={startGame} className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600">
                  Почати гру
                </button>
              </>
            )}

            {phase === 'question' && active && (
              <>
                <div className="mb-1 text-xs font-bold uppercase tracking-wide text-orange-700">
                  Питання {Math.min(answeredCount + (chosen === null ? 1 : isCorrect ? 0 : 1), total)} з {total} · § {active.question.paragraph}
                </div>
                <h2 className="text-lg font-bold mb-4">{active.question.text}</h2>
                <div className="flex flex-col gap-2">
                  {active.options.map((option, i) => {
                    const state =
                      chosen === null
                        ? 'border-gray-200 hover:border-orange-400 hover:bg-orange-50'
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
                    <button onClick={continueGame} className="mt-4 w-full rounded-xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600">
                      Далі →
                    </button>
                  </div>
                )}
              </>
            )}

            {(phase === 'dead' || phase === 'timeout') && (
              <>
                <div className="text-4xl mb-2">{phase === 'dead' ? '💥' : '⏰'}</div>
                <h2 className="text-xl font-bold mb-2">{phase === 'dead' ? 'Терорист вистрілив першим!' : 'Час вийшов'}</h2>
                <p className="mb-5 text-sm text-gray-600">
                  Ти встиг відповісти на {answeredCount} з {total} питань і знешкодив {hud.kills} терористів. Гра починається спочатку — цього разу все вийде!
                </p>
                <button onClick={startGame} className="w-full rounded-xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600">
                  Почати спочатку
                </button>
              </>
            )}

            {phase === 'won' && (
              <>
                <div className="text-4xl mb-2">🏆</div>
                <h2 className="text-xl font-bold mb-2">Операцію виконано!</h2>
                <p className="mb-5 text-sm text-gray-600">
                  Ти відповів на всі {total} питань теми й знешкодив {hud.kills} терористів. Південна Америка в безпеці!
                </p>
                <div className="flex gap-2">
                  <button onClick={startGame} className="flex-1 rounded-xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600">
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
