'use client'

import { useRouter } from 'next/navigation'
import type { Subject } from '../types'

interface SubjectCardProps {
    subject: Subject
}

export function SubjectCard({ subject }: SubjectCardProps) {
    const router = useRouter()

    function handleClick() {
        router.push(`/subjects/${subject.id}`)
    }

    return (
        <div
            className="lesson-card blue"
            onClick={handleClick}
            style={{ cursor: 'pointer' }}
        >
            <div className="card-top">
                <div className="card-icon blue">
                    {subject.icon}
                </div>
            </div>

            <p className="card-title">{subject.title}</p>
            <p className="card-desc">{subject.desc}</p>
        </div>
    )
}
