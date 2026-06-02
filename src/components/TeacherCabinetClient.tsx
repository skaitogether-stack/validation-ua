'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Source {
  id: string
  title: string
  subjectId: string
  content: string
  createdAt: string
  lessons: {
    id: string
    title: string
    subjectId: string
    createdAt: string
  }[]
}

interface Result {
  id: string
  lessonId: string
  lessonTitle: string
  score: string | number
  total: string | number
  createdAt: string
  user: {
    name: string
    email: string | null
    image: string | null
  }
}

interface Props {
  initialSources: Source[]
  initialResults: Result[]
}

const STEPS = [
  { text: '🔍 Завантаження та перевірка формату файлу...', icon: '📁' },
  { text: '⚙️ Синтаксичний аналіз та структурування речень...', icon: '🧠' },
  { text: '💡 Видобування правил, термінології та прикладів...', icon: '📖' },
  { text: '📝 Генерація тестів з вибором відповідей (5 питань)...', icon: '⚡' },
  { text: '💾 Публікація уроку в шкільну навчальну панель...', icon: '🚀' }
]

export function TeacherCabinetClient({ initialSources, initialResults }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'upload' | 'results'>('upload')
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('ukrainian')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  // Стани для симуляції "ШІ-парсингу"
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [processingLogs, setProcessingLogs] = useState<string[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Обробка файлу
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Перевірка формату
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      setError('Підтримуються тільки текстові файли (.txt або .md)')
      return
    }

    setError(null)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setContent(text)
      if (!title) {
        // Задаємо назву як ім'я файлу без розширення
        setTitle(file.name.replace(/\.[^/.]+$/, ""))
      }
    }
    reader.readAsText(file)
  }

  // Обробка форми
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setError('Заповніть назву та введіть або завантажте вміст джерела')
      return
    }

    setError(null)
    setIsProcessing(true)
    setCurrentStep(0)
    setProcessingLogs([STEPS[0].text])

    // Послідовна анімація кроків ШІ
    for (let i = 1; i < STEPS.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setCurrentStep(i)
      setProcessingLogs((prev) => [...prev, STEPS[i].text])
    }

    // Надсилаємо запит
    try {
      const res = await fetch('/api/teacher/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, subjectId })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Сталася помилка при завантаженні матеріалу')
      }

      await new Promise((resolve) => setTimeout(resolve, 500))
      
      // Скидаємо поля
      setTitle('')
      setContent('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      
      // Оновлюємо дані сервера
      router.refresh()
      
      // Показуємо успішний лог
      setProcessingLogs((prev) => [...prev, '✅ Джерело оброблено та успішно опубліковано!'])
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setIsProcessing(false)
      setProcessingLogs([])

    } catch (err: any) {
      setError(err.message)
      setIsProcessing(false)
      setProcessingLogs([])
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-8 items-start">
      
      {/* Навігація ліворуч */}
      <div className="md:col-span-1 bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-2">
        <button
          onClick={() => setActiveTab('upload')}
          className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-colors ${
            activeTab === 'upload'
              ? 'bg-emerald-500 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span>📂</span>
          Завантаження матеріалів
        </button>

        <button
          onClick={() => setActiveTab('results')}
          className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-colors ${
            activeTab === 'results'
              ? 'bg-emerald-500 text-white'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span>📈</span>
          Успішність учнів
        </button>
      </div>

      {/* Основний блок контенту праворуч */}
      <div className="md:col-span-2 space-y-6">
        
        {activeTab === 'upload' && (
          <>
            {/* Форма завантаження */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
              <h2 className="text-xl font-black text-gray-800 mb-6">Додати нове навчальне джерело</h2>
              
              {isProcessing ? (
                // Екран ШІ аналізу
                <div className="py-8 flex flex-col items-center justify-center space-y-6">
                  <div className="w-16 h-16 relative">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-100 animate-pulse"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">
                      {STEPS[currentStep]?.icon || '🧠'}
                    </div>
                  </div>
                  
                  <div className="text-center max-w-sm">
                    <h3 className="font-extrabold text-emerald-800 text-lg">ШІ Аналізатор джерел працює</h3>
                    <p className="text-gray-400 text-xs mt-1">Ми автоматично створюємо уроки та тести з вашого матеріалу</p>
                  </div>

                  <div className="w-full max-w-md bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2 text-left">
                    {processingLogs.map((log, idx) => (
                      <div 
                        key={idx} 
                        className={`text-xs font-medium flex items-center gap-2 ${
                          idx === processingLogs.length - 1 ? 'text-emerald-700 font-bold' : 'text-gray-400'
                        }`}
                      >
                        {idx === processingLogs.length - 1 && idx < STEPS.length - 1 && (
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                        )}
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Стандартна форма
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl font-medium">
                      ⚠️ {error}
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Назва джерела</label>
                      <input
                        type="text"
                        placeholder="напр., § 35. Екосистеми України"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-hidden text-sm font-semibold transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Предмет (категорія)</label>
                      <select
                        value={subjectId}
                        onChange={(e) => setSubjectId(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-hidden text-sm font-semibold transition-all bg-white"
                      >
                        <option value="ukrainian">🇺🇦 Українська мова</option>
                        <option value="science">🌍 Природознавство</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Завантажити файл (.txt, .md)</label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".txt,.md"
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 file:cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Вставити текст джерела вручну</label>
                    <textarea
                      placeholder="Вставте теоретичний матеріал параграфа, правила чи будь-який навчальний текст сюди..."
                      rows={6}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-hidden text-sm leading-relaxed transition-all font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-md shadow-emerald-100 transition-all hover:scale-[1.01]"
                  >
                    🚀 Обробити джерело та опублікувати
                  </button>
                </form>
              )}
            </div>

            {/* Список завантажених джерел */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h2 className="text-xl font-black text-gray-800 mb-4">Завантажені джерела ({initialSources.length})</h2>
              
              {initialSources.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Ви ще не завантажили жодного джерела</p>
              ) : (
                <div className="space-y-4">
                  {initialSources.map((source) => (
                    <div key={source.id} className="p-4 border border-gray-100 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-gray-800">{source.title}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-600">
                            {source.subjectId === 'ukrainian' ? 'Українська' : 'Природа'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Завантажено: {new Date(source.createdAt).toLocaleDateString('uk-UA')}
                        </p>
                      </div>
                      
                      <div className="flex flex-col items-end sm:items-start gap-1">
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                          🎉 Активний урок
                        </span>
                        {source.lessons.map(l => (
                          <span key={l.id} className="text-[10px] text-gray-400 font-medium">
                            ID уроку: {l.id}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'results' && (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <h2 className="text-xl font-black text-gray-800 mb-4">Журнал проходження тестів</h2>
            
            {initialResults.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Жоден учень ще не пройшов тести</p>
            ) : (
              <div className="overflow-x-auto -mx-6 sm:mx-0">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 text-xs font-bold uppercase tracking-wider bg-gray-50/50">
                      <th className="px-6 py-4">Учень</th>
                      <th className="px-6 py-4">Урок / Тема</th>
                      <th className="px-6 py-4 text-center">Оцінка</th>
                      <th className="px-6 py-4">Дата проходження</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {initialResults.map((result) => {
                      const scorePct = Math.round((Number(result.score) / Number(result.total)) * 100)
                      return (
                        <tr key={result.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 flex items-center gap-3">
                            {result.user.image ? (
                              <img
                                src={result.user.image}
                                className="w-8 h-8 rounded-full border border-gray-100 object-cover"
                                alt=""
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                {result.user.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-800">{result.user.name}</span>
                              <span className="text-[10px] text-gray-400">{result.user.email}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-700 max-w-[200px] truncate">
                            {result.lessonTitle}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold ${
                              scorePct === 100 
                                ? 'bg-green-100 text-green-800' 
                                : scorePct >= 70 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {result.score} / {result.total} ({scorePct}%)
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-400 font-medium">
                            {new Date(result.createdAt).toLocaleString('uk-UA')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
