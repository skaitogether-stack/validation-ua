'use client'

import { useEffect, useState, type ReactNode } from 'react'

// Спільні елементи інтерфейсу гри «Мафія»

export function Btn({
  children,
  onClick,
  disabled,
  variant = 'primary',
  className = ''
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'ghost' | 'night'
  className?: string
}) {
  const styles = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300',
    night: 'bg-amber-400 text-indigo-950 hover:bg-amber-300 disabled:bg-amber-200/50 disabled:text-indigo-900/50',
    secondary: 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 disabled:text-gray-400',
    ghost: 'bg-transparent text-current hover:bg-black/5 disabled:opacity-40'
  }[variant]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-12 w-full rounded-2xl px-5 py-3 text-base font-bold transition-colors disabled:cursor-not-allowed ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

// Нічні екрани — темні, денні — світлі
export function Screen({ night, children }: { night?: boolean; children: ReactNode }) {
  return (
    <div
      className={`min-h-[calc(100dvh-8rem)] rounded-3xl p-5 sm:p-7 ${
        night ? 'bg-indigo-950 text-indigo-50' : 'bg-white text-gray-900 border border-gray-100 shadow-sm'
      }`}
    >
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  )
}

export function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="text-center">
      <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">{children}</h2>
      {sub && <p className="mt-2 text-base opacity-80">{sub}</p>}
    </div>
  )
}

// Відлік часу: зберігаємо момент завершення, тож рендери й паузи його не збивають
export function useCountdown(initial: number, autoStart = false) {
  const [endAt, setEndAt] = useState<number | null>(() => (autoStart ? Date.now() + initial * 1000 : null))
  const [pausedLeft, setPausedLeft] = useState(initial)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (endAt === null) return
    const id = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t >= endAt) window.clearInterval(id)
    }, 250)
    return () => window.clearInterval(id)
  }, [endAt])

  const left = endAt === null ? pausedLeft : Math.max(0, Math.ceil((endAt - now) / 1000))

  return {
    left,
    running: endAt !== null && left > 0,
    start: (from: number = left) => {
      const t = Date.now()
      setNow(t)
      setEndAt(t + from * 1000)
    },
    pause: () => {
      setPausedLeft(left)
      setEndAt(null)
    },
    reset: (s: number = initial) => {
      setEndAt(null)
      setPausedLeft(s)
    },
    add: (s: number) => {
      if (endAt === null) setPausedLeft(l => l + s)
      else setEndAt(Math.max(Date.now(), endAt) + s * 1000)
    }
  }
}

export function formatTime(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

// Таймер з кнопкою старт/пауза (останнє слово, промови)
export function SpeechTimer({ seconds, label, night }: { seconds: number; label: string; night?: boolean }) {
  const timer = useCountdown(seconds)
  const { left, running } = timer
  const done = left === 0
  return (
    <div className={`rounded-2xl p-4 text-center ${night ? 'bg-white/10' : 'bg-gray-50'}`}>
      <div className="text-sm font-semibold opacity-70">{label}</div>
      <div className={`text-4xl font-extrabold tabular-nums ${done ? 'text-rose-500' : ''}`}>{formatTime(left)}</div>
      <div className="mt-2 flex gap-2 justify-center">
        <button
          type="button"
          className="rounded-xl px-4 py-2 text-sm font-bold bg-black/5 hover:bg-black/10"
          onClick={() => {
            if (done) timer.start(seconds)
            else if (running) timer.pause()
            else timer.start()
          }}
        >
          {done ? '↺ Ще раз' : running ? '⏸ Пауза' : '▶ Старт'}
        </button>
      </div>
    </div>
  )
}

// Екран «Передай телефон гравцю …»: вміст показується лише після підтвердження
export function PassGate({
  name,
  hint,
  night,
  children
}: {
  name: string
  hint?: string
  night?: boolean
  children: ReactNode
}) {
  const [ready, setReady] = useState(false)
  if (ready) return <>{children}</>
  return (
    <Screen night={night}>
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <div className="text-6xl">📱</div>
        <div>
          <div className="text-lg opacity-80">Передай телефон гравцю</div>
          <div className="mt-1 text-4xl font-extrabold break-words">{name}</div>
        </div>
        {hint && <p className="max-w-xs text-sm opacity-70">{hint}</p>}
        <Btn variant={night ? 'night' : 'primary'} onClick={() => setReady(true)}>
          Я — {name}
        </Btn>
      </div>
    </Screen>
  )
}

// Роль видно лише поки палець утримує кнопку
export function HoldToReveal({ onSeen, children }: { onSeen: () => void; children: ReactNode }) {
  const [holding, setHolding] = useState(false)
  const show = () => {
    setHolding(true)
    onSeen()
  }
  const hide = () => setHolding(false)
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className={`w-full min-h-72 rounded-3xl border-2 p-5 flex items-center justify-center text-center transition-colors ${
          holding ? 'border-amber-300 bg-white/10' : 'border-dashed border-white/30'
        }`}
        aria-live="polite"
      >
        {holding ? children : <span className="text-lg opacity-70">🙈 Роль прихована</span>}
      </div>
      <button
        type="button"
        onPointerDown={e => {
          e.preventDefault()
          // Захоплюємо вказівник: навіть якщо картка змінить висоту й кнопка зсунеться,
          // роль ховається лише коли палець відпустять
          e.currentTarget.setPointerCapture(e.pointerId)
          show()
        }}
        onPointerUp={hide}
        onPointerCancel={hide}
        onLostPointerCapture={hide}
        onContextMenu={e => e.preventDefault()}
        onKeyDown={e => {
          if (e.key === ' ' || e.key === 'Enter') show()
        }}
        onKeyUp={hide}
        onBlur={hide}
        className="min-h-14 w-full select-none touch-none rounded-2xl bg-amber-400 px-5 py-3 text-base font-bold text-indigo-950 active:bg-amber-300"
        style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
      >
        {holding ? 'Відпусти, щоб сховати' : 'Утримуй, щоб побачити роль'}
      </button>
    </div>
  )
}

export interface PickOption {
  id: string
  label: string
  disabled?: boolean
  note?: string
}

export function Picker({
  options,
  value,
  onChange,
  night
}: {
  options: PickOption[]
  value: string | null
  onChange: (id: string) => void
  night?: boolean
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map(o => {
        const selected = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            disabled={o.disabled}
            onClick={() => onChange(o.id)}
            className={`min-h-14 rounded-2xl border-2 px-3 py-2 text-left font-bold transition-colors disabled:cursor-not-allowed ${selected ? '' : 'disabled:opacity-40'} ${
              selected
                ? night
                  ? 'border-amber-300 bg-amber-300 text-indigo-950'
                  : 'border-indigo-600 bg-indigo-600 text-white'
                : night
                  ? 'border-white/20 hover:border-white/50'
                  : 'border-gray-200 hover:border-indigo-300'
            }`}
          >
            <div className="break-words">{o.label}</div>
            {o.note && <div className="text-xs font-normal opacity-80">{o.note}</div>}
          </button>
        )
      })}
    </div>
  )
}

// Озвучування ведучого, лише якщо в браузері є український голос
export function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const voice = window.speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith('uk'))
  if (!voice) return
  const u = new SpeechSynthesisUtterance(text.replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, ''))
  u.voice = voice
  u.lang = voice.lang
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

export function hasUkrainianVoice(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
  return window.speechSynthesis.getVoices().some(v => v.lang.toLowerCase().startsWith('uk'))
}
