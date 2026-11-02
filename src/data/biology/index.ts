// Контент підрозділу «Біологія»: підручник «Біологія, 7 клас» (Балан та ін., 2024),
// одна тема = один параграф, починаючи з § 17.

import { buildTopics, type Subject, type Topic } from '../topics'
import { theme4 } from './theme4'
import { theme5 } from './theme5'
import { theme6 } from './theme6'
import { theme7 } from './theme7'
import { theme8and9 } from './theme8-9'

export const biology: Subject = { href: '/biology', progressKey: 'biology' }

export const biologyTopics: Topic[] = buildTopics([theme4, theme5, theme6, theme7, ...theme8and9], 'biology')

export const biologySections: string[] = [...new Set(biologyTopics.map(t => t.section))]

export function getBiologyTopic(id: string): Topic | undefined {
  return biologyTopics.find(t => t.id === id)
}
