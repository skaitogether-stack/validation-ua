'use client'

import { useState } from 'react'

interface Props {
  presentationUrl?: string
  videoUrl?: string
}

export function LessonMedia({ presentationUrl, videoUrl }: Props) {
  const [isVideoOpen, setIsVideoOpen] = useState(false)

  return (
    <>
      {/* Презентація */}
      <div className="p-6 border rounded-2xl bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
            📊
          </div>
          <div>
            <h2 className="text-xl font-bold mb-1">Подивитись презентацію</h2>
            <p className="text-gray-500 text-sm">Ознайомтеся з теоретичним матеріалом уроку</p>
          </div>
        </div>
        {presentationUrl ? (
          <a 
            href={presentationUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-blue-50 text-blue-600 rounded-xl font-semibold hover:bg-blue-100 transition-colors whitespace-nowrap text-center inline-block"
          >
            Відкрити
          </a>
        ) : (
          <button disabled className="px-5 py-2.5 bg-gray-50 text-gray-400 rounded-xl font-semibold cursor-not-allowed whitespace-nowrap">
            Скоро з'явиться
          </button>
        )}
      </div>

      {/* Відео */}
      <div className="p-6 border rounded-2xl bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
            🎬
          </div>
          <div>
            <h2 className="text-xl font-bold mb-1">Подивитись відео</h2>
            <p className="text-gray-500 text-sm">Перегляньте відео-пояснення до цієї теми</p>
          </div>
        </div>
        {videoUrl ? (
          <button 
            onClick={() => setIsVideoOpen(true)}
            className="px-5 py-2.5 bg-purple-50 text-purple-600 rounded-xl font-semibold hover:bg-purple-100 transition-colors whitespace-nowrap"
          >
            Дивитись
          </button>
        ) : (
          <button disabled className="px-5 py-2.5 bg-gray-50 text-gray-400 rounded-xl font-semibold cursor-not-allowed whitespace-nowrap">
            Скоро з'явиться
          </button>
        )}
      </div>

      {/* Video Modal */}
      {isVideoOpen && videoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setIsVideoOpen(false)}>
          <div className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setIsVideoOpen(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              ✕
            </button>
            <video 
              src={videoUrl} 
              controls 
              autoPlay 
              className="w-full h-auto max-h-[80vh] aspect-video"
            >
              Ваш браузер не підтримує відео.
            </video>
          </div>
        </div>
      )}
    </>
  )
}
