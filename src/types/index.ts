// types.ts — TypeScript типи
// Файл: src/types/index.ts

// 8. interface — описує форму об'єкта
//    TypeScript перевірить що дані правильні
export interface Lesson {
    id: string
    title: string
    desc: string
    icon: string   // emoji
    xp: number
    progress: number   // 0–100

    // 9. union type — тільки ці три значення
    status: 'done' | 'active' | 'locked'
    statusLabel: string
}
