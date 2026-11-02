'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Subject, Topic } from '../../data/topics'
import { updateProgress, useTopicProgress, type TopicProgress } from '../../lib/topicProgress'
import { Flashcards } from './Flashcards'
import { TopicTest } from './TopicTest'

type Mode = 'overview' | 'flashcards' | 'test'

function youtubeEmbed(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return match ? `https://www.youtube.com/embed/${match[1]}` : null
}

function VideoPlayer({ src, title }: { src?: string; title: string }) {
  if (!src) {
    return (
      <div className="aspect-video rounded-2xl border border-dashed border-gray-200 bg-white flex flex-col items-center justify-center text-center p-6">
        <div className="text-4xl mb-2">🎬</div>
        <div className="font-semibold text-gray-700">Відеопрезентація з’явиться незабаром</div>
        <div className="text-sm text-gray-400">Поки що можна вчити терміни на флешкартах і пройти тест</div>
      </div>
    )
  }
  const embed = youtubeEmbed(src)
  if (embed) {
    return (
      <iframe
        src={embed}
        title={title}
        className="aspect-video w-full rounded-2xl bg-black"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    )
  }
  return <video src={src} controls playsInline preload="metadata" className="aspect-video w-full rounded-2xl bg-black" />
}

export function TopicClient({ subject, topic }: { subject: Subject; topic: Topic }) {
  const [mode, setMode] = useState<Mode>('overview')
  const progress = useTopicProgress(subject.progressKey, topic.id)
  const saveProgress = (patch: TopicProgress) => updateProgress(subject.progressKey, topic.id, patch)

  return (
    <main className="max-w-3xl mx-auto p-6">
      {mode === 'overview' ? (
        <Link href={subject.href} className="text-sm text-gray-500 hover:text-gray-800">
          ← Усі теми
        </Link>
      ) : (
        <button onClick={() => setMode('overview')} className="text-sm text-gray-500 hover:text-gray-800">
          ← До теми
        </button>
      )}
      <div className="mt-2 text-sm font-bold text-emerald-700">
        § {topic.paragraph} · {topic.section}
      </div>
      <h1 className="text-2xl font-bold mb-1">
        {topic.icon} {topic.title}
      </h1>
      <p className="text-sm text-gray-500 mb-6">{topic.desc}</p>

      {mode === 'overview' && (
        <div className="flex flex-col gap-4">
          <VideoPlayer src={topic.video} title={topic.title} />

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => setMode('flashcards')}
              className="text-left rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="text-2xl mb-2">🃏</div>
              <div className="font-bold text-gray-900">Флешкарти</div>
              <div className="text-sm text-gray-500">
                {topic.flashcards.length} термінів · {progress.flashcardsDone ? '✅ вивчено' : 'вчимо до «знаю» на кожній'}
              </div>
            </button>
            <button
              onClick={() => setMode('test')}
              className="text-left rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="text-2xl mb-2">📝</div>
              <div className="font-bold text-gray-900">Тест</div>
              <div className="text-sm text-gray-500">
                {topic.questions.length} питань
                {progress.bestScore !== undefined && ` · найкраще: ${progress.bestScore}%`}
              </div>
            </button>
          </div>
        </div>
      )}

      {mode === 'flashcards' && (
        <Flashcards
          cards={topic.flashcards}
          onFinish={() => saveProgress({ flashcardsDone: true })}
          onTest={() => setMode('test')}
        />
      )}

      {mode === 'test' && (
        <TopicTest
          questions={topic.questions}
          onFinish={score =>
            saveProgress({ bestScore: Math.max(score, progress.bestScore ?? 0) })
          }
          onFlashcards={() => setMode('flashcards')}
        />
      )}
    </main>
  )
}
