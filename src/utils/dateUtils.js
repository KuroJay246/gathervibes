export function dateFromValue(value) {
  if (!value) return null
  if (typeof value.toDate === 'function') return value.toDate()

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00`)
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function toDateInput(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value

  const date = dateFromValue(value)
  if (!date) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatEventDate(value, options = {}) {
  const date = dateFromValue(value)
  if (!date) return 'Date not set'

  return new Intl.DateTimeFormat('en-BB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(date)
}

export function parseTimestampSafely(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Returns { days, hours, minutes, seconds, total } until targetDate,
 * or null if the date is in the past or invalid.
 */
export function getCountdown(targetValue) {
  const target = dateFromValue(targetValue)
  if (!target) return null

  const diffMs = target.getTime() - Date.now()
  if (diffMs <= 0) return null

  const total = diffMs
  const seconds = Math.floor((diffMs / 1000) % 60)
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60)
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24)
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  return { days, hours, minutes, seconds, total }
}

/**
 * Returns a human-readable countdown string, e.g. "12 days 3 h" or "47 min".
 */
export function formatCountdown(targetValue) {
  const c = getCountdown(targetValue)
  if (!c) return 'Past'

  if (c.days > 0) return `${c.days}d ${c.hours}h`
  if (c.hours > 0) return `${c.hours}h ${c.minutes}m`
  if (c.minutes > 0) return `${c.minutes}m`
  return 'Today'
}

/**
 * Filters and sorts events that are upcoming or active, by eventDate ascending.
 */
export function upcomingEvents(events) {
  if (!Array.isArray(events)) return []
  const now = Date.now()
  return events
    .filter((ev) => {
      const d = dateFromValue(ev.eventDate)
      return d && d.getTime() >= now && ['upcoming', 'active', 'draft'].includes(ev.status)
    })
    .sort((a, b) => {
      const da = dateFromValue(a.eventDate)
      const db = dateFromValue(b.eventDate)
      return (da?.getTime() ?? 0) - (db?.getTime() ?? 0)
    })
}
