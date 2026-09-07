const absoluteFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'America/New_York',
})

export function formatActivityTime(value: string, nowMs: number) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const elapsed = Math.max(0, nowMs - date.getTime())
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (elapsed < minute) return 'now'
  if (elapsed < hour) return `${Math.floor(elapsed / minute)}m`
  if (elapsed < day) return `${Math.floor(elapsed / hour)}h`
  if (elapsed < 7 * day) return `${Math.floor(elapsed / day)}d`

  return absoluteFormatter.format(date)
}
