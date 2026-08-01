import { detectHeaderField, normalizeEmail, normalizePhone } from './importUtils.js'

export const FORM_TARGET_TYPES = [
  'guest-registration',
  'baker-application',
  'vendor-application',
  'sponsor-inquiry',
  'volunteer-application',
  'school-participation',
  'feedback',
  'custom-review-record',
]

export const FORM_CONNECTION_STATUSES = ['draft', 'packaged', 'active', 'paused', 'disabled']

export const FORM_CONNECTION_STATUS_LABELS = {
  draft: 'Manual Response Review',
  packaged: 'Automatic Receiver Packaged but Not Deployed',
  active: 'Automatic Receiver Connected',
  paused: 'Connection Needs Attention',
  disabled: 'Connection Needs Attention',
}

export const FORM_RESPONSE_STATUSES = [
  'new',
  'needs-review',
  'approved',
  'imported',
  'wait-listed',
  'rejected',
  'duplicate',
  'information-requested',
  'linked',
]

export const FORM_INBOX_COLUMNS = [
  'New',
  'Needs Review',
  'Approved',
  'Ready to Import',
  'Imported',
  'Waiting for Information',
  'Wait-Listed',
  'Duplicates',
  'Rejected',
  'History',
]

export const FORM_REVIEW_ACTIONS = [
  ['review', 'Review'],
  ['approve', 'Approve'],
  ['request-information', 'Request Information'],
  ['wait-list', 'Wait-List'],
  ['reject', 'Reject'],
  ['mark-duplicate', 'Mark Duplicate'],
  ['link-existing', 'Link to Existing Record'],
]

const STATUS_BY_ACTION = {
  review: 'needs-review',
  approve: 'approved',
  import: 'approved',
  'request-information': 'information-requested',
  'wait-list': 'wait-listed',
  reject: 'rejected',
  'mark-duplicate': 'duplicate',
  'link-existing': 'linked',
}

export function formConnectionStatusLabel(connection = {}) {
  return FORM_CONNECTION_STATUS_LABELS[connection.status] || FORM_CONNECTION_STATUS_LABELS.paused
}

export function formResponseStatusLabel(status = '') {
  const labels = {
    new: 'New',
    'needs-review': 'Needs Review',
    approved: 'Approved',
    imported: 'Imported',
    'wait-listed': 'Wait-Listed',
    rejected: 'Rejected',
    duplicate: 'Duplicate',
    'information-requested': 'Waiting for Information',
    linked: 'Linked Existing',
  }
  return labels[status] || 'Needs Review'
}

export function buildManualFormConnection(event = {}, overrides = {}) {
  return {
    connectionId: overrides.connectionId || `manual-${event?.eventId || 'unscoped'}`,
    connectionName: overrides.connectionName || 'Manual Google Forms response review',
    formId: overrides.formId || '',
    eventId: overrides.eventId || event?.eventId || '',
    targetType: FORM_TARGET_TYPES.includes(overrides.targetType) ? overrides.targetType : 'guest-registration',
    status: FORM_CONNECTION_STATUSES.includes(overrides.status) ? overrides.status : 'draft',
    mappingVersion: overrides.mappingVersion || 'manual-v1',
    lastResponseAt: overrides.lastResponseAt || null,
    lastSuccessAt: overrides.lastSuccessAt || null,
    lastFailureAt: overrides.lastFailureAt || null,
    secretReferenceId: overrides.secretReferenceId || 'not-stored-in-frontend',
  }
}

function normalizedHeader(header = '') {
  return String(header).toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
}

function valueFor(headers, parsedRow, candidates) {
  const candidateSet = new Set(candidates)
  const index = headers.findIndex((header) => candidateSet.has(normalizedHeader(header)))
  return index >= 0 ? String(parsedRow.data[index] || '').trim() : ''
}

function detectedSummary(headers, parsedRow) {
  const pairs = headers.map((header, index) => [detectHeaderField(normalizedHeader(header), String(header).toLowerCase()).field, parsedRow.data[index]])
  const fieldValue = (field) => pairs.find(([candidate, value]) => candidate === field && String(value || '').trim())?.[1] || ''
  return {
    name: String(fieldValue('fullName') || fieldValue('buyerName') || valueFor(headers, parsedRow, ['business name', 'company name']) || 'Unnamed response').trim(),
    email: normalizeEmail(fieldValue('email')),
    phone: normalizePhone(String(fieldValue('phone') || '')),
  }
}

