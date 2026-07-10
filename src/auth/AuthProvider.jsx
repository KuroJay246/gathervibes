import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  browserLocalPersistence,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '../lib/firebase'
import { AuthContext } from './AuthContext'
import {
  clearGoogleSignInState,
  readGoogleSignInState,
  sanitizeReturnPath,
  shouldFallbackToRedirectSignIn,
  shouldPreferRedirectGoogleSignIn,
  isPopupCancelledError,
  storeGoogleSignInState,
} from './authFlow'
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
const STAFF_ASSIGNMENT_EVENT_IDS = ['xPfa0b3KZyLSDnAD2uGI']
const AUTH_STORAGE_ERROR_CODE = 'auth/persistence-failed'

let persistenceInitializationPromise = null
let redirectResultPromise = null

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

function logAuthDiagnostic(stage, details = {}) {
  if (!import.meta.env.DEV) return
  console.info('[AuthDiagnostic]', stage, details)
}

function workspaceAccessError(cause) {
  const error = new Error('This account is not approved for the private Gather & Savor workspace.', { cause })
  error.code = cause?.code === 'permission-denied' ? 'auth/unapproved-account' : 'auth/access-check-failed'
  return error
}

function persistenceInitializationError(cause) {
  const error = new Error('Firebase auth persistence could not be initialized.', { cause })
  error.code = AUTH_STORAGE_ERROR_CODE
  return error
}

function clearResolvedAccessState(setters) {
  setters.setAccessControl(null)
  setters.setStaffProfile(null)
  setters.setStaffAssignments([])
  setters.setAssignedEvents([])
  setters.setAccess(getUserAccessLevel(null))
}

function handOffAuthorizedLoginRoute(access) {
  if (typeof window === 'undefined') return
  if (window.location.pathname !== '/login') return

  const defaultRoute = defaultRouteForAccess(access)
  const storedState = readGoogleSignInState()
  const targetRoute = sanitizeReturnPath(storedState?.path || defaultRoute, {
    defaultRoute,
    allowScanner: defaultRoute === '/scanner',
  })

  clearGoogleSignInState()
  if (window.location.pathname === targetRoute) return
  window.location.replace(targetRoute)
}

async function ensureAuthPersistence() {
  if (!auth) return
  if (!persistenceInitializationPromise) {
    persistenceInitializationPromise = setPersistence(auth, browserLocalPersistence).catch((error) => {
      persistenceInitializationPromise = null
      throw persistenceInitializationError(error)
    })
  }
  await persistenceInitializationPromise
}

async function getRedirectResultOnce() {
  if (!auth) return null
  if (!redirectResultPromise) {
    redirectResultPromise = getRedirectResult(auth).catch((error) => {
      redirectResultPromise = null
      throw error
    })
  }
  return redirectResultPromise
}

async function waitForFirebaseUser(nextUser, { attempts = 2 } = {}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await nextUser.getIdToken(attempt > 0)
    if (attempt < attempts - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 120))
    }
  }
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
  const staffAssignments = []
  const assignedEvents = []

  for (const eventId of STAFF_ASSIGNMENT_EVENT_IDS) {
    try {
      const assignmentSnapshot = await getDoc(doc(db, 'events', eventId, 'staffAssignments', nextUser.uid))
      if (!assignmentSnapshot.exists()) continue

      const assignment = assignmentSnapshot.data()
      if (assignment?.uid !== nextUser.uid || assignment?.status !== 'active' || assignment?.eventId !== eventId) continue

      staffAssignments.push(assignment)
      const eventSnapshot = await getDoc(doc(db, 'events', eventId))
      if (eventSnapshot.exists()) assignedEvents.push(eventSnapshot.data())
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[Diagnostic] Staff assignment/event read failed:', {
          eventId,
          errorCode: error?.code,
          errorMessage: error?.message,
        })
      }
    }
  }

  return { staffProfile, staffAssignments, assignedEvents }
}

