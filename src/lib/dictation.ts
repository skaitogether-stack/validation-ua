export interface VocabularyItem {
  word: string
  translation: string
}

export interface SavedWordSet {
  items: VocabularyItem[]
  updatedAt: string
}

export function parseWordsJson(json: string): VocabularyItem[] {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export interface ImageInput {
  mimeType: string
  base64: string
}

interface ExtractionResult {
  sourceLanguage: string
  items: VocabularyItem[]
}

const PROMPT = `
Ви — помічник для підготовки учнів до словникового диктанту з іноземної мови.

Завдання:
1. Знайдіть у наданому матеріалі (фото сторінки підручника/зошита або текст) усі нові слова чи сталі вирази іноземною мовою, які учень має вивчити.
   - Якщо поруч зі словом уже є переклад, транскрипція чи номер — візьміть лише саме слово іноземною мовою.
   - Ігноруйте заголовки, інструкції до вправ, номери сторінок, транскрипцію.
   - Зберігайте написання як в оригіналі (артиклі, частку "to" для дієслів, великі літери для німецьких іменників тощо).
   - Не дублюйте слова.
2. Для кожного слова дайте переклад українською мовою — найвживаніший варіант, який показав би популярний онлайн-перекладач (Google Translate). Один основний варіант, без пояснень і без дужок.

Відповідь — ТІЛЬКИ валідний JSON такого вигляду:
{
  "sourceLanguage": "назва мови оригіналу українською, напр. англійська",
  "items": [
    { "word": "apple", "translation": "яблуко" }
  ]
}`

export async function extractVocabulary(text: string, images: ImageInput[]): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.')
  }

  const model = 'gemini-2.5-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const parts: object[] = [{ text: PROMPT }]
  if (text.trim()) {
    parts.push({ text: `Текст зі словами:\n"""\n${text}\n"""` })
  }
  for (const image of images) {
    parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } })
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
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

  let parsed: Partial<ExtractionResult>
  try {
    parsed = JSON.parse(textResponse)
  } catch {
    console.error('Failed to parse Gemini JSON response:', textResponse)
    throw new Error('Failed to parse vocabulary JSON from AI response')
  }

  // Нормалізуємо відповідь моделі, щоб клієнт завжди отримував коректну структуру
  const seen = new Set<string>()
  const items: VocabularyItem[] = []
  for (const item of parsed.items ?? []) {
    const word = String(item?.word ?? '').trim()
    const translation = String(item?.translation ?? '').trim()
    if (!word || !translation || seen.has(word.toLowerCase())) continue
    seen.add(word.toLowerCase())
    items.push({ word, translation })
  }

  return { sourceLanguage: String(parsed.sourceLanguage ?? ''), items }
}
