export const ACCESS_ROLES = {
  owner: {
    id: 'owner',
    label: 'Owner',
    summary: 'Full workspace access and future admin access management.',
  },
  admin: {
    id: 'admin',
    label: 'Admin',
    summary: 'Full event operations, imports, registrations, tickets, finance, QA, and settings.',
  },
  checkInStaff: {
    id: 'checkInStaff',
    label: 'Check-In Staff',
    summary: 'Future scoped access for door lookup, ticket search, check-in, and undo check-in.',
  },
  viewer: {
    id: 'viewer',
    label: 'Viewer',
    summary: 'Future read-only access for dashboards, guest summaries, tickets, communications, and QA.',
  },
}

export const ROLE_ORDER = ['owner', 'admin', 'checkInStaff', 'viewer']

const ROLE_ALIASES = {
  owner: 'owner',
  admin: 'admin',
  checkinstaff: 'checkInStaff',
  'check-in-staff': 'checkInStaff',
  check_in_staff: 'checkInStaff',
  staff: 'checkInStaff',
  viewer: 'viewer',
  readonly: 'viewer',
  'read-only': 'viewer',
  read_only: 'viewer',
}

export function normalizeAccessEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

export function normalizeAccessRole(role) {
  const key = typeof role === 'string' ? role.trim().replace(/\s+/g, '').toLowerCase() : ''
  return ROLE_ALIASES[key] || null
}

export function roleLabel(role) {
  return ACCESS_ROLES[normalizeAccessRole(role) || role]?.label || ACCESS_ROLES.admin.label
}

export function isApprovedEmail(accessControl = {}, email = '') {
  const normalizedEmail = normalizeAccessEmail(email)
  const approvedEmails = Array.isArray(accessControl?.approvedEmails)
    ? accessControl.approvedEmails.map(normalizeAccessEmail)
    : []
  return approvedEmails.includes(normalizedEmail)
}

export function resolveAccessRole(accessControl = {}, email = '') {
  const normalizedEmail = normalizeAccessEmail(email)
  if (!normalizedEmail || !isApprovedEmail(accessControl, normalizedEmail)) return null

  const rolesByEmail = accessControl?.rolesByEmail && typeof accessControl.rolesByEmail === 'object'
    ? accessControl.rolesByEmail
    : {}
  const role = normalizeAccessRole(rolesByEmail[normalizedEmail])
  return role || 'admin'
}

export function listApprovedAccessEntries(accessControl = {}) {
  const approvedEmails = Array.isArray(accessControl?.approvedEmails) ? accessControl.approvedEmails : []
  return approvedEmails
    .map(normalizeAccessEmail)
    .filter(Boolean)
    .sort()
    .map((email) => ({
      email,
      role: resolveAccessRole(accessControl, email) || 'admin',
    }))
}

export function roleCapabilitySummary(role) {
  const normalizedRole = normalizeAccessRole(role) || 'admin'
  if (normalizedRole === 'owner') return 'Full access. Future owner-only controls may live here.'
  if (normalizedRole === 'admin') return 'Full operations while approved by the private allowlist.'
  if (normalizedRole === 'checkInStaff') return 'Planned door-only role. Current release displays this role but does not enforce scoped rules yet.'
  if (normalizedRole === 'viewer') return 'Planned read-only role. Current release displays this role but does not enforce scoped rules yet.'
  return ACCESS_ROLES.admin.summary
}
