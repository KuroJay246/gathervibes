import { doc, getDoc } from '@react-native-firebase/firestore'
import { firestore } from '@/lib/firebase'
import { getUserAccessLevel, isApprovedAdmin } from '@gsv/contracts/accessRoles'

function permissionDenied(error) {
  return ['permission-denied', 'firestore/permission-denied'].includes(error?.code)
}

function workspaceAccessError(cause) {
  const error = new Error('This account is not approved for the private Gather & Savor workspace.', { cause })
  error.code = cause?.code === 'permission-denied' ? 'auth/unapproved-account' : 'auth/access-check-failed'
  return error
}

function normalizeAssignedEventIds(staffProfile) {
  return Array.isArray(staffProfile?.assignedEventIds)
    ? [...new Set(staffProfile.assignedEventIds.filter((eventId) => typeof eventId === 'string' && eventId))]
    : []
}

export async function readAdminAccessControl() {
  const snapshot = await getDoc(doc(firestore, 'settings', 'accessControl'))
  return snapshot.exists() ? snapshot.data() : null
}

export async function readStaffAccess(user) {
  const profileSnapshot = await getDoc(doc(firestore, 'staffProfiles', user.uid))
  if (!profileSnapshot.exists()) {
    return {
      staffProfile: null,
      staffAssignments: [],
      assignedEvents: [],
    }
  }

  const staffProfile = profileSnapshot.data()
  const assignmentsByEvent = new Map()
  const assignedEvents = []

  for (const eventId of normalizeAssignedEventIds(staffProfile)) {
    try {
      const assignmentSnapshot = await getDoc(doc(firestore, 'events', eventId, 'staffAssignments', user.uid))
      if (!assignmentSnapshot.exists()) continue

      const assignment = assignmentSnapshot.data()
      if (
        assignment?.uid !== user.uid
        || assignment?.eventId !== eventId
        || assignment?.status !== 'active'
      ) {
        continue
      }

      assignmentsByEvent.set(eventId, assignment)
      const eventSnapshot = await getDoc(doc(firestore, 'events', eventId))
      if (!eventSnapshot.exists()) continue
      assignedEvents.push({ eventId, ...eventSnapshot.data() })
    } catch (error) {
      if (!permissionDenied(error)) throw error
    }
  }

  return {
    staffProfile,
    staffAssignments: [...assignmentsByEvent.values()],
    assignedEvents,
  }
}

export async function verifyWorkspaceAccess(user) {
  if (!user?.uid) throw workspaceAccessError()

  try {
    const accessControl = await readAdminAccessControl()
    if (accessControl) {
      const access = getUserAccessLevel(user, accessControl)
      if (!isApprovedAdmin(access)) throw workspaceAccessError({ code: 'permission-denied' })
      return {
        accessControl,
        staffProfile: null,
        staffAssignments: [],
        assignedEvents: [],
        access,
      }
    }
  } catch (error) {
    if (!permissionDenied(error)) throw workspaceAccessError(error)
  }

  const { staffProfile, staffAssignments, assignedEvents } = await readStaffAccess(user)
  const access = getUserAccessLevel(user, null, staffProfile, staffAssignments, assignedEvents)
  if (access.level !== 'staff' || access.assignedEventIds.length === 0) {
    throw workspaceAccessError({ code: 'permission-denied' })
  }

  return {
    accessControl: null,
    staffProfile,
    staffAssignments,
    assignedEvents,
    access,
  }
}
