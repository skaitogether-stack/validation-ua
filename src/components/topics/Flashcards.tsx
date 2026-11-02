'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Flashcard } from '../../data/topics'

function shuffle<T>(list: T[]): T[] {
  const result = [...list]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Картки, позначені «Ще раз», повертаються в кінець черги — доки всі не стануть «Знаю»
export function Flashcards({
  cards,
  onFinish,
  onTest
}: {
  cards: Flashcard[]
  onFinish: () => void
  onTest: () => void
}) {
  const [queue, setQueue] = useState<Flashcard[]>(() => shuffle(cards))
  const [flipped, setFlipped] = useState(false)
  const [reverse, setReverse] = useState(false) // спершу показувати визначення
  const [repeats, setRepeats] = useState(0)

  const card = queue[0]
  const known = cards.length - queue.length

  const restart = () => {
    setQueue(shuffle(cards))
    setFlipped(false)
    setRepeats(0)
  }

  const answer = useCallback(
    (knows: boolean) => {
      if (!card) return
      const rest = queue.slice(1)
      const next = knows ? rest : [...rest, card]
      setQueue(next)
      setFlipped(false)
      if (!knows) setRepeats(r => r + 1)
      if (next.length === 0) onFinish()
    },
    [card, queue, onFinish]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card) return
      if (e.code === 'Space') {
        e.preventDefault()
        setFlipped(f => !f)
      } else if (flipped && e.key === 'ArrowRight') answer(true)
      else if (flipped && e.key === 'ArrowLeft') answer(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [card, flipped, answer])

  if (!card) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <div className="text-5xl mb-3">🎉</div>
        <div className="text-xl font-bold text-gray-900">Усі {cards.length} карток вивчено!</div>
        <div className="mt-1 text-sm text-gray-500">
          {repeats === 0 ? 'Без жодного повторення — чудово.' : `Повторень знадобилося: ${repeats}.`}
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onTest}
            className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm"
          >
            Перевірити себе тестом
          </button>
          <button
            onClick={restart}
            className="px-5 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm"
          >
            Повторити ще раз
          </button>
        </div>
      </div>
    )
  }

  const front = reverse ? card.definition : card.term
  const back = reverse ? card.term : card.definition

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          Вивчено {known} з {cards.length}
        </span>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={reverse}
            onChange={e => {
              setReverse(e.target.checked)
              setFlipped(false)
            }}
          />
          Спершу визначення
        </label>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(known / cards.length) * 100}%` }} />
      </div>

      <button
        onClick={() => setFlipped(f => !f)}
        className="perspective-distant w-full text-left"
        aria-label={flipped ? 'Показати лицьовий бік' : 'Перевернути картку'}
      >
        {/* key змінюється з кожною відповіддю: нова картка з’являється без анімації повороту назад */}
        <div
          key={`${known}-${repeats}`}
          className={`grid transform-3d transition-transform duration-500 ${flipped ? 'rotate-y-180' : ''}`}
        >
          <div className="[grid-area:1/1] backface-hidden min-h-56 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm flex flex-col items-center justify-center text-center">
            <div className={`${reverse ? 'text-lg' : 'text-2xl font-bold'} text-gray-900`}>{front}</div>
            <div className="mt-4 text-xs text-gray-400">Натисніть або пробіл, щоб перевернути</div>
          </div>
          <div className="[grid-area:1/1] backface-hidden rotate-y-180 min-h-56 rounded-2xl border border-emerald-100 bg-emerald-50 p-8 shadow-sm flex flex-col items-center justify-center text-center">
            <div className={`${reverse ? 'text-2xl font-bold' : 'text-lg'} text-gray-900`}>{back}</div>
          </div>
        </div>
      </button>

      {flipped ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => answer(false)}
            className="py-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-sm"
          >
            ← Ще раз
          </button>
          <button
            onClick={() => answer(true)}
            className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm"
          >
            Знаю →
          </button>
        </div>
      ) : (
        <div className="text-center text-sm text-gray-400 py-3">Спершу пригадайте відповідь, потім переверніть картку</div>
      )}
    </div>
  )
}
