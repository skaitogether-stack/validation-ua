import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import { geography, getGeographyTopic } from '../../../data/geography'
import { availableVideo } from '../../../lib/topicVideo'
import { TopicClient } from '../../../components/topics/TopicClient'
import { SubjectSignIn } from '../../../components/topics/SubjectSignIn'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ topicId: string }> }): Promise<Metadata> {
  const topic = getGeographyTopic((await params).topicId)
  return topic ? { title: `${topic.title} — Географія — Validation`, description: topic.desc } : {}
}

export default async function GeographyTopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const topic = getGeographyTopic((await params).topicId)
  if (!topic) notFound()
  if (!(await getServerSession(authOptions))) {
    return <SubjectSignIn callbackUrl={`/geography/${topic.id}`} icon="🌍" title="Географія, 7 клас" />
  }

  return <TopicClient subject={geography} topic={{ ...topic, video: availableVideo(topic.video) }} />
}
