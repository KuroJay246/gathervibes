export const PAYMENT_STATUSES = ['paid', 'pending', 'complimentary', 'door', 'unknown']

export const PAYMENT_STATUS_LABELS = {
  paid: 'Paid',
  pending: 'Pending',
  complimentary: 'Complimentary',
  door: 'Door',
  unknown: 'Unknown',
  'door-list': 'Door',
}

export function normalizePaymentStatus(value) {
  const raw = String(value || '').trim()
  if (!raw) return 'unknown'

  const normalized = raw.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (normalized === 'paid') return 'paid'
  if (normalized === 'pending' || normalized === 'unpaid') return 'pending'
  if (normalized === 'complimentary' || normalized === 'comp') return 'complimentary'
  if ([
    'door',
    'door payment',
    'pay at door',
    'door sale',
    'walk in',
    'walk-in',
    'door list',
  ].includes(normalized)) return 'door'

  return 'unknown'
}

export function isUnknownOrganizerPaymentStatus(originalValue, normalizedValue = normalizePaymentStatus(originalValue)) {
  return Boolean(String(originalValue || '').trim()) && normalizedValue === 'unknown'
}

export function formatPaymentLabel(value) {
  return PAYMENT_STATUS_LABELS[value] || PAYMENT_STATUS_LABELS[normalizePaymentStatus(value)] || 'Unknown'
}

export function paymentStatusMatches(registrationStatus, filterStatus) {
  if (!filterStatus || filterStatus === 'all') return true
  return normalizePaymentStatus(registrationStatus) === normalizePaymentStatus(filterStatus)
}
