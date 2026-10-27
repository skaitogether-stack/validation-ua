// Статистика платформи доступна лише власникам продукту (не адмінам шкіл),
// список email задається змінною середовища STATS_ADMIN_EMAILS через кому
export function isStatsAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  const allowed = (process.env.STATS_ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(email.toLowerCase())
}
