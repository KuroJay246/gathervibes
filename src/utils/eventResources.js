import { toDateInput } from './dateUtils.js'

export const RESOURCE_CATEGORIES = [
  'Equipment',
  'Supplies',
  'Signage',
  'Furniture',
  'Decor',
  'Food / Beverage',
  'Technology',
  'Safety',
  'Documents / Print',
  'Packaging',
  'Transport',
  'Other',
]

export const RESOURCE_SOURCE_TYPES = ['Owned', 'Purchased', 'Rented', 'Borrowed', 'Supplier Provided', 'Venue Provided', 'Sponsor / Partner Provided']
export const RESOURCE_STATUSES = ['Needed', 'Requested', 'Ordered / Reserved', 'Confirmed', 'Received', 'Packed', 'On Site', 'Returned', 'Cancelled']

const LEGACY_RESOURCE_CATEGORIES = {
  Media: 'Technology',
  'Food Service': 'Food / Beverage',
}

const LEGACY_RESOURCE_SOURCE_TYPES = {
  supplier: 'Supplier Provided',
  vendor: 'Supplier Provided',
  venue: 'Venue Provided',
  sponsor: 'Sponsor / Partner Provided',
}

const LEGACY_RESOURCE_STATUSES = {
  Partial: 'Requested',
}

function cleanText(value, maxLength = 1000) {
  return String(value ?? '').trim().slice(0, maxLength)
}

function cleanList(values = [], maxItems = 40) {
  if (!Array.isArray(values)) return []
  const cleaned = []
  for (const value of values) {
    const next = cleanText(value, 128)
    if (next) cleaned.push(next)
    if (cleaned.length >= maxItems) break
  }
  return cleaned
}

function cleanQuantity(value, fallback = 0) {
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) return fallback
  return Math.min(999999, Math.round(number))
}

export function createEmptyResource(prefill = {}) {
  return {
    name: '',
    category: 'Equipment',
    sourceType: 'Owned',
    status: 'Needed',
    quantityNeeded: 1,
    quantityConfirmed: 0,
    unit: '',
    location: '',
    supplierContactId: '',
    supplierOrganizationId: '',
    supplierLabel: '',
    packingRequired: false,
    pickupRequired: false,
    returnRequired: false,
    pickupDueDate: '',
    returnDueDate: '',
    notes: '',
    linkedTaskId: '',
    linkedDocumentIds: [],
    linkedOperationId: '',
    linkedCommitmentId: '',
    linkedRunOfShowItemIds: [],
    criticalForEvent: false,
    ...prefill,
  }
}

