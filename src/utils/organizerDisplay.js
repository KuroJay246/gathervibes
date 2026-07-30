import { PROTECTED_OWNER_UID } from '../config/protectedOwner.js'

export const TRUSTED_ORGANIZER_NAMES_BY_UID = {
  [PROTECTED_OWNER_UID]: 'Jaylan',
  WM2UOQtSeuOglCI5uMZQKrYYqP53: 'Anica',
}

function firstName(value = '') {
  return typeof value === 'string' ? value.trim().split(/\s+/)[0] || '' : ''
}

export function trustedOrganizerFirstName(user = null, staffProfile = null) {
  return (
    firstName(staffProfile?.displayName)
    || firstName(user?.displayName)
    || TRUSTED_ORGANIZER_NAMES_BY_UID[user?.uid]
    || ''
  )
}

export function welcomeAboardMessage(user = null, staffProfile = null) {
  const name = trustedOrganizerFirstName(user, staffProfile)
  return name ? `Welcome aboard, ${name}.` : 'Welcome aboard. Your Event Hub is ready.'
}

export function welcomeGreeting(user = null, staffProfile = null) {
  const name = trustedOrganizerFirstName(user, staffProfile)
  return name ? `Welcome, ${name}` : 'Welcome to Your Gather & Savor Event Hub'
}
