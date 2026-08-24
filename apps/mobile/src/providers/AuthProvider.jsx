import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from '@react-native-firebase/auth'
import { auth } from '@/lib/firebase'
import { defaultRouteForAccess, roleLabel } from '@gsv/contracts/accessRoles'
import { verifyWorkspaceAccess } from '@/services/access'
import { AuthContext } from '@/providers/AuthContext'

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
        setAuthError(error?.code || 'auth/access-check-failed')
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
        setAuthError(error?.code || 'auth/sign-in-failed')
        throw error
      }
    },
    signOut: async () => {
      setLoading(true)
      try {
        await firebaseSignOut(auth)
      } finally {
        setLoading(false)
      }
    },
  }), [access, accessControl, assignedEvents, authError, authInitialized, isAuthorized, loading, staffAssignments, staffProfile, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
