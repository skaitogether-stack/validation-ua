// Контент підрозділу «Біологія»: підручник «Біологія, 7 клас» (Балан та ін., 2024),
// одна тема = один параграф, починаючи з § 17. Відео не генеруються: готовий файл
// кладемо в public/media/biology/p<номер параграфа>.mp4 (або вказуємо посилання на YouTube у полі video).

import { theme4 } from './theme4'
import { theme5 } from './theme5'
import { theme6 } from './theme6'
import { theme7 } from './theme7'
import { theme8and9 } from './theme8-9'

export interface Flashcard {
  term: string
  definition: string
}

export interface TestQuestion {
  text: string
  options: string[]
  correct: number // індекс правильної відповіді
  explanation: string
}

export interface BiologyTopic {
  id: string
  paragraph: number
  section: string
  title: string
  desc: string
  icon: string
  video?: string
  flashcards: Flashcard[]
  questions: TestQuestion[]
}

export interface TopicSource {
  paragraph: number
  title: string
  desc: string
  icon: string
  video?: string
  cards: [term: string, definition: string][]
  // Перший варіант відповіді — правильний; під час тесту варіанти перемішуються
  questions: [text: string, options: string[], explanation: string][]
}

export interface SectionSource {
  section: string
  topics: TopicSource[]
}

function build({ section, topics }: SectionSource): BiologyTopic[] {
  return topics.map(t => ({
    id: `p${t.paragraph}`,
    paragraph: t.paragraph,
    section,
    title: t.title,
    desc: t.desc,
    icon: t.icon,
    video: t.video ?? `/media/biology/p${t.paragraph}.mp4`,
    flashcards: t.cards.map(([term, definition]) => ({ term, definition })),
    questions: t.questions.map(([text, options, explanation]) => ({ text, options, correct: 0, explanation }))
  }))
}

export const biologyTopics: BiologyTopic[] = [theme4, theme5, theme6, theme7, ...theme8and9].flatMap(build)

export const biologySections: string[] = [...new Set(biologyTopics.map(t => t.section))]

export function getBiologyTopic(id: string): BiologyTopic | undefined {
  return biologyTopics.find(t => t.id === id)
}
