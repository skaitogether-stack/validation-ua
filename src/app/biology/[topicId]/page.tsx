import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]/route'
import { biology, getBiologyTopic } from '../../../data/biology'
import { availableVideo } from '../../../lib/topicVideo'
import { TopicClient } from '../../../components/topics/TopicClient'
import { SubjectSignIn } from '../../../components/topics/SubjectSignIn'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ topicId: string }> }): Promise<Metadata> {
  const topic = getBiologyTopic((await params).topicId)
  return topic ? { title: `${topic.title} — Біологія — Validation`, description: topic.desc } : {}
}

export default async function BiologyTopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const topic = getBiologyTopic((await params).topicId)
  if (!topic) notFound()
  if (!(await getServerSession(authOptions))) {
    return <SubjectSignIn callbackUrl={`/biology/${topic.id}`} icon="🧬" title="Біологія, 7 клас" />
  }

  return <TopicClient subject={biology} topic={{ ...topic, video: availableVideo(topic.video) }} />
}
