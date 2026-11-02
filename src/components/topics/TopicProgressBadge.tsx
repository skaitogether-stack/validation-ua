'use client'

import { useTopicProgress } from '../../lib/topicProgress'

export function TopicProgressBadge({ progressKey, topicId }: { progressKey: string; topicId: string }) {
  const progress = useTopicProgress(progressKey, topicId)

  if (progress.bestScore !== undefined) {
    const passed = progress.bestScore >= 80
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${
          passed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
        }`}
      >
        Тест: {progress.bestScore}%
      </span>
    )
  }
  if (progress.flashcardsDone) {
    return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Картки вивчено</span>
  }
  return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Нова тема</span>
}