export function normalizeEventResource(values = {}, event = {}, existing = {}) {
  const quantityNeeded = cleanQuantity(values.quantityNeeded, existing.quantityNeeded || 0)
  const quantityConfirmed = cleanQuantity(values.quantityConfirmed, existing.quantityConfirmed || 0)
  const categoryValue = LEGACY_RESOURCE_CATEGORIES[values.category] || values.category
  const sourceTypeValue = LEGACY_RESOURCE_SOURCE_TYPES[values.sourceType] || values.sourceType
  const statusValue = LEGACY_RESOURCE_STATUSES[values.status] || values.status
  return {
    resourceId: cleanText(values.resourceId || existing.resourceId, 128),
    eventId: cleanText(event.eventId || values.eventId || existing.eventId, 128),
    eventName: cleanText(event.eventName || values.eventName || existing.eventName, 180),
    name: cleanText(values.name || 'Untitled resource', 180),
    category: RESOURCE_CATEGORIES.includes(categoryValue) ? categoryValue : 'Other',
    sourceType: RESOURCE_SOURCE_TYPES.includes(sourceTypeValue) ? sourceTypeValue : 'Owned',
    status: RESOURCE_STATUSES.includes(statusValue) ? statusValue : 'Needed',
    quantityNeeded,
    quantityConfirmed,
    unit: cleanText(values.unit, 40),
    shortage: Math.max(0, quantityNeeded - quantityConfirmed),
    location: cleanText(values.location, 180),
    supplierContactId: cleanText(values.supplierContactId, 128),
    supplierOrganizationId: cleanText(values.supplierOrganizationId, 128),
    supplierLabel: cleanText(values.supplierLabel, 180),
    packingRequired: Boolean(values.packingRequired),
    pickupRequired: Boolean(values.pickupRequired),
    returnRequired: Boolean(values.returnRequired),
    pickupDueDate: toDateInput(values.pickupDueDate),
    returnDueDate: toDateInput(values.returnDueDate),
    notes: cleanText(values.notes, 2000),
    linkedTaskId: cleanText(values.linkedTaskId, 128),
    linkedDocumentIds: cleanList(values.linkedDocumentIds || existing.linkedDocumentIds),
    linkedOperationId: cleanText(values.linkedOperationId, 128),
    linkedCommitmentId: cleanText(values.linkedCommitmentId, 128),
    linkedRunOfShowItemIds: cleanList(values.linkedRunOfShowItemIds || existing.linkedRunOfShowItemIds),
    criticalForEvent: Boolean(values.criticalForEvent),
    createdAt: existing.createdAt || values.createdAt || null,
    createdBy: cleanText(existing.createdBy || values.createdBy, 256),
    updatedAt: values.updatedAt || existing.updatedAt || null,
    updatedBy: cleanText(values.updatedBy || existing.updatedBy, 256),
  }
}

export function validateEventResource(values = {}) {
  const resource = normalizeEventResource(values)
  const errors = []
  if (!resource.name) errors.push('Resource name is required.')
  if (resource.quantityNeeded < 0 || resource.quantityConfirmed < 0) errors.push('Quantities must be zero or greater.')
  if (resource.quantityConfirmed > resource.quantityNeeded && resource.quantityNeeded > 0) errors.push('Confirmed quantity should not exceed needed quantity.')
  return errors
}

export function buildResourceSummary(resources = [], today = new Date()) {
  const rows = Array.isArray(resources) ? resources.map(normalizeEventResource) : []
  const todayText = today.toISOString().slice(0, 10)
  return {
    total: rows.length,
    shortages: rows.filter((resource) => resource.shortage > 0 && resource.status !== 'Cancelled').length,
    criticalShortages: rows.filter((resource) => resource.criticalForEvent && resource.shortage > 0 && resource.status !== 'Cancelled').length,
    needed: rows.filter((resource) => resource.status === 'Needed').length,
    confirmed: rows.filter((resource) => ['Confirmed', 'Received', 'Packed', 'On Site', 'Returned'].includes(resource.status)).length,
    packed: rows.filter((resource) => resource.status === 'Packed').length,
    packingIncomplete: rows.filter((resource) => resource.packingRequired && !['Packed', 'On Site', 'Returned', 'Cancelled'].includes(resource.status)).length,
    onSite: rows.filter((resource) => resource.status === 'On Site').length,
    pickupDue: rows.filter((resource) => resource.pickupRequired && resource.pickupDueDate && resource.pickupDueDate <= todayText && !['On Site', 'Returned', 'Cancelled'].includes(resource.status)).length,
    returnOverdue: rows.filter((resource) => resource.returnRequired && resource.returnDueDate && resource.returnDueDate < todayText && resource.status !== 'Returned' && resource.status !== 'Cancelled').length,
  }
}

export function resourceTaskPrefill(resource = {}) {
  const normalized = normalizeEventResource(resource)
  return {
    title: `Resource follow-up: ${normalized.name}`,
    category: 'Equipment and Supplies',
    dueDate: normalized.pickupDueDate || normalized.returnDueDate || '',
    status: 'Not Started',
    priority: normalized.shortage > 0 ? 'High' : 'Normal',
    responsibleLabel: normalized.supplierLabel,
    notes: `Resource follow-up: ${normalized.name}. Shortage: ${normalized.shortage}. ${normalized.notes}`.trim(),
  }
}
