export const ACCESS_ROLES = {
  'owner-admin': {
    id: 'owner-admin',
    label: 'Owner/Admin',
    summary: 'Full approved-admin access enforced by settings/accessControl.approvedEmails.',
  },
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
    summary: 'Legacy UI role alias for scanner/check-in-only staff.',
  },
  'event-manager': {
    id: 'event-manager',
    label: 'Event Manager',
    summary: 'Assigned-event operational access. Firestore rules must enforce the event boundary.',
  },
  scanner: {
    id: 'scanner',
    label: 'Scanner',
    summary: 'Assigned-event check-in lookup and check-in completion only.',
  },
  viewer: {
    id: 'viewer',
    label: 'Viewer',
    summary: 'Assigned-event read-only access where a read-only surface is implemented.',
  },
  'operations-helper': {
    id: 'operations-helper',
    label: 'Operations Helper',
    summary: 'Assigned-event operations ledger visibility without admin settings or registration writes.',
  },
}

export const ROLE_ORDER = ['owner-admin', 'owner', 'admin', 'event-manager', 'scanner', 'checkInStaff', 'viewer', 'operations-helper']

const ROLE_ALIASES = {
  owneradmin: 'owner-admin',
  'owner-admin': 'owner-admin',
  owner_admin: 'owner-admin',
  owner: 'owner',
  admin: 'admin',
  checkinstaff: 'checkInStaff',
  'check-in-staff': 'checkInStaff',
  check_in_staff: 'checkInStaff',
  staff: 'checkInStaff',
  scanner: 'scanner',
  checkinonly: 'scanner',
  'check-in-only': 'scanner',
  check_in_only: 'scanner',
  eventmanager: 'event-manager',
  'event-manager': 'event-manager',
  event_manager: 'event-manager',
  viewer: 'viewer',
  readonly: 'viewer',
  'read-only': 'viewer',
  read_only: 'viewer',
  operationshelper: 'operations-helper',
  'operations-helper': 'operations-helper',
  operations_helper: 'operations-helper',
}

const ADMIN_ROLES = new Set(['owner-admin', 'owner', 'admin'])
const ASSIGNED_STAFF_ROLES = new Set(['event-manager', 'scanner', 'viewer', 'operations-helper'])
const DEFAULT_ACCESS = Object.freeze({
  level: 'none',
  role: null,
  roleLabel: 'No access',
  assignedEventIds: [],
  assignmentsByEvent: {},
  assignedEvents: [],
})

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
  if (ADMIN_ROLES.has(normalizedRole)) return 'Full operations while approved by the private allowlist.'
  if (normalizedRole === 'event-manager') return 'Assigned-event operational role. Rules-level writes remain narrow and explicit; live staff access does not enforce scoped rules yet until deployment approval.'
  if (normalizedRole === 'scanner' || normalizedRole === 'checkInStaff') return 'Assigned-event check-in lookup and check-in completion only. No ticket/payment/settings access; live staff access does not enforce scoped rules yet until deployment approval.'
  if (normalizedRole === 'viewer') return 'Assigned-event read-only role where read-only screens are implemented; live staff access does not enforce scoped rules yet until deployment approval.'
  if (normalizedRole === 'operations-helper') return 'Assigned-event operations ledger visibility without admin settings or registration writes; live staff access does not enforce scoped rules yet until deployment approval.'
  return ACCESS_ROLES.admin.summary
}

export function normalizeStaffStatus(status) {
  const normalized = typeof status === 'string' ? status.trim().toLowerCase() : ''
  return ['active', 'inactive', 'revoked'].includes(normalized) ? normalized : 'inactive'
}

export function normalizeStaffProfile(profile = null) {
  if (!profile || typeof profile !== 'object') return null
  const role = normalizeAccessRole(profile.defaultRole)
  return {
    ...profile,
    uid: typeof profile.uid === 'string' ? profile.uid : '',
    email: normalizeAccessEmail(profile.email),
    status: normalizeStaffStatus(profile.status),
    defaultRole: role && ASSIGNED_STAFF_ROLES.has(role) ? role : role,
  }
}

export function normalizeStaffAssignment(assignment = null) {
  if (!assignment || typeof assignment !== 'object') return null
  const role = normalizeAccessRole(assignment.role)
  return {
    ...assignment,
    uid: typeof assignment.uid === 'string' ? assignment.uid : '',
    email: normalizeAccessEmail(assignment.email),
    eventId: typeof assignment.eventId === 'string' ? assignment.eventId : '',
    role,
    status: normalizeStaffStatus(assignment.status),
  }
}

