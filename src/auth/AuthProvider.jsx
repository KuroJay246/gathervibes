import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { collectionGroup, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '../lib/firebase'
import { AuthContext } from './AuthContext'
import {
  defaultRouteForAccess,
  getUserAccessLevel,
  isApprovedAdmin,
  normalizeAccessEmail,
  resolveAccessRole,
  roleLabel,
} from '../utils/accessRoles'

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

const FIREBASE_APP_HOST = 'gathervibeshub.firebaseapp.com'
const WEB_APP_HOST = 'gathervibeshub.web.app'

function redirectToWebAppHostIfNeeded() {
  if (typeof window === 'undefined' || window.location.hostname !== FIREBASE_APP_HOST) {
    return false
  }
  if (window.location.pathname.startsWith('/__/auth/')) return false

  const targetUrl = new URL(window.location.href)
  targetUrl.hostname = WEB_APP_HOST
  window.location.replace(targetUrl.toString())
  return true
}

function workspaceAccessError(cause) {
  const error = new Error('This account is not approved for the private Gather & Savor workspace.', { cause })
  error.code = cause?.code === 'permission-denied' ? 'auth/unapproved-account' : 'auth/access-check-failed'
  return error
}

async function readAdminAccessControl(nextUser) {
  const accessDocument = await getDoc(doc(db, 'settings', 'accessControl'))
  if (!accessDocument.exists()) return null

  const data = accessDocument.data()
  const approvedEmails = Array.isArray(data?.approvedEmails) ? data.approvedEmails : []
  const userEmail = normalizeAccessEmail(nextUser.email)

  if (!approvedEmails.map(normalizeAccessEmail).includes(userEmail)) return null
  return data
}

async function readStaffAccess(nextUser) {
  const profileSnapshot = await getDoc(doc(db, 'staffProfiles', nextUser.uid))
  if (!profileSnapshot.exists()) return { staffProfile: null, staffAssignments: [], assignedEvents: [] }

  const staffProfile = profileSnapshot.data()
  const assignmentsSnapshot = await getDocs(query(
    collectionGroup(db, 'staffAssignments'),
    where('uid', '==', nextUser.uid),
    where('status', '==', 'active'),
  ))
  const staffAssignments = assignmentsSnapshot.docs.map((assignmentDoc) => assignmentDoc.data())
  const assignedEvents = []

  for (const assignment of staffAssignments) {
    if (!assignment?.eventId) continue
    try {
      const eventSnapshot = await getDoc(doc(db, 'events', assignment.eventId))
      if (eventSnapshot.exists()) assignedEvents.push(eventSnapshot.data())
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[Diagnostic] Assigned event read failed:', {
          eventId: assignment.eventId,
          errorCode: error?.code,
          errorMessage: error?.message,
        })
      }
    }
  }

  return { staffProfile, staffAssignments, assignedEvents }
}

