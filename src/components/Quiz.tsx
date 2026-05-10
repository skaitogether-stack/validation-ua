'use client'

import { useState } from 'react'  // useState зберігає стан між рендерами

// Типи питань
interface Question {
  id: string
  text: string
  options: string[]
  correct: number   // індекс правильної відповіді
  explanation: string
}

interface QuizProps {
  questions: Question[]
  onComplete: (score: number) => void  // викликається після останнього питання
}

export function Quiz({ questions, onComplete }: QuizProps) {
  // useState — головний хук React
  // [значення, функція_що_змінює_значення] = useState(початкове_значення)
  const [current, setCurrent]   = useState(0)      // поточний індекс питання
  const [selected, setSelected] = useState<number | null>(null)  // вибрана відповідь
  const [answered, setAnswered] = useState(false)  // чи перевірили вже
  const [score, setScore]       = useState(0)      // кількість правильних

  const question = questions[current]  // поточне питання
  const isLast   = current === questions.length - 1

  function handleSelect(index: number) {
    if (answered) return  // після перевірки не можна змінити
    setSelected(index)
  }

  function handleCheck() {
    if (selected === null) return
    setAnswered(true)
    if (selected === question.correct) {
      setScore(s => s + 1)  // s => s + 1 — функціональне оновлення
    }
  }

  function handleNext() {
    if (isLast) {
      // Передаємо фінальний рахунок батьківському компоненту
      onComplete(score + (selected === question.correct ? 1 : 0))
    } else {
      // Скидаємо стан для наступного питання
      setCurrent(c => c + 1)
      setSelected(null)
      setAnswered(false)
    }
  }

  // Визначаємо клас кнопки по її стану
  function optionClass(index: number): string {
    const base = 'w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all '
    if (!answered) {
      return base + (selected === index
        ? 'border-blue-400 bg-blue-50'
        : 'border-gray-200 hover:border-gray-300 bg-white')
    }
    if (index === question.correct) return base + 'border-green-400 bg-green-50 text-green-800'
    if (index === selected)         return base + 'border-red-400 bg-red-50 text-red-800'
    return base + 'border-gray-100 bg-gray-50 text-gray-400'
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">

      {/* Прогрес */}
      <div className="flex justify-between text-xs text-gray-400 mb-3">
        <span>Питання {current + 1} з {questions.length}</span>
        <span>{score} правильних</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-blue-400 rounded-full transition-all duration-500"
          style={{ width: `${((current) / questions.length) * 100}%` }}
        />
      </div>

      {/* Питання */}
      <p className="font-semibold text-gray-800 mb-4 leading-relaxed">
        {question.text}
      </p>

      {/* Варіанти */}
      <div className="flex flex-col gap-2 mb-4">
        {question.options.map((option, i) => (
          <button
            key={i}
            className={optionClass(i)}
            onClick={() => handleSelect(i)}
          >
            <span className="text-gray-400 mr-2">{'АБВГ'[i]}.</span>
            {option}
          </button>
        ))}
      </div>

      {/* Пояснення після відповіді */}
      {answered && (
        <div className={`rounded-xl p-4 mb-4 text-sm ${
          selected === question.correct
            ? 'bg-green-50 text-green-800'
            : 'bg-red-50 text-red-800'
        }`}>
          {selected === question.correct ? '✅ ' : '💡 '}
          {question.explanation}
        </div>
      )}

      {/* Кнопки */}
      {!answered ? (
        <button
          onClick={handleCheck}
          disabled={selected === null}
          className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold
                     disabled:opacity-30 disabled:cursor-not-allowed
                     hover:bg-blue-600 transition-colors"
        >
          Перевірити
        </button>
      ) : (
        <button
          onClick={handleNext}
          className="w-full py-3 rounded-xl bg-gray-800 text-white font-semibold
                     hover:bg-gray-900 transition-colors"
        >
          {isLast ? 'Завершити тест →' : 'Далі →'}
        </button>
      )}
    </div>
  )
}
