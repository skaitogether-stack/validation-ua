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
  subjectId: string
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
  const [selectedSubjectId, setSelectedSubjectId] = useState<'ukrainian' | 'science' | null>(null)
  const [activeTab, setActiveTab] = useState<'upload' | 'results'>('upload')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  // Стани для симуляції "ШІ-парсингу"
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [processingLogs, setProcessingLogs] = useState<string[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Видалення джерела
  async function handleDeleteSource(id: string) {
    if (!confirm('Ви впевнені, що хочете видалити цей матеріал? Це також видалить згенеровані уроки, тести та результати учнів.')) {
      return
    }

    setDeletingId(id)
    setError(null)

    try {
      const res = await fetch(`/api/teacher/source/${id}`, {
        method: 'DELETE'
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Не вдалося видалити матеріал')
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  // Обробка файлу
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Перевірка формату
    const isText = file.name.endsWith('.txt') || file.name.endsWith('.md')
    const isPdf = file.name.endsWith('.pdf')

    if (!isText && !isPdf) {
      setError('Підтримуються тільки текстові файли (.txt, .md) або PDF (.pdf)')
      return
    }

    setError(null)

    if (isPdf) {
      setIsProcessing(true)
      setCurrentStep(0)
      setProcessingLogs(['⏳ Завантаження та підготовка PDF-парсера...'])
      
      try {
        // Динамічно завантажуємо pdfjs-dist з CDN
        const pdfjsLib = await new Promise<any>((resolve, reject) => {
          if ((window as any).pdfjsLib) {
            resolve((window as any).pdfjsLib)
            return
          }
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
          script.onload = () => {
            const pdfjs = (window as any).pdfjsLib
            pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
            resolve(pdfjs)
          }
          script.onerror = () => reject(new Error('Не вдалося завантажити PDF-бібліотеку'))
          document.head.appendChild(script)
        })

        setProcessingLogs((prev) => [...prev, '⚙️ Зчитування PDF файлу...'])
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        
        setProcessingLogs((prev) => [...prev, `📖 Розпізнано сторінок: ${pdf.numPages}. Видобуваємо текст...`])
        
        let text = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()
          const pageText = textContent.items.map((item: any) => item.str).join(' ')
          text += pageText + '\n'
        }

        if (!text.trim()) {
          throw new Error('Не вдалося видобути текст із PDF. Можливо, файл складається тільки зі сканованих зображень.')
        }

        setContent(text)
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ""))
        }
        
        setProcessingLogs((prev) => [...prev, '✅ Текст успішно видобуто з PDF!'])
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (err: any) {
        setError(err.message || 'Сталася помилка при зчитуванні PDF')
      } finally {
        setIsProcessing(false)
        setProcessingLogs([])
      }
    } else {
      // Текстовий файл (.txt, .md)
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        setContent(text)
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ""))
        }
      }
      reader.readAsText(file)
    }
  }

  // Обробка форми
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSubjectId) return
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
        body: JSON.stringify({ title, content, subjectId: selectedSubjectId })
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

  // Фільтруємо джерела та результати за вибраним предметом
  const filteredSources = initialSources.filter(s => s.subjectId === selectedSubjectId)
  const filteredResults = initialResults.filter(r => r.subjectId === selectedSubjectId)

  // Якщо предмет ще не обрано — показуємо екран вибору предмета
  if (selectedSubjectId === null) {
    // Рахуємо кількість джерел для кожного предмета
    const ukrSourcesCount = initialSources.filter(s => s.subjectId === 'ukrainian').length
    const scienceSourcesCount = initialSources.filter(s => s.subjectId === 'science').length

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center max-w-xl mx-auto">
          <h2 className="text-2xl font-black text-gray-800">Оберіть предмет для роботи</h2>
          <p className="text-gray-500 mt-2 text-sm">
            Будь ласка, виберіть предметну область для завантаження джерел або перегляду результатів тестів.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Картка української мови */}
          <button
            onClick={() => setSelectedSubjectId('ukrainian')}
            className="bg-white p-8 rounded-3xl border border-blue-100 hover:border-blue-300 shadow-sm hover:shadow-xl transition-all text-left flex flex-col justify-between group transform hover:-translate-y-1 cursor-pointer"
          >
            <div>
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">
                📚
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Мовознавство
              </span>
              <h3 className="text-2xl font-extrabold text-gray-800 mt-4 mb-2">Українська мова</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Додавайте текстові правила орфографії, правопису та вправ. Система згенерує уроки з фокусом на граматику.
              </p>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-bold">
              <span>Завантажено: {ukrSourcesCount} джерел</span>
              <span className="text-blue-600 group-hover:translate-x-1 transition-transform">Перейти →</span>
            </div>
          </button>

          {/* Картка природознавства */}
          <button
            onClick={() => setSelectedSubjectId('science')}
            className="bg-white p-8 rounded-3xl border border-emerald-100 hover:border-emerald-300 shadow-sm hover:shadow-xl transition-all text-left flex flex-col justify-between group transform hover:-translate-y-1 cursor-pointer"
          >
            <div>
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">
                🌍
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Природничі науки
              </span>
              <h3 className="text-2xl font-extrabold text-gray-800 mt-4 mb-2">Природознавство</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Завантажуйте матеріали про навколишній світ, екосистеми, біологію та географію. Тести створюються по фактах із джерела.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-bold">
              <span>Завантажено: {scienceSourcesCount} джерел</span>
              <span className="text-emerald-600 group-hover:translate-x-1 transition-transform">Перейти →</span>
            </div>
          </button>
        </div>
      </div>
    )
  }

  const subjectTitle = selectedSubjectId === 'ukrainian' ? 'Українська мова 📚' : 'Природознавство 🌍'
  const subjectThemeClass = selectedSubjectId === 'ukrainian' ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'
  const buttonHoverColor = selectedSubjectId === 'ukrainian' ? 'hover:bg-blue-600 bg-blue-500 shadow-blue-100' : 'hover:bg-emerald-600 bg-emerald-500 shadow-emerald-100'

  return (
    <div className="space-y-6">
      
      {/* Кнопка зміни предмета та інформація про предмет */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        <button
          onClick={() => setSelectedSubjectId(null)}
          className="text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1.5"
        >
          ← Змінити предмет
        </button>
        <span className={`px-4 py-1.5 rounded-xl text-xs font-black border uppercase tracking-wider ${subjectThemeClass}`}>
          {subjectTitle}
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-8 items-start">
        
        {/* Навігація ліворуч */}
        <div className="md:col-span-1 bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-2">
          <button
            onClick={() => setActiveTab('upload')}
            className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-colors ${
              activeTab === 'upload'
                ? selectedSubjectId === 'ukrainian'
                  ? 'bg-blue-500 text-white'
                  : 'bg-emerald-500 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>📂</span>
            Завантаження джерела
          </button>

          <button
            onClick={() => setActiveTab('results')}
            className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 transition-colors ${
              activeTab === 'results'
                ? selectedSubjectId === 'ukrainian'
                  ? 'bg-blue-500 text-white'
                  : 'bg-emerald-500 text-white'
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
                <h2 className="text-xl font-black text-gray-800 mb-6">
                  Завантажити навчальне джерело з предмету: {selectedSubjectId === 'ukrainian' ? 'Укр. мова' : 'Природознавство'}
                </h2>
                
                {isProcessing ? (
                  // Екран ШІ аналізу
                  <div className="py-8 flex flex-col items-center justify-center space-y-6">
                    <div className="w-16 h-16 relative">
                      <div className={`absolute inset-0 rounded-full border-4 animate-pulse ${
                        selectedSubjectId === 'ukrainian' ? 'border-blue-100' : 'border-emerald-100'
                      }`}></div>
                      <div className={`absolute inset-0 rounded-full border-4 border-t-transparent animate-spin ${
                        selectedSubjectId === 'ukrainian' ? 'border-blue-500' : 'border-emerald-500'
                      }`}></div>
                      <div className="absolute inset-0 flex items-center justify-center text-2xl">
                        {STEPS[currentStep]?.icon || '🧠'}
                      </div>
                    </div>
                    
                    <div className="text-center max-w-sm">
                      <h3 className={`font-extrabold text-lg ${
                        selectedSubjectId === 'ukrainian' ? 'text-blue-800' : 'text-emerald-800'
                      }`}>ШІ Аналізатор працює</h3>
                      <p className="text-gray-400 text-xs mt-1">Ми автоматично створюємо уроки та тести з вашого матеріалу</p>
                    </div>

                    <div className="w-full max-w-md bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2 text-left">
                      {processingLogs.map((log, idx) => (
                        <div 
                          key={idx} 
                          className={`text-xs font-medium flex items-center gap-2 ${
                            idx === processingLogs.length - 1 
                              ? selectedSubjectId === 'ukrainian' ? 'text-blue-700 font-bold' : 'text-emerald-700 font-bold' 
                              : 'text-gray-400'
                          }`}
                        >
                          {idx === processingLogs.length - 1 && idx < STEPS.length - 1 && (
                            <span className={`w-1.5 h-1.5 rounded-full animate-ping ${
                              selectedSubjectId === 'ukrainian' ? 'bg-blue-500' : 'bg-emerald-500'
                            }`}></span>
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

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Назва джерела (Тема параграфа)</label>
                      <input
                        type="text"
                        placeholder="напр., § 12. Чергування приголосних звуків"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 outline-hidden text-sm font-semibold transition-all ${
                          selectedSubjectId === 'ukrainian' ? 'focus:border-blue-500 focus:ring-blue-100' : 'focus:border-emerald-500 focus:ring-emerald-100'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Завантажити файл джерела (.txt, .md, .pdf)</label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".txt,.md,.pdf"
                        className={`w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:cursor-pointer ${
                          selectedSubjectId === 'ukrainian' 
                            ? 'file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100' 
                            : 'file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Вставити текст джерела вручну</label>
                      <textarea
                        placeholder="Вставте теоретичний матеріал параграфа, правила чи будь-який навчальний текст сюди..."
                        rows={8}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 outline-hidden text-sm leading-relaxed transition-all font-medium ${
                          selectedSubjectId === 'ukrainian' ? 'focus:border-blue-500 focus:ring-blue-100' : 'focus:border-emerald-500 focus:ring-emerald-100'
                        }`}
                      />
                    </div>

                    <button
                      type="submit"
                      className={`w-full py-3 rounded-xl text-white font-bold text-sm shadow-md transition-all hover:scale-[1.01] ${buttonHoverColor}`}
                    >
                      🚀 Обробити джерело та опублікувати
                    </button>
                  </form>
                )}
              </div>

              {/* Список завантажених джерел */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <h2 className="text-xl font-black text-gray-800 mb-4">
                  Завантажені джерела з обраного предмету ({filteredSources.length})
                </h2>
                
                {filteredSources.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Ви ще не завантажили джерел для цього предмету</p>
                ) : (
                  <div className="space-y-4">
                    {filteredSources.map((source) => (
                      <div key={source.id} className="p-4 border border-gray-100 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                        <div>
                          <span className="text-sm font-extrabold text-gray-800">{source.title}</span>
                          <p className="text-xs text-gray-400 mt-1">
                            Завантажено: {new Date(source.createdAt).toLocaleDateString('uk-UA')}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-end sm:items-start gap-1">
                            <span className={`text-xs font-semibold px-3 py-1 rounded-lg ${
                              selectedSubjectId === 'ukrainian' ? 'text-blue-600 bg-blue-50' : 'text-emerald-600 bg-emerald-50'
                            }`}>
                              🎉 Активний урок
                            </span>
                            {source.lessons.map(l => (
                              <span key={l.id} className="text-[10px] text-gray-400 font-medium">
                                ID уроку: {l.id}
                              </span>
                            ))}
                          </div>
                          
                          <button
                            onClick={() => handleDeleteSource(source.id)}
                            disabled={deletingId === source.id}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                            title="Видалити матеріал"
                          >
                            {deletingId === source.id ? (
                              <span className="w-5 h-5 block border-2 border-red-500 border-t-transparent animate-spin rounded-full"></span>
                            ) : (
                              <span className="text-lg">🗑️</span>
                            )}
                          </button>
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
              <h2 className="text-xl font-black text-gray-800 mb-4">Журнал оцінок: {subjectTitle}</h2>
              
              {filteredResults.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Учні ще не проходили тести з цього предмету</p>
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
                      {filteredResults.map((result) => {
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
    </div>
  )
}
