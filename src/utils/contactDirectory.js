export const CONTACT_CATEGORIES = [
  'Venue',
  'Supplier',
  'Vendor',
  'Sponsor',
  'Partner',
  'Restaurant / Caterer',
  'Facilitator',
  'Photographer',
  'Decorator',
  'Printer',
  'Entertainment',
  'Technical',
  'Transport',
  'Corporate Client',
  'Cultural Partner',
  'Government / Institution',
  'Helper / Staff Contact',
  'Other',
]

export const CONTACT_STATUSES = ['Active', 'Inactive', 'Do Not Use']

export const RELATIONSHIP_TYPES = [
  'Venue contact',
  'Supplier',
  'Sponsor',
  'Facilitator',
  'Corporate client',
  'Helper',
  'Partner',
  'Other',
]

function clean(value, max = 1000) {
  return String(value ?? '').trim().slice(0, max)
}

export function normalizeContactSearch(value = '') {
  return clean(value, 320).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function normalizePhone(value = '') {
  return clean(value, 64).replace(/[^\d+]/g, '')
}

export function createEmptyContactDraft(prefill = {}) {
  return {
    displayName: '',
    firstName: '',
    lastName: '',
    organizationId: '',
    roleTitle: '',
    category: 'Other',
    email: '',
    phone: '',
    preferredContactMethod: '',
    location: '',
    website: '',
    socialLink: '',
    status: 'Active',
    notes: '',
    ...prefill,
  }
}

export function createEmptyOrganizationDraft(prefill = {}) {
  return {
    name: '',
    category: 'Other',
    primaryContactId: '',
    email: '',
    phone: '',
    website: '',
    socialLink: '',
    location: '',
    status: 'Active',
    notes: '',
    ...prefill,
  }
}

export function createEmptyRelationshipDraft(prefill = {}) {
  return {
    contactId: '',
    organizationId: '',
    relationshipType: 'Other',
    roleForEvent: '',
    status: 'Active',
    primaryForEvent: false,
    notes: '',
    ...prefill,
  }
}

export function normalizeWebsite(value = '') {
  const text = clean(value, 500)
  if (!text) return ''
  try {
    const url = new URL(text)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''
  } catch {
    return ''
  }
}

export function contactPayload(values = {}, existing = {}) {
  const displayName = clean(values.displayName || `${values.firstName || ''} ${values.lastName || ''}`, 180)
  return {
    contactId: clean(values.contactId || existing.contactId, 128),
    displayName: displayName || 'Unnamed contact',
    firstName: clean(values.firstName, 90),
    lastName: clean(values.lastName, 90),
    organizationId: clean(values.organizationId, 128),
    roleTitle: clean(values.roleTitle, 120),
    category: CONTACT_CATEGORIES.includes(values.category) ? values.category : 'Other',
    email: clean(values.email, 320).toLowerCase(),
    phone: clean(values.phone, 64),
    phoneNormalized: normalizePhone(values.phone),
    preferredContactMethod: clean(values.preferredContactMethod, 80),
    location: clean(values.location, 240),
    website: normalizeWebsite(values.website),
    socialLink: normalizeWebsite(values.socialLink),
    status: CONTACT_STATUSES.includes(values.status) ? values.status : 'Active',
    notes: clean(values.notes, 2000),
    searchText: normalizeContactSearch(`${displayName} ${values.email || ''} ${values.phone || ''} ${values.category || ''}`),
    createdBy: clean(existing.createdBy || values.createdBy, 256),
  }
}

export function organizationPayload(values = {}, existing = {}) {
  return {
    organizationId: clean(values.organizationId || existing.organizationId, 128),
    name: clean(values.name || 'Unnamed organization', 180),
    category: CONTACT_CATEGORIES.includes(values.category) ? values.category : 'Other',
    primaryContactId: clean(values.primaryContactId, 128),
    email: clean(values.email, 320).toLowerCase(),
    phone: clean(values.phone, 64),
    phoneNormalized: normalizePhone(values.phone),
    website: normalizeWebsite(values.website),
    socialLink: normalizeWebsite(values.socialLink),
    location: clean(values.location, 240),
    status: CONTACT_STATUSES.includes(values.status) ? values.status : 'Active',
    notes: clean(values.notes, 2000),
    searchText: normalizeContactSearch(`${values.name || ''} ${values.email || ''} ${values.phone || ''} ${values.category || ''}`),
    createdBy: clean(existing.createdBy || values.createdBy, 256),
  }
}

export function relationshipPayload(values = {}, event = {}, existing = {}) {
  return {
    linkId: clean(values.linkId || existing.linkId, 128),
    eventId: clean(event.eventId || values.eventId || existing.eventId, 128),
    eventName: clean(event.eventName || values.eventName || existing.eventName, 180),
    contactId: clean(values.contactId, 128),
    organizationId: clean(values.organizationId, 128),
    relationshipType: RELATIONSHIP_TYPES.includes(values.relationshipType) ? values.relationshipType : 'Other',
    roleForEvent: clean(values.roleForEvent, 120),
    status: CONTACT_STATUSES.includes(values.status) ? values.status : 'Active',
    primaryForEvent: Boolean(values.primaryForEvent),
    notes: clean(values.notes, 1000),
    createdBy: clean(existing.createdBy || values.createdBy, 256),
  }
}

export function findContactDuplicateCandidates(candidate = {}, contacts = [], organizations = []) {
  const email = clean(candidate.email, 320).toLowerCase()
  const phone = normalizePhone(candidate.phone)
  const orgName = normalizeContactSearch(candidate.name || candidate.displayName || '')
  return {
    contacts: contacts.filter((contact) => (
      (email && contact.email === email)
      || (phone && contact.phoneNormalized === phone)
    )),
    organizations: organizations.filter((organization) => (
      orgName && normalizeContactSearch(organization.name) === orgName
    )),
  }
}

export function filterContacts(contacts = [], organizations = [], filters = {}) {
  const search = normalizeContactSearch(filters.search)
  return contacts.filter((contact) => {
    const organization = organizations.find((item) => item.organizationId === contact.organizationId)
    const haystack = normalizeContactSearch(`${contact.searchText || ''} ${organization?.name || ''}`)
    if (search && !haystack.includes(search)) return false
    if (filters.category && filters.category !== 'All' && contact.category !== filters.category) return false
    if (filters.status && filters.status !== 'All' && contact.status !== filters.status) return false
    if (filters.organizationId && contact.organizationId !== filters.organizationId) return false
    return true
  })
}
