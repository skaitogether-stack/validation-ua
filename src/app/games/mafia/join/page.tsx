import type { Metadata } from 'next'
import { JoinByCode } from '../../../../components/games/mafia/online/JoinByCode'

export const metadata: Metadata = {
  title: 'Приєднатися до гри «Мафія» — Validation',
  description: 'Введіть код кімнати, щоб приєднатися до гри з друзями.'
}

export default function MafiaJoinPage() {
  return <JoinByCode />
}
