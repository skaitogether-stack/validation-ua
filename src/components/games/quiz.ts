// Спільне для ігор-повторень: питання з тестів теми та їх випадковий вибір

import type { Topic } from '../../data/topics'

export interface GameQuestion {
  paragraph: number
  text: string
  correct: string
  wrong: string[]
  explanation: string
}

export function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Усі питання тестів з параграфів одного розділу
export function toGameQuestions(topics: Topic[], section: string): GameQuestion[] {
  return topics
    .filter(topic => topic.section === section)
    .flatMap(topic =>
      topic.questions.map(q => ({
        paragraph: topic.paragraph,
        text: q.text,
        correct: q.options[q.correct],
        wrong: q.options.filter((_, i) => i !== q.correct),
        explanation: q.explanation
      }))
    )
}

// count випадкових питань, рівномірно з усіх параграфів теми
export function pickQuestions(pool: GameQuestion[], count: number): GameQuestion[] {
  const byParagraph = new Map<number, GameQuestion[]>()
  for (const q of shuffle(pool)) {
    byParagraph.set(q.paragraph, [...(byParagraph.get(q.paragraph) ?? []), q])
  }
  const groups = shuffle([...byParagraph.values()])
  const picked: GameQuestion[] = []
  while (picked.length < count && groups.some(g => g.length)) {
    for (const g of groups) {
      const q = g.pop()
      if (q && picked.length < count) picked.push(q)
    }
  }
  return shuffle(picked)
}
