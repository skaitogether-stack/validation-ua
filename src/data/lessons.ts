import { Lesson } from '../types';

// Приклад даних (потім буде з API)
export const lessons: Lesson[] = [
  {
    id: 'orth-1',
    title: 'Ненаголошені е, и',
    desc: 'Як перевіряти ненаголошені голосні',
    icon: '📝', xp: 50, progress: 100,
    status: 'done', statusLabel: 'Пройдено',
  },
  {
    id: 'orth-2',
    title: 'Апостроф',
    desc: 'Коли ставити апостроф після б, п, в, м, ф',
    icon: '✏️', xp: 40, progress: 60,
    status: 'active', statusLabel: 'Активний',
  },
  {
    id: 'orth-3',
    title: 'М\'який знак',
    desc: 'Правила вживання м\'якого знака',
    icon: '🔤', xp: 60, progress: 0,
    status: 'locked', statusLabel: 'Заблоковано',
  },
  {
    id: 'morph-1',
    title: 'Іменник',
    desc: 'Відмінювання іменників 6 клас',
    icon: '📚', xp: 70, progress: 0,
    status: 'locked', statusLabel: 'Заблоковано',
  },
];
