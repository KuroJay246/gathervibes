import { useCallback, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from '@react-native-firebase/auth'
import { auth, firebaseRuntimeConfig, googleWebClientId } from '@/lib/firebase'
import { resolveNativeAuthMode } from '@/lib/authMode'
import { defaultRouteForAccess, roleLabel } from '@gsv/contracts/accessRoles'
import { verifyWorkspaceAccess } from '@/services/access'
import { signInWithNativeGoogle, signOutFromNativeGoogle } from '@/services/nativeGoogleAuth'
import { AuthContext } from '@/providers/AuthContext'

function normalizeAuthErrorCode(error, fallbackCode) {
  const message = String(error?.message || '').toLowerCase()
  const nativeCode = String(error?.nativeErrorCode || '').toLowerCase()
  const code = String(error?.code || '').toLowerCase()
  const signal = `${code} ${nativeCode} ${message}`

  if (signal.includes('network')) return 'auth/network-request-failed'
  if (signal.includes('developer_error') || signal.includes('configuration')) return 'auth/google-configuration-missing'
  if (signal.includes('cancel')) return 'auth/cancelled-by-user'
  if (signal.includes('invalid-credential') || signal.includes('wrong-password') || signal.includes('user-not-found')) {
    return 'auth/invalid-credential'
  }
  if (signal.includes('invalid-email')) return 'auth/invalid-email'

  return error?.code || fallbackCode
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessControl, setAccessControl] = useState(null)
  const [staffProfile, setStaffProfile] = useState(null)
  const [staffAssignments, setStaffAssignments] = useState([])
  const [assignedEvents, setAssignedEvents] = useState([])
  const [access, setAccess] = useState({
    level: 'none',
    role: null,
    roleLabel: 'No access',
    assignedEventIds: [],
    assignmentsByEvent: {},
    assignedEvents: [],
    protectedOwner: false,
    capabilities: {},
  })
  const [loading, setLoading] = useState(true)
  const [authInitialized, setAuthInitialized] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authState, setAuthState] = useState('resolving')

  const clearSignedOutState = useCallback(() => {
    setAuthError('')
    setUser(null)
    setAccessControl(null)
    setStaffProfile(null)
    setStaffAssignments([])
    setAssignedEvents([])
    setAccess({
      level: 'none',
      role: null,
      roleLabel: 'No access',
      assignedEventIds: [],
      assignmentsByEvent: {},
      assignedEvents: [],
      protectedOwner: false,
      capabilities: {},
    })
    setIsAuthorized(false)
    setAuthState('signed-out')
    setAuthInitialized(true)
  }, [])

  const resolveAccess = useCallback(async (nextUser = user) => {
    if (!nextUser) return false
    setLoading(true)
    setAuthState('checking-access')
    console.info('GSV_MOBILE_AUTH_STAGE', 'access-lookup-start')
    try {
      const accessData = await verifyWorkspaceAccess(nextUser)
      console.info('GSV_MOBILE_AUTH_STAGE', 'access-lookup-pass')
      setUser(nextUser)
      setAccessControl(accessData.accessControl)
      setStaffProfile(accessData.staffProfile)
      setStaffAssignments(accessData.staffAssignments)
      setAssignedEvents(accessData.assignedEvents)
      setAccess(accessData.access)
      setIsAuthorized(true)
      setAuthError('')
      setAuthState('authorized')
      return true
    } catch (error) {
      console.warn('GSV_MOBILE_AUTH_STAGE', 'access-lookup-fail', normalizeAuthErrorCode(error, 'auth/access-check-failed'))
      setIsAuthorized(false)
      setAuthError(normalizeAuthErrorCode(error, 'auth/access-check-failed'))
      setAuthState(error?.code === 'auth/unapproved-account' ? 'access-denied' : 'access-required')
      return false
    } finally {
      setLoading(false)
      setAuthInitialized(true)
    }
  }, [user])

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        clearSignedOutState()
        setLoading(false)
        return
      }

      setUser(nextUser)
      setAccessControl(null)
      setStaffProfile(null)
      setStaffAssignments([])
      setAssignedEvents([])
      console.info('GSV_MOBILE_AUTH_STAGE', 'current-user-present')
      console.info('GSV_MOBILE_ACCESS_CHECK_STARTED')
      await resolveAccess(nextUser)
    })
  }, [clearSignedOutState, resolveAccess])

  const value = useMemo(() => ({
    user,
    accessControl,
    staffProfile,
    staffAssignments,
    assignedEvents,
    access,
    currentRole: access?.role,
    currentRoleLabel: access?.role ? roleLabel(access.role) : 'No access',
    defaultRoute: defaultRouteForAccess(access),
    loading,
    authInitialized,
    isAuthorized,
    authError,
    authState,
    retryAccess: () => resolveAccess(),
    signInWithGoogle: async () => {
      setAuthError('')
      setLoading(true)
      try {
        console.info('GSV_MOBILE_AUTH_STAGE', 'google-sign-in-start')
        await signInWithNativeGoogle(auth, googleWebClientId)
        console.info('GSV_MOBILE_AUTH_STAGE', 'firebase-credential-pass')
      } catch (error) {
        setLoading(false)
        console.error('GSV_MOBILE_GOOGLE_SIGN_IN_FAILED', error)
        const normalizedCode = normalizeAuthErrorCode(error, 'auth/sign-in-failed')
        setAuthError(normalizedCode)
        if (error && !error.code) error.code = normalizedCode
        throw error
      }
    },
    signInForE2E: async () => {
      const authMode = resolveNativeAuthMode(firebaseRuntimeConfig)
      if (authMode !== 'emulator-e2e') {
        const error = new Error('Emulator E2E authentication is disabled for this build.')
        error.code = 'auth/e2e-disabled'
        throw error
      }
      setAuthError('')
      setLoading(true)
      try {
        await signInWithEmailAndPassword(auth, firebaseRuntimeConfig.e2eEmail, firebaseRuntimeConfig.e2ePassword)
      } catch (error) {
        setLoading(false)
        setAuthError(normalizeAuthErrorCode(error, 'auth/sign-in-failed'))
        throw error
      }
    },
    signOut: async () => {
      setLoading(true)
      setAuthError('')
      try {
        await signOutFromNativeGoogle().catch(() => {})
        await firebaseSignOut(auth).catch((error) => {
          if (error?.code !== 'auth/no-current-user') throw error
          clearSignedOutState()
        })
      } finally {
        setLoading(false)
      }
    },
  }), [access, accessControl, assignedEvents, authError, authInitialized, authState, clearSignedOutState, isAuthorized, loading, resolveAccess, staffAssignments, staffProfile, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
