export interface InAppBrowser {
  app: string
  platform: 'ios' | 'android' | 'other'
}

// Вбудовані браузери соцмереж, у яких Google блокує вхід (помилка disallowed_useragent)
const IN_APP_PATTERNS: [RegExp, string][] = [
  [/Instagram/i, 'Instagram'],
  [/Barcelona/i, 'Threads'],
  [/FBAN|FBAV|FB_IAB|FB4A/i, 'Facebook'],
  [/musical_ly|BytedanceWebview|TikTok/i, 'TikTok'],
  [/LinkedInApp/i, 'LinkedIn'],
  [/Twitter/i, 'X (Twitter)']
]

export function detectInAppBrowser(userAgent: string | null): InAppBrowser | null {
  if (!userAgent) return null
  const match = IN_APP_PATTERNS.find(([pattern]) => pattern.test(userAgent))
  if (!match) return null
  const platform = /iPhone|iPad|iPod/i.test(userAgent) ? 'ios' : /Android/i.test(userAgent) ? 'android' : 'other'
  return { app: match[1], platform }
}
