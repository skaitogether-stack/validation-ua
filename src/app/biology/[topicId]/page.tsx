import type { Metadata } from 'next'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { notFound } from 'next/navigation'
import { biologyTopics, getBiologyTopic } from '../../../data/biology'
import { BiologyTopicClient } from '../../../components/biology/BiologyTopicClient'

export function generateStaticParams() {
  return biologyTopics.map(topic => ({ topicId: topic.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ topicId: string }> }): Promise<Metadata> {
  const topic = getBiologyTopic((await params).topicId)
  return topic ? { title: `${topic.title} — Біологія — Validation`, description: topic.desc } : {}
}

// Локальне відео показуємо, лише якщо файл уже завантажено в public/
function availableVideo(video?: string): string | undefined {
  if (!video) return undefined
  if (/^https?:\/\//.test(video)) return video
  return existsSync(path.join(process.cwd(), 'public', video)) ? video : undefined
}

export default async function BiologyTopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const topic = getBiologyTopic((await params).topicId)
  if (!topic) notFound()

  return <BiologyTopicClient topic={{ ...topic, video: availableVideo(topic.video) }} />
}
