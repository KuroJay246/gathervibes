export const PROTECTED_OWNER_UID = 'WcDU2jmbopdAgDlMMWvD3TkqqbC3'
export const PROTECTED_OWNER_EMAIL = 'jaylanspencer99@gmail.com'

export function normalizeOwnerEmail(email = '') {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

export function isProtectedOwnerUser(user = null) {
  return Boolean(user?.uid && user.uid === PROTECTED_OWNER_UID)
}

export function isProtectedOwnerEmail(email = '') {
  return normalizeOwnerEmail(email) === PROTECTED_OWNER_EMAIL
}