async function verifyWorkspaceAccess(nextUser) {
  if (!nextUser || !db) throw workspaceAccessError()

  await waitForFirebaseUser(nextUser)

  for (let attempt = 0; attempt < 2; attempt += 1) {
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
        } else if (attempt === 0) {
          await nextUser.getIdToken(true)
          await new Promise((resolve) => window.setTimeout(resolve, 150))
          continue
        }
      }

      if (accessControl) {
        const access = getUserAccessLevel(nextUser, accessControl)
        if (!isApprovedAdmin(access)) throw workspaceAccessError({ code: 'permission-denied' })
        return { accessControl, staffProfile: null, staffAssignments: [], assignedEvents: [], access }
      }

      const { staffProfile, staffAssignments, assignedEvents } = await readStaffAccess(nextUser)
      const access = getUserAccessLevel(nextUser, null, staffProfile, staffAssignments, assignedEvents)
      if (access.level !== 'staff' || access.assignedEventIds.length === 0) throw workspaceAccessError({ code: 'permission-denied' })
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
          attempt: attempt + 1,
        })
      }

      if (error?.code?.startsWith('auth/')) throw error
      if ((error?.code === 'permission-denied' || error?.code === 'firestore/permission-denied') && attempt === 0) {
        await nextUser.getIdToken(true)
        await new Promise((resolve) => window.setTimeout(resolve, 150))
        continue
      }
      if (error?.code === 'permission-denied' || error?.code === 'firestore/permission-denied') {
        throw workspaceAccessError({ code: 'permission-denied' })
      }
      throw workspaceAccessError(error)
    }
  }

  throw workspaceAccessError()
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
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authInitialized, setAuthInitialized] = useState(!isFirebaseConfigured)
  const currentRole = useMemo(() => access.role || resolveAccessRole(accessControl, user?.email) || 'admin', [access.role, accessControl, user?.email])
  const currentRoleLabel = useMemo(() => access.roleLabel || roleLabel(currentRole), [access.roleLabel, currentRole])

  useEffect(() => {
    if (!auth) {
      return undefined
    }

    let active = true
    let unsubscribe = () => undefined

    async function resolveAuthorizedUser(nextUser) {
      if (!active) return

      logAuthDiagnostic('access-resolution-start', {
        hasUser: Boolean(nextUser),
        provider: nextUser?.providerData?.[0]?.providerId || null,
      })

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
          setIsAuthorized(true)
          setAuthError('')
          setAuthInitialized(true)
          logAuthDiagnostic('access-resolution-complete', {
            level: accessData.access?.level,
            role: accessData.access?.role || null,
          })
          if (!redirectToWebAppHostIfNeeded()) {
            handOffAuthorizedLoginRoute(accessData.access)
          }
        }
      } catch (error) {
        if (active) {
          setUser(nextUser)
          clearResolvedAccessState({
            setAccessControl,
            setStaffProfile,
            setStaffAssignments,
            setAssignedEvents,
            setAccess,
          })
          setIsAuthorized(false)
          setAuthError(error.code || 'auth/access-check-failed')
          setAuthInitialized(true)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    async function initializeAuthLifecycle() {
      setLoading(true)
      setAuthError('')
      logAuthDiagnostic('auth-initialization-start', { host: window.location.hostname })

      try {
        await ensureAuthPersistence()
        if (!active) return

        logAuthDiagnostic('auth-persistence-ready')

        unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
          if (!active) return

          logAuthDiagnostic('auth-state-changed', {
            hasUser: Boolean(nextUser),
            route: window.location.pathname,
          })

          if (!nextUser) {
            setUser(null)
            clearResolvedAccessState({
              setAccessControl,
              setStaffProfile,
              setStaffAssignments,
              setAssignedEvents,
              setAccess,
            })
            setIsAuthorized(false)
            setAuthInitialized(true)
            setLoading(false)
            return
          }

          await resolveAuthorizedUser(nextUser)
        })

        try {
          await getRedirectResultOnce()
          logAuthDiagnostic('redirect-result-checked')
        } catch (error) {
          if (!active) return
          setAuthError(error.code || 'auth/redirect-failed')
          logAuthDiagnostic('redirect-result-error', {
            code: error?.code || 'auth/redirect-failed',
          })
        }

        if (typeof auth.authStateReady === 'function') {
          await auth.authStateReady()
          logAuthDiagnostic('auth-state-ready')
        }

        if (!active) return

        if (!auth.currentUser) {
          setAuthInitialized(true)
          setLoading(false)
        }
      } catch (error) {
        if (!active) return
        setUser(null)
        clearResolvedAccessState({
          setAccessControl,
          setStaffProfile,
          setStaffAssignments,
          setAssignedEvents,
          setAccess,
        })
        setIsAuthorized(false)
        setAuthError(error.code || AUTH_STORAGE_ERROR_CODE)
        setAuthInitialized(true)
        setLoading(false)
        logAuthDiagnostic('auth-initialization-error', {
          code: error?.code || AUTH_STORAGE_ERROR_CODE,
        })
      }
    }

    void initializeAuthLifecycle()

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const completeSignIn = useCallback(async (signInRequest, requestedReturnPath = '/dashboard') => {
    if (!auth) throw new Error('Firebase is not configured')
    setAuthError('')
    setLoading(true)

    const result = await signInRequest()
    try {
      const accessData = await verifyWorkspaceAccess(result.user)
      setUser(result.user)
      setAccessControl(accessData.accessControl)
      setStaffProfile(accessData.staffProfile)
      setStaffAssignments(accessData.staffAssignments)
      setAssignedEvents(accessData.assignedEvents)
      setAccess(accessData.access)
      setIsAuthorized(true)
      setAuthInitialized(true)
      setLoading(false)
      const roleDefaultRoute = defaultRouteForAccess(accessData.access)
      if (!redirectToWebAppHostIfNeeded()) {
        handOffAuthorizedLoginRoute(accessData.access)
      }
      return {
        ...result,
        workspaceDefaultRoute: sanitizeReturnPath(requestedReturnPath, {
          defaultRoute: roleDefaultRoute,
          allowScanner: roleDefaultRoute === '/scanner',
        }),
      }
    } catch (error) {
      setUser(result.user)
      clearResolvedAccessState({
        setAccessControl,
        setStaffProfile,
        setStaffAssignments,
        setAssignedEvents,
        setAccess,
      })
      setIsAuthorized(false)
      setAuthInitialized(true)
      setAuthError(error.code || 'auth/access-check-failed')
      setLoading(false)
      throw error
    }
  }, [])

  const startGoogleSignIn = useCallback(async (returnTo) => {
    if (!auth) throw new Error('Firebase is not configured')
    setAuthError('')
    setLoading(true)
    const safeReturnTo = sanitizeReturnPath(returnTo)

    await ensureAuthPersistence()

    const prefersRedirect = shouldPreferRedirectGoogleSignIn({
      hostname: window.location.hostname,
      userAgent: window.navigator.userAgent,
      standalone: Boolean(window.navigator.standalone),
    })

    if (!prefersRedirect) {
      try {
        storeGoogleSignInState(safeReturnTo, { strategy: 'popup' })
        return await completeSignIn(() => signInWithPopup(auth, googleProvider), safeReturnTo)
      } catch (error) {
        if (isPopupCancelledError(error?.code)) {
          setLoading(false)
          throw error
        }

        if (!shouldFallbackToRedirectSignIn(error?.code)) {
          setLoading(false)
          throw error
        }
      }
    }

    storeGoogleSignInState(safeReturnTo, { strategy: 'redirect' })
    await signInWithRedirect(auth, googleProvider)
    return null
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
      authInitialized,
      isAuthorized,
      authError,
      isConfigured: isFirebaseConfigured,
      signIn: (email, password, returnTo = '/dashboard') => completeSignIn(() => signInWithEmailAndPassword(auth, email, password), returnTo),
      signInWithGoogle: (returnTo) => startGoogleSignIn(returnTo),
      signUpWithGoogle: (returnTo) => startGoogleSignIn(returnTo),
      signOut: () => {
        if (!auth) return Promise.resolve()
        setUser(null)
        clearResolvedAccessState({
          setAccessControl,
          setStaffProfile,
          setStaffAssignments,
          setAssignedEvents,
          setAccess,
        })
        setIsAuthorized(false)
        return firebaseSignOut(auth)
      },
    }),
    [access, accessControl, assignedEvents, authError, authInitialized, completeSignIn, currentRole, currentRoleLabel, isAuthorized, loading, staffAssignments, staffProfile, startGoogleSignIn, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