export function buildFormResponsesFromParsedRows(headers = [], parsedRows = [], options = {}) {
  const connection = options.connection || buildManualFormConnection(options.event, options.connectionOverrides)
  return parsedRows.map((parsedRow, index) => {
    const responseId = valueFor(headers, parsedRow, ['response id', 'responseid', 'submission id', 'id'])
      || `${connection.connectionId}:row-${parsedRow._sourceRowIndex || index + 1}`
    const receivedAt = valueFor(headers, parsedRow, ['timestamp', 'submitted', 'submission time', 'received time'])
    const summary = detectedSummary(headers, parsedRow)
    const mappedFieldCount = headers.filter((header) => detectHeaderField(normalizedHeader(header), String(header).toLowerCase()).field).length
    const missingInformation = [
      !summary.name || summary.name === 'Unnamed response' ? 'name' : '',
      !summary.email && !summary.phone ? 'email or phone' : '',
      mappedFieldCount === 0 ? 'mapping template' : '',
    ].filter(Boolean)
    const warnings = [
      connection.status !== 'active' ? 'Connection is not active; automatic delivery is disabled.' : '',
      !connection.eventId ? 'No linked event is configured.' : '',
      !FORM_TARGET_TYPES.includes(connection.targetType) ? 'Unsupported target type.' : '',
    ].filter(Boolean)
    return {
      responseId,
      connectionId: connection.connectionId,
      sourceForm: connection.connectionName,
      formId: connection.formId,
      eventId: connection.eventId,
      targetType: connection.targetType,
      receivedAt: receivedAt || null,
      respondentSummary: summary,
      mappedFields: mappedFieldCount,
      missingInformation,
      warnings,
      duplicateCandidates: [],
      status: missingInformation.length || warnings.length ? 'needs-review' : 'new',
      originalRowIndex: parsedRow._sourceRowIndex || index + 1,
    }
  })
}

export function findFormResponseDuplicateCandidates(response = {}, existingResponses = [], existingRegistrations = []) {
  const email = response.respondentSummary?.email
  const phone = response.respondentSummary?.phone
  const normalizedName = String(response.respondentSummary?.name || '').trim().toLowerCase()
  const candidates = []

  if (existingResponses.some((candidate) => candidate.responseId && candidate.responseId === response.responseId)) {
    candidates.push('same Google response ID already exists in the inbox')
  }
  if (email && existingRegistrations.some((registration) => registration.email === email)) {
    candidates.push('email matches an existing registration')
  }
  if (phone && existingRegistrations.some((registration) => registration.phone === phone)) {
    candidates.push('contact number matches an existing registration')
  }
  if (normalizedName && existingRegistrations.some((registration) => String(registration.fullName || '').trim().toLowerCase() === normalizedName)) {
    candidates.push('name matches an existing registration')
  }

  return candidates
}

export function applyFormInboxAction(response = {}, action = '') {
  const status = STATUS_BY_ACTION[action]
  if (!status) return { ...response, status: response.status || 'needs-review' }
  return {
    ...response,
    status,
    reviewed: true,
    reviewAction: action,
  }
}

export function buildFormInboxSummary(responses = []) {
  const initial = Object.fromEntries(FORM_RESPONSE_STATUSES.map((status) => [status, 0]))
  for (const response of responses) {
    const status = FORM_RESPONSE_STATUSES.includes(response.status) ? response.status : 'needs-review'
    initial[status] += 1
  }
  return {
    total: responses.length,
    ...initial,
    reviewRequired: responses.filter((response) => ['new', 'needs-review'].includes(response.status)).length,
    convertible: responses.filter((response) => ['approved'].includes(response.status)).length,
    waitingForInformation: responses.filter((response) => response.status === 'information-requested').length,
    duplicateCount: responses.filter((response) => response.status === 'duplicate').length,
    historyCount: responses.filter((response) => ['imported', 'rejected', 'linked'].includes(response.status)).length,
  }
}
