import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { normalizeAccessEmail, normalizeAccessRole } from '../utils/accessRoles'

const STAFF_ROLES = new Set(['event-manager', 'viewer', 'scanner', 'operations-helper'])

function requireDb() {
  if (!db) throw new Error('Firebase is not configured.')
  return db
}

function actor(user) {
  return user?.email || user?.uid || 'unknown'
}

export function subscribeStaffProfiles(onData, onError) {
  return onSnapshot(
    query(collection(requireDb(), 'staffProfiles'), orderBy('email')),
    (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError,
  )
}

export function subscribeStaffAssignments(eventId, onData, onError) {
  if (!eventId) {
    onData([])
    return () => undefined
  }
  return onSnapshot(
    query(collection(requireDb(), 'events', eventId, 'staffAssignments'), orderBy('email')),
    (snapshot) => onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError,
  )
}

export async function listStaffHistory(eventId) {
  const globalHistory = await getDocs(query(collection(requireDb(), 'staffHistory'), orderBy('changedAt', 'desc')))
  const eventHistory = eventId
    ? await getDocs(query(collection(requireDb(), 'events', eventId, 'staffAssignmentHistory'), orderBy('changedAt', 'desc')))
    : { docs: [] }
  return [
    ...globalHistory.docs.map((item) => ({ id: item.id, ...item.data() })),
    ...eventHistory.docs.map((item) => ({ id: item.id, ...item.data() })),
  ].sort((a, b) => {
    const aTime = typeof a.changedAt?.toMillis === 'function' ? a.changedAt.toMillis() : 0
    const bTime = typeof b.changedAt?.toMillis === 'function' ? b.changedAt.toMillis() : 0
    return bTime - aTime
  })
}

function validateStaffProfile({ uid, email, displayName, defaultRole }) {
  const cleanUid = typeof uid === 'string' ? uid.trim() : ''
  const cleanEmail = normalizeAccessEmail(email)
  const role = normalizeAccessRole(defaultRole)
  if (!cleanUid) throw new Error('Staff account ID is required for staff access.')
  if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('A valid staff email is required.')
  if (!STAFF_ROLES.has(role)) throw new Error('Choose a valid staff role.')
  return {
    uid: cleanUid,
    email: cleanEmail,
    displayName: typeof displayName === 'string' ? displayName.trim().slice(0, 120) : '',
    defaultRole: role,
  }
}

export async function saveStaffProfile(profile, user) {
  const clean = validateStaffProfile(profile)
  const profileRef = doc(requireDb(), 'staffProfiles', clean.uid)
  const existingStatus = profile.status === 'inactive' || profile.status === 'revoked' ? profile.status : 'active'
  const payload = {
    ...clean,
    status: existingStatus,
    createdAt: profile.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: profile.createdBy || actor(user),
    updatedBy: actor(user),
  }
  await setDoc(profileRef, payload, { merge: true })
  await setDoc(doc(collection(requireDb(), 'staffHistory')), {
    uid: clean.uid,
    email: clean.email,
    action: profile.createdAt ? 'staff-profile.update' : 'staff-profile.save',
    status: payload.status,
    role: clean.defaultRole,
    changedAt: serverTimestamp(),
    changedBy: actor(user),
    changedByUid: user?.uid || '',
  })
}

export async function setStaffProfileStatus(profile, user, status) {
  if (!profile?.uid) throw new Error('Select a staff profile first.')
  const next = { ...profile, status: status === 'active' ? 'active' : 'inactive' }
  await saveStaffProfile(next, user)
}

export async function saveStaffAssignment({ eventId, uid, email, role, status = 'active' }, user) {
  const cleanUid = typeof uid === 'string' ? uid.trim() : ''
  const cleanEmail = normalizeAccessEmail(email)
  const cleanRole = normalizeAccessRole(role)
  if (!eventId) throw new Error('Select a working event before assigning staff.')
  if (!cleanUid || !cleanEmail || !STAFF_ROLES.has(cleanRole)) throw new Error('Assignment requires staff UID, email, and role.')
  const assignmentRef = doc(requireDb(), 'events', eventId, 'staffAssignments', cleanUid)
  const existing = await getDoc(assignmentRef)
  const existingData = existing.exists() ? existing.data() : {}
  const payload = {
    uid: cleanUid,
    email: cleanEmail,
    eventId,
    role: cleanRole,
    status: status === 'revoked' || status === 'inactive' ? status : 'active',
    createdAt: existingData.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: existingData.createdBy || actor(user),
    updatedBy: actor(user),
  }
  await setDoc(assignmentRef, payload, { merge: true })
  await setDoc(doc(collection(requireDb(), 'events', eventId, 'staffAssignmentHistory')), {
    uid: cleanUid,
    email: cleanEmail,
    eventId,
    action: payload.status === 'revoked' ? 'staff-assignment.remove' : 'staff-assignment.save',
    status: payload.status,
    role: cleanRole,
    changedAt: serverTimestamp(),
    changedBy: actor(user),
    changedByUid: user?.uid || '',
  })
}
