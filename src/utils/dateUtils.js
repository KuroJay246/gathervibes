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
