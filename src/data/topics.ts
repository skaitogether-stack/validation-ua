// Спільна модель предметів за параграфами підручника (біологія, географія):
// одна тема = один параграф з відео, флешкартами й тестом.

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

export interface Topic {
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

// Предмет, як його бачать спільні компоненти: куди вести посилання й де зберігати прогрес
export interface Subject {
  href: string // напр. /biology
  progressKey: string // напр. biology — прогрес у localStorage під ключем `${progressKey}-progress`
}

// Відео не генеруються: готовий файл кладемо в public/media/<subject>/p<номер параграфа>.mp4
// (або вказуємо посилання на YouTube у полі video)
export function buildTopics(sections: SectionSource[], mediaDir: string): Topic[] {
  return sections.flatMap(({ section, topics }) =>
    topics.map(t => ({
      id: `p${t.paragraph}`,
      paragraph: t.paragraph,
      section,
      title: t.title,
      desc: t.desc,
      icon: t.icon,
      video: t.video ?? `/media/${mediaDir}/p${t.paragraph}.mp4`,
      flashcards: t.cards.map(([term, definition]) => ({ term, definition })),
      questions: t.questions.map(([text, options, explanation]) => ({ text, options, correct: 0, explanation }))
    }))
  )
}
