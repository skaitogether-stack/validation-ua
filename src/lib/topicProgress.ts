'use client'

import { useMemo, useSyncExternalStore } from 'react'

// Прогрес у предметах за параграфами (біологія, географія) зберігаємо в браузері: контент статичний.
// Кожен предмет має свій ключ, бо id тем (p17, p18…) у предметах повторюються.

export interface TopicProgress {
  flashcardsDone?: boolean
  bestScore?: number // найкращий результат тесту, %
}

const CHANGE_EVENT = 'topic-progress-change'

const storageKey = (progressKey: string) => `${progressKey}-progress`

function readRaw(progressKey: string): string {
  try {
    return localStorage.getItem(storageKey(progressKey)) ?? '{}'
  } catch {
    return '{}'
  }
}

function parse(raw: string): Record<string, TopicProgress> {
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

// На сервері прогресу немає, тож перший рендер збігається з серверним
export function useTopicProgress(progressKey: string, topicId: string): TopicProgress {
  const raw = useSyncExternalStore(subscribe, () => readRaw(progressKey), () => '{}')
  return useMemo(() => parse(raw)[topicId] ?? {}, [raw, topicId])
}

export function updateProgress(progressKey: string, topicId: string, patch: TopicProgress) {
  try {
    const all = parse(readRaw(progressKey))
    all[topicId] = { ...all[topicId], ...patch }
    localStorage.setItem(storageKey(progressKey), JSON.stringify(all))
    window.dispatchEvent(new Event(CHANGE_EVENT))
  } catch {
    // приватний режим або заблоковане сховище — просто не зберігаємо
  }
}
