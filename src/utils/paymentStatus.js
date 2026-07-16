export const PAYMENT_STATUSES = ['paid', 'pending', 'complimentary', 'door', 'door-list', 'unknown']

export const PAYMENT_STATUS_LABELS = {
  paid: 'Paid',
  pending: 'Pending',
  complimentary: 'Complimentary',
  door: 'Door Paid',
  'door-list': 'To Pay at Door',
  unknown: 'Unknown',
}

export function normalizePaymentStatus(value) {
  const raw = String(value || '').trim()
  if (!raw) return 'unknown'

  const normalized = raw.toLowerCase().replace(/[_\-–—]+/g, ' ').replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()
  if (normalized === 'paid' || normalized === 'paid confirmed' || normalized.startsWith('paid confirmed ') || normalized === 'payment confirmed') return 'paid'
  if (normalized === 'pending' || normalized === 'unpaid') return 'pending'
  if (normalized === 'partial' || normalized === 'partial payment' || normalized === 'part paid' || normalized === 'partially paid') return 'pending'
  if (normalized === 'complimentary' || normalized === 'comp') return 'complimentary'
  if ([
    'door',
    'door payment',
    'door paid',
    'door sale',
    'walk in',
    'walk-in',
  ].includes(normalized)) return 'door'
  
  if ([
    'pay at door',
    'to pay at door',
    'door list',
  ].includes(normalized)) return 'door-list'

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