// verifyAdminAccess remains the approved-admin branch inside this broader staff-role workspace access check.
async function verifyWorkspaceAccess(nextUser) {
  if (!nextUser || !db) throw workspaceAccessError()

  try {
    let accessControl = null
    try {
      accessControl = await readAdminAccessControl(nextUser)
    } catch (error) {
      if (!['permission-denied', 'firestore/permission-denied'].includes(error?.code) && import.meta.env.DEV) {
        console.warn('[Diagnostic] accessControl read failed before staff fallback:', {
          errorCode: error?.code,
          errorMessage: error?.message,
        })
      }
    }

    if (accessControl) {
      const access = getUserAccessLevel(nextUser, accessControl)
      if (!isApprovedAdmin(access)) throw workspaceAccessError({ code: 'permission-denied' })
      return { accessControl, staffProfile: null, staffAssignments: [], assignedEvents: [], access }
    }

    const { staffProfile, staffAssignments, assignedEvents } = await readStaffAccess(nextUser)
    const access = getUserAccessLevel(nextUser, null, staffProfile, staffAssignments, assignedEvents)
    if (access.level !== 'staff') throw workspaceAccessError({ code: 'permission-denied' })
    return { accessControl: null, staffProfile, staffAssignments, assignedEvents, access }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[Diagnostic] verifyWorkspaceAccess failed:', {
        errorCode: error?.code,
        errorMessage: error?.message,
        authProvider: nextUser.providerData?.[0]?.providerId,
        currentDomain: window.location.hostname,
        firebaseConfigured: isFirebaseConfigured,
        email: nextUser.email,
        emailLower: typeof nextUser.email === 'string' ? nextUser.email.toLowerCase() : null,
      })
    }
    
    if (error?.code?.startsWith('auth/')) throw error
    if (error?.code === 'permission-denied' || error?.code === 'firestore/permission-denied') {
      throw workspaceAccessError({ code: 'permission-denied' })
    }
    throw workspaceAccessError(error)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessControl, setAccessControl] = useState(null)
  const [staffProfile, setStaffProfile] = useState(null)
  const [staffAssignments, setStaffAssignments] = useState([])
  const [assignedEvents, setAssignedEvents] = useState([])
  const [access, setAccess] = useState(() => getUserAccessLevel(null))
  const [loading, setLoading] = useState(isFirebaseConfigured)
  const [authError, setAuthError] = useState('')
  const currentRole = useMemo(() => access.role || resolveAccessRole(accessControl, user?.email) || 'admin', [access.role, accessControl, user?.email])
  const currentRoleLabel = useMemo(() => access.roleLabel || roleLabel(currentRole), [access.roleLabel, currentRole])

  useEffect(() => {
    if (!auth) {
      return undefined
    }

    let active = true
    let redirectSettled = false

    async function approveUser(nextUser) {
      if (!active) return

      setLoading(true)
      try {
        const accessData = await verifyWorkspaceAccess(nextUser)
        if (active) {
          setUser(nextUser)
          setAccessControl(accessData.accessControl)
          setStaffProfile(accessData.staffProfile)
          setStaffAssignments(accessData.staffAssignments)
          setAssignedEvents(accessData.assignedEvents)
          setAccess(accessData.access)
          setAuthError('')
          redirectToWebAppHostIfNeeded()
        }
      } catch (error) {
        if (active) {
          setUser(null)
          setAccessControl(null)
          setStaffProfile(null)
          setStaffAssignments([])
          setAssignedEvents([])
          setAccess(getUserAccessLevel(null))
          setAuthError(error.code || 'auth/access-check-failed')
        }
        await firebaseSignOut(auth)
      } finally {
        if (active) setLoading(false)
      }
    }

    getRedirectResult(auth)
      .then(async (result) => {
        redirectSettled = true
        if (!active) return

        if (result?.user) {
          await approveUser(result.user)
          return
        }

        if (!auth.currentUser) {
          setUser(null)
          setAccessControl(null)
          setStaffProfile(null)
          setStaffAssignments([])
          setAssignedEvents([])
          setAccess(getUserAccessLevel(null))
          setLoading(false)
        }
      })
      .catch((error) => {
        redirectSettled = true
        if (active) {
          setUser(null)
          setAuthError(error.code || 'auth/redirect-failed')
          setLoading(false)
        }
      })

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!active) return

      if (!nextUser) {
        if (redirectSettled) {
          setUser(null)
          setAccessControl(null)
          setLoading(false)
        }
        return
      }

      await approveUser(nextUser)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const completeSignIn = useCallback(async (signInRequest) => {
    if (!auth) throw new Error('Firebase is not configured')
    setAuthError('')

    const result = await signInRequest()
    try {
      const accessData = await verifyWorkspaceAccess(result.user)
      setUser(result.user)
      setAccessControl(accessData.accessControl)
      setStaffProfile(accessData.staffProfile)
      setStaffAssignments(accessData.staffAssignments)
      setAssignedEvents(accessData.assignedEvents)
      setAccess(accessData.access)
      return result
    } catch (error) {
      await firebaseSignOut(auth)
      setAccessControl(null)
      setStaffProfile(null)
      setStaffAssignments([])
      setAssignedEvents([])
      setAccess(getUserAccessLevel(null))
      setAuthError(error.code || 'auth/access-check-failed')
      throw error
    }
  }, [])

  const startGoogleSignIn = useCallback(async (mode) => {
    if (!auth) throw new Error('Firebase is not configured')
    setAuthError('')
    void mode

    try {
      return await completeSignIn(() => signInWithPopup(auth, googleProvider))
    } catch (error) {
      if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/cancelled-popup-request') {
        setAuthError('')
        return signInWithRedirect(auth, googleProvider)
      }

      throw error
    }
  }, [completeSignIn])

  const value = useMemo(
    () => ({
      user,
      accessControl,
      staffProfile,
      staffAssignments,
      assignedEvents,
      access,
      currentRole,
      currentRoleLabel,
      defaultRoute: defaultRouteForAccess(access),
      loading,
      authError,
      isConfigured: isFirebaseConfigured,
      signIn: (email, password) => completeSignIn(() => signInWithEmailAndPassword(auth, email, password)),
      signInWithGoogle: () => startGoogleSignIn('login'),
      signUpWithGoogle: () => startGoogleSignIn('signup'),
      signOut: () => {
        if (!auth) return Promise.resolve()
        setUser(null)
        setAccessControl(null)
        setStaffProfile(null)
        setStaffAssignments([])
        setAssignedEvents([])
        setAccess(getUserAccessLevel(null))
        return firebaseSignOut(auth)
      },
    }),
    [access, accessControl, assignedEvents, authError, completeSignIn, currentRole, currentRoleLabel, loading, staffAssignments, staffProfile, startGoogleSignIn, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
