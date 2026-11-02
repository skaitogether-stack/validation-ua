'use client'

import { useMemo, useSyncExternalStore } from 'react'

// Прогрес у «Біології» зберігаємо в браузері: контент статичний, вхід не потрібен

export interface TopicProgress {
  flashcardsDone?: boolean
  bestScore?: number // найкращий результат тесту, %
}

const KEY = 'biology-progress'
const CHANGE_EVENT = 'biology-progress-change'

function readRaw(): string {
  try {
    return localStorage.getItem(KEY) ?? '{}'
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
export function useTopicProgress(topicId: string): TopicProgress {
  const raw = useSyncExternalStore(subscribe, readRaw, () => '{}')
  return useMemo(() => parse(raw)[topicId] ?? {}, [raw, topicId])
}

export function updateProgress(topicId: string, patch: TopicProgress) {
  try {
    const all = parse(readRaw())
    all[topicId] = { ...all[topicId], ...patch }
    localStorage.setItem(KEY, JSON.stringify(all))
    window.dispatchEvent(new Event(CHANGE_EVENT))
  } catch {
    // приватний режим або заблоковане сховище — просто не зберігаємо
  }
}
