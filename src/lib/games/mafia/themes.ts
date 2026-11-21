// Тексти ведучого й назви ролей для двох тем оформлення.
// Механіка однакова, змінюються лише слова та іконки.

import type { RoleId, Team, ThemeId } from './types'

export interface RoleText {
  name: string
  icon: string
  goal: string
  night: string // що робить уночі
  action: string // підказка на екрані нічного ходу
}

export interface ThemeStrings {
  title: string
  icon: string
  place: string // «місто» / «ліс» — у знахідному відмінку для фраз
  roles: Record<RoleId, RoleText>
  teams: Record<Team, string>
  sleep: string
  wake: string
  nightNobody: string
  nightEliminated: (name: string) => string
  dayEliminated: (name: string) => string
  dayNobody: string
  win: Record<Team, string>
  spectator: string
}

const city: ThemeStrings = {
  title: 'Місто',
  icon: '🏙️',
  place: 'місто',
  roles: {
    mafia: {
      name: 'Мафія',
      icon: '🕶️',
      goal: 'Непомітно позбутися мирних жителів. Удень не видавай себе!',
      night: 'Уночі разом з партнерами обираєш, кого відвідати.',
      action: 'Кого мафія відвідає цієї ночі?'
    },
    doctor: {
      name: 'Лікар',
      icon: '🩺',
      goal: 'Допоможи місту знайти мафію.',
      night: 'Уночі обираєш, кого лікувати. Якщо мафія прийде саме до нього — він залишиться в грі.',
      action: 'Кого лікуєш цієї ночі?'
    },
    detective: {
      name: 'Комісар',
      icon: '🔎',
      goal: 'Знайди мафію і переконай місто.',
      night: 'Уночі перевіряєш одного гравця й дізнаєшся, чи він мафія.',
      action: 'Кого перевіряєш цієї ночі?'
    },
    civilian: {
      name: 'Мирний житель',
      icon: '🏠',
      goal: 'Удень уважно слухай і разом з містом знайди мафію.',
      night: 'Уночі в тебе немає особливої дії — лише позначаєш, кого підозрюєш.',
      action: 'Кого ти підозрюєш? (можна пропустити)'
    }
  },
  teams: { town: 'Мирне місто', mafia: 'Мафія' },
  sleep: 'Місто засинає 🌙',
  wake: 'Місто прокидається ☀️',
  nightNobody: 'Цієї ночі мафія нікого не забрала!',
  nightEliminated: name => `Цієї ночі мафія відвідала гравця ${name}.`,
  dayEliminated: name => `Місто вирішило: ${name} залишає гру.`,
  dayNobody: 'Сьогодні місто нікого не вигнало.',
  win: { town: 'Перемогло мирне місто!', mafia: 'Перемогла мафія!' },
  spectator: 'Тепер ти спостерігач. Не підказуй іншим 🤫'
}

const forest: ThemeStrings = {
  title: 'Ліс',
  icon: '🌲',
  place: 'ліс',
  roles: {
    mafia: {
      name: 'Вовк',
      icon: '🐺',
      goal: 'Непомітно забери зайчиків у нору. Удень не видавай себе!',
      night: 'Уночі разом з іншими вовками обираєш, кого забрати.',
      action: 'Кого вовки заберуть цієї ночі?'
    },
    doctor: {
      name: 'Знахарка',
      icon: '🌿',
      goal: 'Допоможи лісу знайти вовків.',
      night: 'Уночі обираєш, кого захистити травами. Якщо вовки прийдуть саме до нього — він залишиться в грі.',
      action: 'Кого захищаєш цієї ночі?'
    },
    detective: {
      name: 'Сова',
      icon: '🦉',
      goal: 'Знайди вовків і переконай лісових мешканців.',
      night: 'Уночі зазираєш до одного гравця й дізнаєшся, чи він вовк.',
      action: 'До кого зазираєш цієї ночі?'
    },
    civilian: {
      name: 'Зайчик',
      icon: '🐰',
      goal: 'Удень уважно слухай і разом з лісом знайди вовків.',
      night: 'Уночі в тебе немає особливої дії — лише позначаєш, кого підозрюєш.',
      action: 'Кого ти підозрюєш? (можна пропустити)'
    }
  },
  teams: { town: 'Мешканці лісу', mafia: 'Вовки' },
  sleep: 'Ліс засинає 🌙',
  wake: 'Ліс прокидається ☀️',
  nightNobody: 'Цієї ночі вовки нікого не забрали!',
  nightEliminated: name => `Цієї ночі вовки забрали в нору гравця ${name}.`,
  dayEliminated: name => `Ліс вирішив: ${name} іде з галявини.`,
  dayNobody: 'Сьогодні ліс нікого не вигнав.',
  win: { town: 'Перемогли мешканці лісу!', mafia: 'Перемогли вовки!' },
  spectator: 'Тепер ти спостерігач. Не підказуй іншим 🤫'
}

export const THEMES: Record<ThemeId, ThemeStrings> = { city, forest }
