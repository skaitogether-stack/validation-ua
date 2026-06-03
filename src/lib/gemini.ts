interface ContentBlock {
  title: string
  text: string
  examples: string[]
}

interface Question {
  text: string
  options: string[]
  correctIndex: number
  explanation: string
}

interface GeneratedLesson {
  lessonTitle: string
  lessonDescription: string
  contentBlocks: ContentBlock[]
  questions: Question[]
}

export async function generateEducationalContent(sourceText: string, subjectId: string): Promise<GeneratedLesson> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.')
  }

  // Використовуємо gemini-2.5-flash для швидкості та найвищої якості
  const model = 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const prompt = `
Ви є професійним методистом та розробником навчальних матеріалів для української школи.
Ваше завдання — проаналізувати наданий навчальний текст (джерело) та згенерувати на його основі високоякісний інтерактивний урок.

Мова генерації: Українська.
Предмет: ${subjectId === 'ukrainian' ? 'Українська мова' : 'Природознавство (Я досліджую світ / Пізнаємо природу)'}.

Будь ласка, структуруйте вихідні дані у форматі JSON з наступними полями:
1. "lessonTitle": Чітка, приваблива назва уроку українською мовою на основі джерела.
2. "lessonDescription": Короткий опис уроку (1-2 речення), що пояснює, про що цей урок і чому він важливий.
3. "contentBlocks": Масив із 3-5 об'єктів. Кожен об'єкт представляє один логічний розділ теорії (підтему) та містить:
   - "title": Назва підтеми (наприклад, "Правило чергування", "Механізм руху плит" тощо).
   - "text": Детальний, розгорнутий і зрозумілий для учня теоретичний опис цієї підтеми (мінімум 2-3 абзаци, без скорочень, простою та цікавою мовою).
   - "examples": Масив із 2-4 конкретних, практичних прикладів до цієї підтеми (речення з виділеними орфограмами, життєві ситуації, фізичні явища тощо).
4. "questions": Масив із 5 тестових питань для перевірки знань. Кожне питання містить:
   - "text": Текст питання (чіткий, зрозумілий, що тестує розуміння теорії або вміння її застосувати).
   - "options": Масив із 4 унікальних варіантів відповідей.
   - "correctIndex": Число від 0 до 3 (індекс правильної відповіді в масиві варіантів).
   - "explanation": Детальне пояснення, чому саме цей варіант відповіді є правильним, і чому інші є помилковими з погляду правил/науки.

Джерело для аналізу:
"""
${sourceText}
"""

Надішліть відповідь ТІЛЬКИ у форматі JSON. Відповідь має бути валідним JSON-об'єктом без будь-яких додаткових пояснень поза JSON.`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text
  if (!textResponse) {
    throw new Error('Empty response from Gemini API')
  }

  try {
    return JSON.parse(textResponse) as GeneratedLesson
  } catch (parseError) {
    console.error('Failed to parse Gemini JSON response:', textResponse)
    throw new Error('Failed to parse educational content JSON from AI response')
  }
}
