import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { db } from '../../../../lib/db'

export const dynamic = 'force-dynamic'

// Простий алгоритм для видобування речень
function extractSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 15 && s.length < 150)
}

// Функція для генерації динамічних тестів (заповнення пропусків)
function generateQuestionsFromText(text: string, lessonId: string) {
  const sentences = extractSentences(text)
  const questions: any[] = []

  // Збираємо список унікальних слів із тексту для дистракторів
  const allWords = Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'—–]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 4 && w.length < 12)
    )
  )

  let sentenceIndex = 0
  let questionCount = 0

  while (sentenceIndex < sentences.length && questionCount < 5) {
    const sentence = sentences[sentenceIndex]
    sentenceIndex++

    // Розбиваємо речення на слова
    const words = sentence.split(/\s+/)
    // Шукаємо підходяще слово для приховування (довжина від 4 до 10 символів, не містить розділових знаків)
    const validCandidateIndices = words
      .map((w, idx) => ({ w: w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'—–]/g, ''), idx }))
      .filter(item => item.w.length > 4 && item.w.length < 10 && item.idx > 1 && item.idx < words.length - 1)

    if (validCandidateIndices.length === 0) continue

    // Вибираємо випадкового кандидата
    const candidate = validCandidateIndices[Math.floor(Math.random() * validCandidateIndices.length)]
    const originalWord = words[candidate.idx]
    const cleanWord = candidate.w

    // Створюємо речення з пропуском
    const placeholderSentence = words
      .map((w, idx) => (idx === candidate.idx ? '______' : w))
      .join(' ')

    // Вибираємо 3 дистрактори з тексту, які відрізняються від правильного слова
    const distractors = allWords
      .filter(w => w !== cleanWord && w !== cleanWord.toLowerCase())
      .sort(() => 0.5 - Math.random())
      .slice(0, 3)

    if (distractors.length < 3) {
      // Додаємо дефолтні дистрактори, якщо в тексті мало слів
      const defaultDistractors = ['слово', 'тема', 'вправа', 'правило']
      distractors.push(...defaultDistractors.filter(w => w !== cleanWord).slice(0, 3 - distractors.length))
    }

    // Змішуємо варіанти відповідей
    const options = [originalWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'—–]/g, ''), ...distractors]
    const correctOption = options[0]
    
    // Перемішуємо
    const shuffledOptions = [...options].sort(() => 0.5 - Math.random())
    const correctIndex = shuffledOptions.indexOf(correctOption)

    questions.push({
      text: `Заповніть пропуск у реченні:\n"${placeholderSentence}"`,
      options: shuffledOptions,
      correct: correctIndex,
      explanation: `У цьому реченні на місці пропуску має стояти слово "${correctOption}", оскільки воно узгоджується за змістом та граматично в оригінальному тексті.`
    })

    questionCount++
  }

  // Якщо речень мало або не вдалось згенерувати 5 питань, додаємо загальні
  if (questions.length < 5) {
    const backupQuestions = [
      {
        text: 'Яка основна тема викладена в даному джерелі?',
        options: ['Опис вивченого правила чи явища', 'Історичні факти', 'Життєпис автора', 'Діалог між учнями'],
        correct: 0,
        explanation: 'Джерело містить навчальний матеріал для теоретичного ознайомлення.'
      },
      {
        text: 'Які ключові терміни найчастіше зустрічаються в тексті?',
        options: ['Навчальні поняття та приклади', 'Космічні тіла', 'Хімічні реактиви', 'Назви країн'],
        correct: 0,
        explanation: 'Текст орієнтований на розширення знань з обраної дисципліни.'
      }
    ]
    
    while (questions.length < 5 && backupQuestions.length > 0) {
      const q = backupQuestions.shift()
      if (q) questions.push(q)
    }
  }

  return questions
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
    }

    // Перевіряємо роль
    const user = await db.user.findUnique({ where: { id: session.user.id } })
    if (!user || user.role !== 'teacher') {
      return NextResponse.json({ error: 'Доступ дозволено тільки вчителям' }, { status: 403 })
    }

    const body = await req.json()
    const { title, content, subjectId } = body

    if (!title || !content || !subjectId) {
      return NextResponse.json({ error: 'Будь ласка, заповніть всі поля' }, { status: 400 })
    }

    // 1. Створюємо Source
    const source = await db.source.create({
      data: {
        title,
        content,
        subjectId,
        userId: user.id
      }
    })

    // 2. Структуруємо теоретичні блоки
    // Ділимо контент приблизно навпіл для 2 блоків теорії
    const paragraphs = content.split('\n').map((p: string) => p.trim()).filter((p: string) => p.length > 0)
    const midPoint = Math.ceil(paragraphs.length / 2)
    const textBlock1 = paragraphs.slice(0, midPoint).join('\n\n')
    const textBlock2 = paragraphs.slice(midPoint).join('\n\n')

    // Знаходимо приклади (речення, які містять "наприклад" або приклади в лапках/дужках)
    const sentences = extractSentences(content)
    const exampleCandidates = sentences.filter(s => 
      s.toLowerCase().includes('наприклад') || 
      s.toLowerCase().includes('зокрема') ||
      s.includes(':') ||
      (s.includes('"') && s.length < 80)
    ).slice(0, 4)

    const examplesBlock1 = exampleCandidates.slice(0, 2)
    const examplesBlock2 = exampleCandidates.slice(2, 4)

    if (examplesBlock1.length === 0) {
      examplesBlock1.push('Розгляньте та проаналізуйте наведене вище твердження.')
    }
    if (examplesBlock2.length === 0) {
      examplesBlock2.push('Зверніть увагу на правопис та вживання термінів у тексті.')
    }

    const contentBlocks = [
      {
        title: 'Теоретичні відомості. Частина I',
        text: textBlock1 || 'Основна частина теоретичного матеріалу.',
        examples: examplesBlock1
      }
    ]

    if (textBlock2) {
      contentBlocks.push({
        title: 'Теоретичні відомості. Частина II',
        text: textBlock2,
        examples: examplesBlock2
      })
    }

    // 3. Створюємо DbLesson
    const dbLesson = await db.dbLesson.create({
      data: {
        subjectId,
        title,
        desc: `Матеріал завантажено вчителем ${user.name || ''}`,
        icon: subjectId === 'ukrainian' ? '📚' : '🌍',
        xp: 100,
        contentJson: JSON.stringify(contentBlocks),
        sourceId: source.id
      }
    })

    // 4. Генеруємо та зберігаємо питання
    const generatedQuestions = generateQuestionsFromText(content, dbLesson.id)
    
    for (const q of generatedQuestions) {
      await db.dbQuestion.create({
        data: {
          lessonId: dbLesson.id,
          text: q.text,
          optionsJson: JSON.stringify(q.options),
          correct: q.correct,
          explanation: q.explanation
        }
      })
    }

    return NextResponse.json({
      success: true,
      sourceId: source.id,
      lessonId: dbLesson.id
    }, { status: 201 })

  } catch (error: any) {
    console.error('Error during upload/parsing:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
