export const DOCUMENT_CATEGORIES = [
  'Venue',
  'Agreement / Contract',
  'Finance',
  'Quotation',
  'Receipt',
  'Invoice',
  'Supplier',
  'Sponsor / Partner',
  'Registration',
  'Safety',
  'Permit / Licence',
  'Insurance',
  'Marketing',
  'Event Day',
  'Programme / Schedule',
  'Learning / Workshop Material',
  'Policy',
  'Report',
  'Other',
]

export const DOCUMENT_STATUSES = [
  'Needed',
  'Requested',
  'Received',
  'Draft',
  'Under Review',
  'Approved',
  'Current',
  'Expired',
  'Replaced',
  'Not Required',
]

export const DOCUMENT_TYPES = [
  'External Link',
  'Google Drive',
  'Google Docs',
  'Google Sheets',
  'Website',
  'Reference Location',
  'Other',
]

export const DOCUMENT_FILTERS = [
  'All',
  'Required',
  'Missing / Needed',
  'Requested',
  'Received',
  'Approved',
  'Expiring Soon',
  'Expired',
]

const EXPIRING_SOON_DAYS = 30

export function cleanText(value, maxLength = 1000) {
  return String(value ?? '').trim().slice(0, maxLength)
}

export function normalizeDateString(value = '') {
  const text = cleanText(value, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : ''
}

export function normalizeExternalUrl(value = '') {
  const text = cleanText(value, 1000)
  if (!text) return ''
  try {
    const url = new URL(text)
    if (!['http:', 'https:'].includes(url.protocol)) return ''
    return url.toString()
  } catch {
    return ''
  }
}

export function externalHostname(value = '') {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function createEmptyDocumentDraft(prefill = {}) {
  return {
    title: '',
    category: 'Other',
    description: '',
    status: 'Needed',
    required: false,
    url: '',
    documentType: 'External Link',
    provider: '',
    storageLocation: '',
    linkedContactId: '',
    linkedOrganizationId: '',
    linkedTaskId: '',
    linkedOperationId: '',
    linkedCommitmentId: '',
    dueDate: '',
    expiryDate: '',
    versionLabel: '',
    notes: '',
    ...prefill,
  }
}

export function normalizeDocumentRecord(values = {}, event = {}, existing = {}) {
  const url = normalizeExternalUrl(values.url)
  return {
    documentId: cleanText(values.documentId || existing.documentId, 128),
    eventId: cleanText(event.eventId || values.eventId || existing.eventId, 128),
    eventName: cleanText(event.eventName || values.eventName || existing.eventName, 180),
    title: cleanText(values.title || 'Untitled document', 180),
    category: DOCUMENT_CATEGORIES.includes(values.category) ? values.category : 'Other',
    description: cleanText(values.description, 2000),
    status: DOCUMENT_STATUSES.includes(values.status) ? values.status : 'Needed',
    required: Boolean(values.required),
    url,
    documentType: DOCUMENT_TYPES.includes(values.documentType) ? values.documentType : 'External Link',
    provider: cleanText(values.provider, 120),
    storageLocation: cleanText(values.storageLocation, 240),
    linkedContactId: cleanText(values.linkedContactId, 128),
    linkedOrganizationId: cleanText(values.linkedOrganizationId, 128),
    linkedTaskId: cleanText(values.linkedTaskId, 128),
    linkedOperationId: cleanText(values.linkedOperationId, 128),
    linkedCommitmentId: cleanText(values.linkedCommitmentId, 128),
    dueDate: normalizeDateString(values.dueDate),
    expiryDate: normalizeDateString(values.expiryDate),
    versionLabel: cleanText(values.versionLabel, 80),
    notes: cleanText(values.notes, 2000),
    createdBy: cleanText(existing.createdBy || values.createdBy, 256),
  }
}

export function documentTimingState(document = {}, today = new Date()) {
  if (!document.expiryDate) return 'current'
  const expiry = new Date(`${document.expiryDate}T12:00:00`)
  if (Number.isNaN(expiry.getTime())) return 'current'
  const now = new Date(today)
  now.setHours(12, 0, 0, 0)
  const days = Math.ceil((expiry.getTime() - now.getTime()) / 86400000)
  if (days < 0) return 'expired'
  if (days <= EXPIRING_SOON_DAYS) return 'expiring-soon'
  return 'current'
}

export function effectiveDocumentStatus(document = {}, today) {
  const timing = documentTimingState(document, today)
  if (timing === 'expired') return 'Expired'
  if (timing === 'expiring-soon') return 'Expiring Soon'
  return document.status || 'Needed'
}

export function filterDocuments(documents = [], filter = 'All', contactId = '', organizationId = '') {
  return documents.filter((document) => {
    if (contactId && document.linkedContactId !== contactId) return false
    if (organizationId && document.linkedOrganizationId !== organizationId) return false
    if (filter === 'All') return true
    if (filter === 'Required') return document.required
    if (filter === 'Missing / Needed') return document.required && ['Needed', 'Requested'].includes(document.status)
    if (filter === 'Expiring Soon') return documentTimingState(document) === 'expiring-soon'
    if (filter === 'Expired') return documentTimingState(document) === 'expired' || document.status === 'Expired'
    return document.status === filter
  })
}

export function buildDocumentSummary(documents = []) {
  return documents.reduce((summary, document) => {
    summary.total += 1
    if (document.required) summary.required += 1
    if (document.required && ['Needed', 'Requested'].includes(document.status)) summary.missingRequired += 1
    const timing = documentTimingState(document)
    if (timing === 'expiring-soon') summary.expiringSoon += 1
    if (timing === 'expired') summary.expired += 1
    return summary
  }, { total: 0, required: 0, missingRequired: 0, expiringSoon: 0, expired: 0 })
}

export function documentTaskPrefill(document = {}) {
  const category = document.category || 'document'
  const title = document.title || 'document'
  return {
    title: document.status === 'Expired' ? `Renew ${title}` : `Follow up on ${title}`,
    category: 'Follow-Up',
    responsibleLabel: '',
    dueDate: document.dueDate || document.expiryDate || '',
    status: 'Not Started',
    priority: document.required ? 'High' : 'Normal',
    notes: `Document follow-up: ${category}. ${document.description || document.notes || ''}`.trim(),
  }
}

