'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

interface WordItem {
  word: string
  translation: string
}

type Step = 'input' | 'review' | 'train'

const STORAGE_KEY = 'validation:dictation:words'
const MAX_IMAGE_SIDE = 2000

// Порівнюємо без урахування регістру, зайвих пробілів, різних апострофів та кінцевої пунктуації
function normalize(value: string): string {
  return value
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’ʼ‘`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?,;:]+$/, '')
}

function isCorrect(answer: string, item: WordItem): boolean {
  return normalize(answer) === normalize(item.word)
}

function shuffle<T>(list: T[]): T[] {
  const result = [...list]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Зменшуємо фото з телефону перед відправкою, щоб не ганяти мегабайти
async function shrinkImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return blob ?? file
  } catch {
    return file
  }
}

function mergeItems(current: WordItem[], incoming: WordItem[]): WordItem[] {
  const seen = new Set(current.map(i => normalize(i.word)))
  const merged = [...current]
  for (const item of incoming) {
    if (seen.has(normalize(item.word))) continue
    seen.add(normalize(item.word))
    merged.push(item)
  }
  return merged
}

export function DictationClient() {
  const [step, setStep] = useState<Step>('input')
  const [items, setItems] = useState<WordItem[]>([])
  const [savedDismissed, setSavedDismissed] = useState(false)
  // Збережений список читаємо лише на клієнті, щоб не зламати гідратацію
  const savedRaw = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return localStorage.getItem(STORAGE_KEY)
      } catch {
        return null
      }
    },
    () => null
  )
  const savedItems = useMemo<WordItem[]>(() => {
    if (savedDismissed || !savedRaw) return []
    try {
      return JSON.parse(savedRaw)
    } catch {
      return []
    }
  }, [savedRaw, savedDismissed])

  const saveItems = (next: WordItem[]) => {
    setItems(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {}
  }

  if (step === 'input') {
    return (
      <InputStep
        existingCount={items.length}
        savedItems={items.length === 0 ? savedItems : []}
        onRestore={() => {
          setItems(savedItems)
          setStep('review')
        }}
        onParsed={incoming => {
          saveItems(mergeItems(items, incoming))
          setStep('review')
        }}
        onBack={items.length > 0 ? () => setStep('review') : undefined}
      />
    )
  }

  if (step === 'review') {
    return (
      <ReviewStep
        items={items}
        onChange={saveItems}
        onAddMore={() => setStep('input')}
        onReset={() => {
          saveItems([])
          setSavedDismissed(true)
          setStep('input')
        }}
        onStart={() => setStep('train')}
      />
    )
  }

  return <TrainStep items={items} onExit={() => setStep('review')} />
}

/* ---------- Крок 1: фото або текст ---------- */

function InputStep({
  existingCount,
  savedItems,
  onRestore,
  onParsed,
  onBack
}: {
  existingCount: number
  savedItems: WordItem[]
  onRestore: () => void
  onParsed: (items: WordItem[]) => void
  onBack?: () => void
}) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const previews = useMemo(() => files.map(f => URL.createObjectURL(f)), [files])
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews])

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('text', text)
      for (const file of files) {
        formData.append('images', await shrinkImage(file), file.name)
      }
      const res = await fetch('/api/dictation/parse', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Помилка обробки')
      onParsed(data.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка обробки')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {savedItems.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <span className="text-sm text-blue-800">У вас є збережений список: {savedItems.length} слів</span>
          <button
            onClick={onRestore}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
          >
            Відкрити
          </button>
        </div>
      )}

      {existingCount > 0 && (
        <p className="text-sm text-gray-500">Нові слова буде додано до поточного списку ({existingCount} слів).</p>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold mb-3">📷 Фото зі словами</h2>
        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-6 cursor-pointer hover:bg-gray-50">
          <span className="text-sm text-gray-600">Натисніть, щоб вибрати або сфотографувати (до 5 фото)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => setFiles(Array.from(e.target.files ?? []).slice(0, 5))}
          />
        </label>
        {files.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <div key={src} className="relative">
                <img src={src} alt={files[i].name} className="h-20 w-20 rounded-lg object-cover border border-gray-200" />
                <button
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border border-gray-200 text-xs text-red-500"
                  title="Прибрати фото"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold mb-3">⌨️ Або вставте слова</h2>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={6}
          placeholder={'apple\nto borrow\nneighbourhood'}
          className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        {onBack && (
          <button onClick={onBack} className="px-5 py-3 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">
            ← До списку
          </button>
        )}
        <button
          onClick={submit}
          disabled={loading || (!text.trim() && files.length === 0)}
          className="flex-1 px-5 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Розпізнаємо та перекладаємо…' : 'Розпізнати та перекласти'}
        </button>
      </div>
    </div>
  )
}

/* ---------- Крок 2: перевірка списку ---------- */

function ReviewStep({
  items,
  onChange,
  onAddMore,
  onReset,
  onStart
}: {
  items: WordItem[]
  onChange: (items: WordItem[]) => void
  onAddMore: () => void
  onReset: () => void
  onStart: () => void
}) {
  const update = (index: number, patch: Partial<WordItem>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))

  const valid = items.filter(i => i.word.trim() && i.translation.trim())

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Перевірте слова ({items.length})</h2>
          <span className="text-xs text-gray-400">Можна виправити слово чи переклад</span>
        </div>
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 text-right text-xs text-gray-400">{i + 1}</span>
              <input
                value={item.word}
                onChange={e => update(i, { word: e.target.value })}
                className="flex-1 min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="Слово"
              />
              <input
                value={item.translation}
                onChange={e => update(i, { translation: e.target.value })}
                className="flex-1 min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="Переклад"
              />
              <button
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                title="Видалити"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => onChange([...items, { word: '', translation: '' }])}
          className="mt-3 text-sm font-semibold text-blue-600 hover:underline"
        >
          + Додати рядок
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={onReset} className="px-5 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50">
          Новий список
        </button>
        <button onClick={onAddMore} className="px-5 py-3 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50">
          + Ще слова з фото/тексту
        </button>
        <button
          onClick={() => {
            onChange(valid)
            onStart()
          }}
          disabled={valid.length === 0}
          className="flex-1 px-5 py-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Почати тренування →
        </button>
      </div>
    </div>
  )
}

/* ---------- Крок 3: тренування ---------- */

interface Feedback {
  correct: boolean
  expected: string
}

interface RoundSummary {
  errors: number
}

function TrainStep({ items, onExit }: { items: WordItem[]; onExit: () => void }) {
  const [round, setRound] = useState(1)
  const [order, setOrder] = useState(() => shuffle(items.map((_, i) => i)))
  const [position, setPosition] = useState(0)
  const [roundErrors, setRoundErrors] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [summary, setSummary] = useState<RoundSummary | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const continueRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (feedback || summary) continueRef.current?.focus()
    else inputRef.current?.focus()
  }, [feedback, summary, position])

  const item = items[order[position]]

  const check = () => {
    if (!answer.trim()) return
    const correct = isCorrect(answer, item)
    if (!correct) setRoundErrors(e => e + 1)
    setFeedback({ correct, expected: item.word })
  }

  const next = () => {
    setFeedback(null)
    setAnswer('')
    if (position + 1 < order.length) {
      setPosition(position + 1)
      return
    }
    // Кінець раунду: тренування завершується лише раундом без жодної помилки
    setSummary({ errors: roundErrors })
  }

  const startNextRound = () => {
    setRound(r => r + 1)
    setOrder(shuffle(items.map((_, i) => i)))
    setPosition(0)
    setRoundErrors(0)
    setSummary(null)
  }

  if (summary) {
    const done = summary.errors === 0
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center flex flex-col items-center gap-4">
        <div className="text-5xl">{done ? '🏆' : '💪'}</div>
        <h2 className="text-xl font-bold">
          {done ? 'Готово до диктанту!' : `Раунд ${round}: помилок — ${summary.errors}`}
        </h2>
        <p className="text-sm text-gray-500 max-w-md">
          {done
            ? 'Ви написали всі слова без жодної помилки.'
            : 'Тренування закінчується лише тоді, коли всі слова написано без жодної помилки. Ще раунд — у новому порядку.'}
        </p>
        <div className="flex gap-3">
          <button onClick={onExit} className="px-5 py-3 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">
            До списку слів
          </button>
          {!done && (
            <button
              ref={continueRef}
              onClick={startNextRound}
              className="px-5 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
            >
              Наступний раунд
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span className="font-semibold text-gray-700">Напишіть слово мовою оригіналу</span>
        <button onClick={onExit} className="hover:text-gray-800">Вийти</button>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>Раунд {round} · {position + 1} / {order.length}</span>
        <span className={roundErrors > 0 ? 'text-red-500' : ''}>Помилок у раунді: {roundErrors}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all"
          style={{ width: `${((position + (feedback ? 1 : 0)) / order.length) * 100}%` }}
        />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-8 flex flex-col items-center gap-6">
        <div className="text-3xl font-bold text-center break-words">{item.translation}</div>

        <form
          className="w-full max-w-md flex flex-col gap-3"
          onSubmit={e => {
            e.preventDefault()
            if (feedback) next()
            else check()
          }}
        >
          <input
            ref={inputRef}
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            disabled={!!feedback}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Напишіть слово"
            className={`w-full rounded-xl border-2 px-4 py-3 text-lg text-center focus:outline-none ${
              feedback
                ? feedback.correct
                  ? 'border-emerald-400 bg-emerald-50'
                  : 'border-red-400 bg-red-50'
                : 'border-gray-200 focus:border-blue-400'
            }`}
          />

          {feedback && (
            <div className={`text-center text-sm ${feedback.correct ? 'text-emerald-700' : 'text-red-700'}`}>
              {feedback.correct ? (
                '✅ Правильно!'
              ) : (
                <>
                  ❌ Правильно: <span className="font-bold">{feedback.expected}</span>
                </>
              )}
            </div>
          )}

          {feedback ? (
            <button
              ref={continueRef}
              type="submit"
              className="px-5 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700"
            >
              Далі (Enter)
            </button>
          ) : (
            <button
              type="submit"
              disabled={!answer.trim()}
              className="px-5 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Перевірити
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
