'use client'

// LessonCard.tsx — компонент картки уроку
// Файл: src/components/LessonCard.tsx

import { useRouter } from 'next/navigation'
import type { Lesson } from '../types'

// 2. Описуємо які props приймає компонент
//    Props — це параметри, як у функції
interface LessonCardProps {
    lesson: Lesson       // об'єкт уроку
}

// 3. Сам компонент — звичайна функція
//    що повертає JSX (HTML + JS разом)
export function LessonCard({ lesson }: LessonCardProps) {
    const router = useRouter()

    // 4. Логіка — визначаємо колір по статусу
    const color = {
        done: 'green',
        active: 'blue',
        locked: 'amber',
    }[lesson.status]

    function handleClick() {
        if (lesson.status === 'locked') return  // заблоковані не відкриваємо
        router.push(`/lessons/${lesson.id}`)    // переходимо на сторінку уроку
    }

    // 5. Повертаємо розмітку
    //    className замість class (React)
    return (
        <div
            className={`lesson-card ${color}`}
            onClick={handleClick}
        >
            <div className="card-top">
                <div className={`card-icon ${color}`}>
                    {lesson.icon} {/* emoji з об'єкта */}
                </div>
                <span className={`card-badge ${lesson.status}`}>
                    {lesson.statusLabel}
                </span>
            </div>

            <p className="card-title">{lesson.title}</p>
            <p className="card-desc">{lesson.desc}</p>

            <div className="card-footer">
                <span className="card-xp">+{lesson.xp} XP</span>
                <div className="card-progress">
                    <div
                        className={`card-progress-fill ${color}`}
                        // 6. Inline стиль для динамічного значення
                        style={{ width: `${lesson.progress}%` }}
                    />
                </div>
                <span className="card-pct">
                    {lesson.progress}%
                </span>
            </div>
        </div>
    )
}