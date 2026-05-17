'use client'

import { useState } from 'react'
import { Quiz } from './Quiz'

interface Props {
  lessonId: string
  questions: Parameters<typeof Quiz>[0]['questions']
}

export function LessonQuiz({ lessonId, questions }: Props) {
  const [done, setDone]       = useState(false)
  const [score, setScore]     = useState(0)
  const [saving, setSaving]   = useState(false)
  const [attempt, setAttempt] = useState(0)

  async function handleComplete(finalScore: number) {
    setScore(finalScore)
    setDone(true)
    setSaving(true)

    // Відправляємо результат на наш API
    try {
      await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          score: finalScore,
          total: questions.length,
        }),
      })
    } catch (e) {
      console.error('Не вдалось зберегти результат', e)
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
        <div className="text-5xl mb-3">
          {pct === 100 ? '🏆' : pct >= 70 ? '🎉' : '📚'}
        </div>
        <h2 className="text-xl font-bold mb-1">
          {pct === 100 ? 'Ідеально!' : pct >= 70 ? 'Чудово!' : 'Спробуй ще раз'}
        </h2>
        <p className="text-gray-500 mb-2">
          {score} з {questions.length} правильних · {pct}%
        </p>
        {saving && (
          <p className="text-xs text-gray-400 mb-4">Зберігаємо результат...</p>
        )}
        <button
          onClick={() => { setDone(false); setScore(0); setAttempt(a => a + 1) }}
          className="px-6 py-2.5 rounded-xl bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900"
        >
          Пройти ще раз
        </button>
      </div>
    )
  }

  return <Quiz key={attempt} questions={questions} onComplete={handleComplete} />
}
