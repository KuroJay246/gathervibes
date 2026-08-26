import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from '@react-native-firebase/auth'
import { auth } from '@/lib/firebase'
import { defaultRouteForAccess, roleLabel } from '@gsv/contracts/accessRoles'
import { verifyWorkspaceAccess } from '@/services/access'
import { AuthContext } from '@/providers/AuthContext'

function normalizeAuthErrorCode(error, fallbackCode) {
  const message = String(error?.message || '').toLowerCase()
  const nativeCode = String(error?.nativeErrorCode || '').toLowerCase()
  const code = String(error?.code || '').toLowerCase()
  const signal = `${code} ${nativeCode} ${message}`

  if (signal.includes('network')) return 'auth/network-request-failed'
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

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
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
        setLoading(false)
        setAuthInitialized(true)
        return
      }

      setLoading(true)
      try {
        const accessData = await verifyWorkspaceAccess(nextUser)
        setUser(nextUser)
        setAccessControl(accessData.accessControl)
        setStaffProfile(accessData.staffProfile)
        setStaffAssignments(accessData.staffAssignments)
        setAssignedEvents(accessData.assignedEvents)
        setAccess(accessData.access)
        setIsAuthorized(true)
        setAuthError('')
      } catch (error) {
        setUser(null)
        setAccessControl(null)
        setStaffProfile(null)
        setStaffAssignments([])
        setAssignedEvents([])
        setIsAuthorized(false)
        console.error('GSV_MOBILE_ACCESS_CHECK_FAILED', error)
        setAuthError(normalizeAuthErrorCode(error, 'auth/access-check-failed'))
        await firebaseSignOut(auth).catch(() => {})
      } finally {
        setLoading(false)
        setAuthInitialized(true)
      }
    })
  }, [])

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
    signIn: async (email, password) => {
      setAuthError('')
      setLoading(true)
      try {
        await signInWithEmailAndPassword(auth, String(email || '').trim(), password)
      } catch (error) {
        setLoading(false)
        console.error('GSV_MOBILE_SIGN_IN_FAILED', error)
        const normalizedCode = normalizeAuthErrorCode(error, 'auth/sign-in-failed')
        setAuthError(normalizedCode)
        if (error && !error.code) error.code = normalizedCode
        throw error
      }
    },
    signOut: async () => {
      setLoading(true)
      setAuthError('')
      try {
        await firebaseSignOut(auth)
      } finally {
        setLoading(false)
      }
    },
  }), [access, accessControl, assignedEvents, authError, authInitialized, isAuthorized, loading, staffAssignments, staffProfile, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
