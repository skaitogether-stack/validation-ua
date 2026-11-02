import { headers } from 'next/headers'
import { detectInAppBrowser } from '../../lib/inAppBrowser'
import { StandaloneSignIn } from '../StandaloneSignIn'

const STEPS = [
  { icon: '🎬', title: 'Подивіться відео', text: 'Коротка відеопрезентація до кожного параграфа підручника.' },
  { icon: '🃏', title: 'Вивчіть терміни на флешкартах', text: 'Повторюємо картки, доки кожну не позначите «Знаю».' },
  { icon: '📝', title: 'Перевірте себе тестом', text: 'Одразу бачите правильну відповідь і пояснення до помилок.' }
]

// Вхід у «Біологію», як і в диктант, окремий від кабінетів: після авторизації повертаємо на ту саму сторінку
export async function BiologySignIn({ callbackUrl }: { callbackUrl: string }) {
  const inApp = detectInAppBrowser((await headers()).get('user-agent'))
  return (
    <StandaloneSignIn
      inApp={inApp}
      callbackUrl={callbackUrl}
      icon="🧬"
      title="Біологія, 7 клас"
      subtitle="Готуйтеся до уроків за параграфами підручника: відео, флешкарти й тести."
      steps={STEPS}
      note="Безкоштовно. Вхід через Google займає кілька секунд."
    />
  )
}
