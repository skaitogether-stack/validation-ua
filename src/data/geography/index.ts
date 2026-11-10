// Контент підрозділу «Географія»: підручник «Географія, 7 клас» (Кобернік, Коваленко, 2024),
// одна тема = один параграф, починаючи з § 11.

import { buildTopics, type Subject, type Topic } from '../topics'
import { africa, southAmerica, australia } from './tropics'
import { antarctica } from './antarctica'
import { northAmerica } from './northAmerica'
import { eurasia } from './eurasia'
import { oceans } from './oceans'

export const geography: Subject = { href: '/geography', progressKey: 'geography' }

export const geographyTopics: Topic[] = buildTopics(
  [africa, southAmerica, australia, antarctica, northAmerica, eurasia, oceans],
  'geography'
)

export const geographySections: string[] = [...new Set(geographyTopics.map(t => t.section))]

export function getGeographyTopic(id: string): Topic | undefined {
  return geographyTopics.find(t => t.id === id)
}
