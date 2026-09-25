export function sortRunOfShowItems(items = []) {
  return [...items].sort((left, right) => String(left.date || '').localeCompare(String(right.date || '')) || String(left.startTime || '').localeCompare(String(right.startTime || '')) || Number(left.sequence || 0) - Number(right.sequence || 0) || String(left.title || '').localeCompare(String(right.title || '')))
}

export function groupRunOfShowItems(items = []) {
  const ordered = sortRunOfShowItems(items)
  return {
    ordered,
    current: ordered.filter((item) => item.status === 'In Progress'),
    next: ordered.filter((item) => ['Confirmed', 'Planned'].includes(item.status)).slice(0, 1),
    upcoming: ordered.filter((item) => !['In Progress', 'Completed', 'Cancelled', 'Delayed', 'Confirmed'].includes(item.status)),
    delayed: ordered.filter((item) => item.status === 'Delayed'),
    completed: ordered.filter((item) => item.status === 'Completed'),
  }
}
