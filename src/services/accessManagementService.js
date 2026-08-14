import { collection, doc, getDoc, onSnapshot, orderBy, query, runTransaction, serverTimestamp } from 'firebase/firestore'
import { PROTECTED_OWNER_EMAIL, isProtectedOwnerUser } from '../config/protectedOwner'
import { db } from '../lib/firebase'
import { normalizeAccessEmail } from '../utils/accessRoles'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function requireDb() {
  if (!db) throw new Error('Firebase is not configured.')
  return db
}

export function validateOrganizerEmail(rawEmail) {
  const email = normalizeAccessEmail(rawEmail)
  if (!EMAIL_PATTERN.test(email)) throw new Error('Enter a valid email address.')
  if (email === PROTECTED_OWNER_EMAIL) throw new Error('Protected Owner access is pinned by Firebase UID and cannot be edited here.')
  return email
}

export function requireProtectedOwner(user) {
  if (!isProtectedOwnerUser(user)) throw new Error('Only the Protected Owner can change approved organizer access.')
}

function actor(user) {
  return user?.email || user?.uid || 'unknown'
}

function historyPayload({ email, action, status, accessType, user, details = '' }) {
  return {
    targetEmail: email,
    action,
    status,
    accessType,
    changedAt: serverTimestamp(),
    changedBy: actor(user),
    changedByUid: user?.uid || '',
    details,
  }
}

function currentAccessData(snapshot) {
  return snapshot.exists() ? snapshot.data() : { approvedEmails: [], rolesByEmail: {}, approvedOrganizerRecords: {} }
}

export async function getAccessControlSnapshot() {
  const snapshot = await getDoc(doc(requireDb(), 'settings', 'accessControl'))
  return currentAccessData(snapshot)
}

export function subscribeAccessControl(onData, onError) {
  return onSnapshot(
    doc(requireDb(), 'settings', 'accessControl'),
    (snapshot) => onData(currentAccessData(snapshot)),
    onError,
  )
}

export function subscribeAccessHistory(onData, onError) {
  return onSnapshot(
    query(collection(requireDb(), 'settings', 'accessControl', 'history'), orderBy('changedAt', 'desc')),
    (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError,
  )
}

export async function addApprovedOrganizer(rawEmail, user, accessType = 'admin') {
  requireProtectedOwner(user)
  const email = validateOrganizerEmail(rawEmail)
  const accessRef = doc(requireDb(), 'settings', 'accessControl')
  const historyRef = doc(collection(accessRef, 'history'))
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(accessRef)
    const data = currentAccessData(snapshot)
    const approvedEmails = Array.isArray(data.approvedEmails) ? data.approvedEmails.map(normalizeAccessEmail).filter(Boolean) : []
    const records = data.approvedOrganizerRecords && typeof data.approvedOrganizerRecords === 'object' ? data.approvedOrganizerRecords : {}
    if (approvedEmails.includes(email) && records[email]?.status !== 'removed') {
      throw new Error('That organizer is already approved or disabled. Use Restore for a disabled organizer.')
    }
    const nextApprovedEmails = [...new Set([...approvedEmails, email])].sort()
    transaction.set(accessRef, {
      ...data,
      approvedEmails: nextApprovedEmails,
      rolesByEmail: { ...(data.rolesByEmail || {}), [email]: accessType },
      approvedOrganizerRecords: {
        ...records,
        [email]: {
          accessType,
          status: 'active',
          addedAt: records[email]?.addedAt || serverTimestamp(),
          addedBy: records[email]?.addedBy || actor(user),
          lastChangedAt: serverTimestamp(),
          lastChangedBy: actor(user),
        },
      },
      updatedAt: serverTimestamp(),
      updatedBy: actor(user),
    }, { merge: true })
    transaction.set(historyRef, historyPayload({ email, action: 'organizer.add', status: 'active', accessType, user }))
  })
}

export async function changeApprovedOrganizerStatus(rawEmail, user, nextStatus) {
  requireProtectedOwner(user)
  const email = validateOrganizerEmail(rawEmail)
  if (!['active', 'disabled', 'removed'].includes(nextStatus)) throw new Error('Unsupported organizer status.')
  const accessRef = doc(requireDb(), 'settings', 'accessControl')
  const historyRef = doc(collection(accessRef, 'history'))
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(accessRef)
    const data = currentAccessData(snapshot)
    const approvedEmails = Array.isArray(data.approvedEmails) ? data.approvedEmails.map(normalizeAccessEmail).filter(Boolean) : []
    const records = data.approvedOrganizerRecords && typeof data.approvedOrganizerRecords === 'object' ? data.approvedOrganizerRecords : {}
    const existing = records[email] || {}
    if (!approvedEmails.includes(email) && nextStatus !== 'removed') throw new Error('This organizer is not approved yet.')
    const accessType = existing.accessType || data.rolesByEmail?.[email] || 'admin'
    const nextEmails = nextStatus === 'removed'
      ? approvedEmails.filter((item) => item !== email)
      : [...new Set([...approvedEmails, email])].sort()
    const nextRoles = { ...(data.rolesByEmail || {}) }
    if (nextStatus === 'removed') delete nextRoles[email]
    else nextRoles[email] = accessType
    transaction.set(accessRef, {
      ...data,
      approvedEmails: nextEmails,
      rolesByEmail: nextRoles,
      approvedOrganizerRecords: {
        ...records,
        [email]: {
          ...existing,
          accessType,
          status: nextStatus,
          addedAt: existing.addedAt || serverTimestamp(),
          addedBy: existing.addedBy || actor(user),
          lastChangedAt: serverTimestamp(),
          lastChangedBy: actor(user),
        },
      },
      updatedAt: serverTimestamp(),
      updatedBy: actor(user),
    }, { merge: true })
    transaction.set(historyRef, historyPayload({
      email,
      action: nextStatus === 'active' ? 'organizer.restore' : nextStatus === 'disabled' ? 'organizer.disable' : 'organizer.remove',
      status: nextStatus,
      accessType,
      user,
    }))
  })
}