export function getUserAccessLevel(user, accessControl = {}, staffProfile = null, assignments = [], assignedEvents = []) {
  const email = normalizeAccessEmail(user?.email)
  const adminRole = resolveAccessRole(accessControl || {}, email)
  if (adminRole) {
    const normalizedAdminRole = normalizeAccessRole(adminRole) || 'admin'
    return {
      level: 'admin',
      role: normalizedAdminRole === 'owner' ? 'owner-admin' : normalizedAdminRole,
      roleLabel: roleLabel(normalizedAdminRole === 'owner' ? 'owner-admin' : normalizedAdminRole),
      assignedEventIds: [],
      assignmentsByEvent: {},
      assignedEvents: [],
    }
  }

  const profile = normalizeStaffProfile(staffProfile)
  if (!user?.uid || !profile || profile.uid !== user.uid || profile.status !== 'active') return DEFAULT_ACCESS

  const activeAssignments = (Array.isArray(assignments) ? assignments : [])
    .map(normalizeStaffAssignment)
    .filter((assignment) => (
      assignment
      && assignment.uid === user.uid
      && assignment.status === 'active'
      && assignment.eventId
      && ASSIGNED_STAFF_ROLES.has(assignment.role)
    ))

  if (!activeAssignments.length) {
    return {
      ...DEFAULT_ACCESS,
      level: 'staff',
      role: normalizeAccessRole(profile.defaultRole) || null,
      roleLabel: roleLabel(profile.defaultRole),
    }
  }

  const assignmentsByEvent = Object.fromEntries(activeAssignments.map((assignment) => [assignment.eventId, assignment]))
  const safeAssignedEvents = (Array.isArray(assignedEvents) ? assignedEvents : [])
    .filter((event) => event?.eventId && assignmentsByEvent[event.eventId])

  return {
    level: 'staff',
    role: normalizeAccessRole(profile.defaultRole) || activeAssignments[0].role,
    roleLabel: roleLabel(normalizeAccessRole(profile.defaultRole) || activeAssignments[0].role),
    assignedEventIds: activeAssignments.map((assignment) => assignment.eventId),
    assignmentsByEvent,
    assignedEvents: safeAssignedEvents,
  }
}

export function isApprovedAdmin(access = DEFAULT_ACCESS) {
  return access?.level === 'admin' || ADMIN_ROLES.has(normalizeAccessRole(access?.role))
}

export function getAssignmentForEvent(access = DEFAULT_ACCESS, eventId = '') {
  return access?.assignmentsByEvent?.[eventId] || null
}

export function isAssignedStaff(access = DEFAULT_ACCESS, eventId = '') {
  return Boolean(eventId && access?.level === 'staff' && getAssignmentForEvent(access, eventId))
}

export function hasAssignedRole(access = DEFAULT_ACCESS, eventId = '', roles = []) {
  if (isApprovedAdmin(access)) return true
  const allowedRoles = Array.isArray(roles) ? roles.map(normalizeAccessRole) : [normalizeAccessRole(roles)]
  const assignment = getAssignmentForEvent(access, eventId)
  return Boolean(assignment && allowedRoles.includes(normalizeAccessRole(assignment.role)))
}

export function canReadEvent(access = DEFAULT_ACCESS, eventId = '') {
  return isApprovedAdmin(access) || isAssignedStaff(access, eventId)
}

export function canManageEvent(access = DEFAULT_ACCESS, eventId = '') {
  void eventId
  return isApprovedAdmin(access)
}

export function canReadRegistrations(access = DEFAULT_ACCESS, eventId = '') {
  return isApprovedAdmin(access) || hasAssignedRole(access, eventId, ['event-manager', 'scanner', 'viewer'])
}

export function canCheckIn(access = DEFAULT_ACCESS, eventId = '') {
  return isApprovedAdmin(access) || hasAssignedRole(access, eventId, ['scanner'])
}

export function canAssignTickets(access = DEFAULT_ACCESS, eventId = '') {
  void eventId
  return isApprovedAdmin(access)
}

export function canUseOperations(access = DEFAULT_ACCESS, eventId = '') {
  return isApprovedAdmin(access) || hasAssignedRole(access, eventId, ['operations-helper'])
}

export function canWriteOperations(access = DEFAULT_ACCESS, eventId = '') {
  void eventId
  return isApprovedAdmin(access)
}

export function canUseSettings(access = DEFAULT_ACCESS) {
  return isApprovedAdmin(access)
}

export function canViewRoute(access = DEFAULT_ACCESS, route = '') {
  if (isApprovedAdmin(access)) return true
  const normalizedRoute = route === '/' ? '/dashboard' : route
  const role = normalizeAccessRole(access?.role)
  if (role === 'scanner') return normalizedRoute === '/scanner'
  if (role === 'operations-helper') return normalizedRoute === '/operations'
  if (role === 'viewer') return normalizedRoute === '/dashboard'
  if (role === 'event-manager') return ['/dashboard', '/check-in'].includes(normalizedRoute)
  return false
}

export function defaultRouteForAccess(access = DEFAULT_ACCESS) {
  if (isApprovedAdmin(access)) return '/dashboard'
  const role = normalizeAccessRole(access?.role)
  if (role === 'scanner') return '/scanner'
  if (role === 'operations-helper') return '/operations'
  return '/dashboard'
}
