import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { extractVocabulary, ImageInput } from '../../../../lib/dictation'

export const dynamic = 'force-dynamic'

const MAX_IMAGES = 5
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_TEXT_LENGTH = 10000

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 })
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'AI-сервіс не налаштовано' }, { status: 500 })
  }

  const formData = await req.formData()
  const text = String(formData.get('text') ?? '').slice(0, MAX_TEXT_LENGTH)
  const files = formData.getAll('images').filter((f): f is File => f instanceof File && f.size > 0)

  if (!text.trim() && files.length === 0) {
    return NextResponse.json({ error: 'Додайте фото або вставте слова' }, { status: 400 })
  }
  if (files.length > MAX_IMAGES) {
    return NextResponse.json({ error: `Можна завантажити не більше ${MAX_IMAGES} фото` }, { status: 400 })
  }

  const images: ImageInput[] = []
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: `Файл «${file.name}» не є зображенням` }, { status: 400 })
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: `Фото «${file.name}» завелике (макс. 8 МБ)` }, { status: 400 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    images.push({ mimeType: file.type, base64: buffer.toString('base64') })
  }

  try {
    const result = await extractVocabulary(text, images)
    if (result.items.length === 0) {
      return NextResponse.json({ error: 'Не вдалося знайти слова. Спробуйте чіткіше фото або вставте слова текстом.' }, { status: 422 })
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('Dictation vocabulary extraction failed:', error)
    return NextResponse.json({ error: 'Не вдалося обробити слова. Спробуйте ще раз.' }, { status: 502 })
  }
}
