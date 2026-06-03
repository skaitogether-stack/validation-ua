'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ContentBlock {
  title?: string
  text: string
  examples?: string[]
}

interface LessonData {
  id: string
  title: string
  desc: string
  subjectId: string
  content: ContentBlock[]
}

interface Props {
  lesson: LessonData
}

export function PresentationClient({ lesson }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Збираємо слайди
  const slides: any[] = []

  // 1. Титульний слайд
  slides.push({
    type: 'title',
    title: lesson.title,
    desc: lesson.desc,
    subject: lesson.subjectId === 'ukrainian' ? '📚 Українська мова' : '🌍 Природознавство'
  })

  // 2. Слайди теорії та прикладів
  lesson.content.forEach((block, idx) => {
    slides.push({
      type: 'theory',
      blockIndex: idx,
      title: block.title || `Частина ${idx + 1}`,
      text: block.text
    })

    if (block.examples && block.examples.length > 0) {
      slides.push({
        type: 'examples',
        blockIndex: idx,
        title: `Приклади: ${block.title || `Частина ${idx + 1}`}`,
        examples: block.examples
      })
    }
  })

  // 3. Фінальний слайд
  slides.push({
    type: 'summary',
    title: 'Чудова робота! 🎉',
    desc: 'Ви успішно переглянули всі матеріали презентації від NotebookLM. Тепер ви готові перевірити свої знання!'
  })

  const totalSlides = slides.length

  const nextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(prev => prev + 1)
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1)
    }
  }

  // Обробка клавіатури
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        e.preventDefault()
        nextSlide()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevSlide()
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentSlide, isFullscreen])

  // Повноекранний режим
  const toggleFullscreen = () => {
    const element = document.getElementById('presentation-container')
    if (!element) return

    if (!isFullscreen) {
      if (element.requestFullscreen) {
        element.requestFullscreen()
      }
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
      setIsFullscreen(false)
    }
  }

  // Слідкуємо за виходом з повноекранного режиму кнопкою Esc
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const slide = slides[currentSlide]

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col font-sans select-none">
      {/* Шапка презентації */}
      <header className="px-6 py-4 bg-[#111827]/80 backdrop-blur-md border-b border-gray-800 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Link 
            href={`/lessons/${lesson.id}`} 
            className="text-xs font-bold text-gray-400 hover:text-white transition-colors bg-[#1f2937] px-3 py-1.5 rounded-lg border border-gray-700"
          >
            ← Повернутись до уроку
          </Link>
          <span className="text-xs font-black bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-1 rounded-md uppercase tracking-wider">
            NotebookLM ⚡
          </span>
        </div>
        <div className="text-sm font-semibold text-gray-400">
          Слайд <span className="text-white font-bold">{currentSlide + 1}</span> з {totalSlides}
        </div>
        <button
          onClick={toggleFullscreen}
          className="p-1.5 hover:bg-[#1f2937] rounded-lg transition-colors text-gray-400 hover:text-white"
          title="Повноекранний режим"
        >
          {isFullscreen ? '📺 Згорнути' : '📺 На весь екран'}
        </button>
      </header>

      {/* Контейнер для слайдів */}
      <div 
        id="presentation-container" 
        className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-radial-at-t from-[#1e1b4b] via-[#0f172a] to-[#0f172a]"
      >
        {/* Декоративні градієнти */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -z-10 animate-pulse delay-700"></div>

        {/* Тіло слайду */}
        <div className="w-full max-w-4xl bg-gray-900/60 backdrop-blur-xl border border-gray-800 p-8 sm:p-16 rounded-3xl shadow-2xl flex flex-col justify-between min-h-[50vh] transition-all duration-300">
          
          {/* Контент слайду */}
          <div className="flex-1 flex flex-col justify-center">
            {slide.type === 'title' && (
              <div className="text-center space-y-6">
                <span className="inline-block px-4 py-1.5 rounded-full text-xs font-extrabold bg-blue-900/50 text-blue-300 border border-blue-800 uppercase tracking-widest">
                  {slide.subject}
                </span>
                <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight tracking-tight">
                  {slide.title}
                </h1>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto font-medium">
                  {slide.desc}
                </p>
              </div>
            )}

            {slide.type === 'theory' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
                  <span className="text-2xl">📖</span>
                  <h2 className="text-xl sm:text-3xl font-extrabold text-white">{slide.title}</h2>
                </div>
                <div className="text-gray-300 text-base sm:text-xl leading-relaxed whitespace-pre-wrap font-medium">
                  {slide.text}
                </div>
              </div>
            )}

            {slide.type === 'examples' && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
                  <span className="text-2xl">💡</span>
                  <h2 className="text-xl sm:text-3xl font-extrabold text-white">{slide.title}</h2>
                </div>
                <div className="grid gap-4">
                  {slide.examples.map((example: string, i: number) => (
                    <div 
                      key={i} 
                      className="bg-blue-950/20 border border-blue-900/30 p-5 rounded-2xl flex gap-4 items-start shadow-xs hover:border-blue-500/30 transition-colors"
                    >
                      <span className="w-6 h-6 rounded-full bg-blue-900/50 text-blue-300 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 border border-blue-800">
                        {i + 1}
                      </span>
                      <p className="text-gray-200 text-base sm:text-lg font-medium leading-relaxed">
                        {example}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {slide.type === 'summary' && (
              <div className="text-center space-y-6 max-w-xl mx-auto">
                <div className="text-6xl mb-4 animate-bounce">🎓</div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white">{slide.title}</h2>
                <p className="text-gray-400 text-base sm:text-lg leading-relaxed font-medium">
                  {slide.desc}
                </p>
                <div className="pt-4">
                  <Link 
                    href={`/lessons/${lesson.id}/quiz`} 
                    className="inline-flex items-center justify-center px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-base transition-colors shadow-lg shadow-green-950/50 hover:scale-[1.02] transform"
                  >
                    Почати тест до уроку 🚀
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Нижня панель слайду */}
          <div className="mt-8 pt-6 border-t border-gray-800/60 flex items-center justify-between text-xs text-gray-500 font-bold">
            <div>Тема: {lesson.title}</div>
            <div className="text-yellow-500/80">Генерація: NotebookLM</div>
          </div>
        </div>

        {/* Навігаційні стрілки з боків */}
        <button
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gray-800/40 hover:bg-gray-800/80 border border-gray-700 text-white flex items-center justify-center text-xl transition-all disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
          title="Попередній слайд (Стрілка вліво)"
        >
          ←
        </button>

        <button
          onClick={nextSlide}
          disabled={currentSlide === totalSlides - 1}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gray-800/40 hover:bg-gray-800/80 border border-gray-700 text-white flex items-center justify-center text-xl transition-all disabled:opacity-0 disabled:pointer-events-none cursor-pointer"
          title="Наступний слайд (Стрілка вправо / Пропуск)"
        >
          →
        </button>
      </div>

      {/* Індикатор прогресу (лінія в самому низу) */}
      <div className="w-full h-1 bg-gray-900">
        <div 
          className="h-full bg-yellow-500 transition-all duration-300"
          style={{ width: `${((currentSlide + 1) / totalSlides) * 100}%` }}
        ></div>
      </div>
    </div>
  )
}
