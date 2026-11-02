'use client'

import { useState } from 'react'
import type { TestQuestion } from '../../data/biology'

const PASS_SCORE = 80

function shuffle<T>(list: T[]): T[] {
  const result = [...list]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Перемішуємо питання й варіанти, перераховуючи індекс правильної відповіді
function prepare(questions: TestQuestion[]): TestQuestion[] {
  return shuffle(questions).map(q => {
    const options = shuffle(q.options)
    return { ...q, options, correct: options.indexOf(q.options[q.correct]) }
  })
}

export function BiologyTest({
  questions,
  onFinish,
  onFlashcards
}: {
  questions: TestQuestion[]
  onFinish: (score: number) => void
  onFlashcards: () => void
}) {
  const [items, setItems] = useState(() => prepare(questions))
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<number[]>([]) // обрані варіанти по кожному питанню
  const [finished, setFinished] = useState(false)

  const question = items[current]
  const answered = answers.length > current
  const correctCount = answers.filter((a, i) => a === items[i].correct).length

  const check = () => {
    if (selected === null) return
    setAnswers([...answers, selected])
  }

  const next = () => {
    if (current === items.length - 1) {
      setFinished(true)
      onFinish(Math.round((correctCount / items.length) * 100))
      return
    }
    setCurrent(c => c + 1)
    setSelected(null)
  }

  const restart = () => {
    setItems(prepare(questions))
    setCurrent(0)
    setSelected(null)
    setAnswers([])
    setFinished(false)
  }

  if (finished) {
    const score = Math.round((correctCount / items.length) * 100)
    const mistakes = items.map((q, i) => ({ q, answer: answers[i] })).filter(({ q, answer }) => answer !== q.correct)
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="text-5xl mb-3">{score >= PASS_SCORE ? '🏆' : '📚'}</div>
          <div className="text-3xl font-black text-gray-900">{score}%</div>
          <div className="mt-1 text-sm text-gray-500">
            Правильно {correctCount} з {items.length}.{' '}
            {score >= PASS_SCORE ? 'Тему засвоєно!' : 'Повторіть флешкарти й спробуйте ще раз.'}
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={restart}
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm"
            >
              Пройти ще раз
            </button>
            {score < PASS_SCORE && (
              <button
                onClick={onFlashcards}
                className="px-5 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm"
              >
                До флешкарт
              </button>
            )}
          </div>
        </div>

        {mistakes.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="font-bold text-gray-900 mb-3">Помилки</div>
            <div className="flex flex-col gap-4">
              {mistakes.map(({ q, answer }) => (
                <div key={q.text} className="text-sm">
                  <div className="font-semibold text-gray-800">{q.text}</div>
                  <div className="text-red-600">Ваша відповідь: {q.options[answer]}</div>
                  <div className="text-emerald-700">Правильно: {q.options[q.correct]}</div>
                  <div className="text-gray-500">{q.explanation}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const optionClass = (index: number) => {
    const base = 'w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all '
    if (!answered) {
      return base + (selected === index ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white hover:border-gray-300')
    }
    if (index === question.correct) return base + 'border-emerald-500 bg-emerald-50 text-emerald-900'
    if (index === selected) return base + 'border-red-400 bg-red-50 text-red-900'
    return base + 'border-gray-100 bg-white text-gray-400'
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          Питання {current + 1} з {items.length}
        </span>
        <span>Правильно: {correctCount}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${(answers.length / items.length) * 100}%` }}
        />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="text-lg font-bold text-gray-900 mb-4">{question.text}</div>
        <div className="flex flex-col gap-2">
          {question.options.map((option, index) => (
            <button key={option} onClick={() => !answered && setSelected(index)} className={optionClass(index)}>
              {option}
            </button>
          ))}
        </div>

        {answered && (
          <div
            className={`mt-4 rounded-xl p-4 text-sm ${
              selected === question.correct ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'
            }`}
          >
            <span className="font-bold">{selected === question.correct ? '✅ Правильно! ' : '❌ Неправильно. '}</span>
            {question.explanation}
          </div>
        )}
      </div>

      {answered ? (
        <button onClick={next} className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm">
          {current === items.length - 1 ? 'Завершити тест' : 'Наступне питання →'}
        </button>
      ) : (
        <button
          onClick={check}
          disabled={selected === null}
          className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm disabled:opacity-40"
        >
          Перевірити
        </button>
      )}
    </div>
  )
}
