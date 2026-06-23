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
import { doc, getDoc } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured } from '../lib/firebase'
import { AuthContext } from './AuthContext'
import { normalizeAccessEmail, resolveAccessRole, roleLabel } from '../utils/accessRoles'

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

function adminAccessError(cause) {
  const error = new Error('This account is not approved for the private Gather & Savor workspace.', { cause })
  error.code = cause?.code === 'permission-denied' ? 'auth/unapproved-account' : 'auth/access-check-failed'
  return error
}

async function verifyAdminAccess(nextUser) {
  if (!nextUser || !db) throw adminAccessError()

  try {
    const accessDocument = await getDoc(doc(db, 'settings', 'accessControl'))
    if (!accessDocument.exists()) throw adminAccessError()
    
    const data = accessDocument.data()
    const approvedEmails = Array.isArray(data?.approvedEmails) ? data.approvedEmails : []
    const userEmail = normalizeAccessEmail(nextUser.email)
    
    if (!approvedEmails.map(normalizeAccessEmail).includes(userEmail)) {
      throw adminAccessError({ code: 'permission-denied' })
    }
    return data
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[Diagnostic] verifyAdminAccess failed:', {
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
      throw adminAccessError({ code: 'permission-denied' })
    }
    throw adminAccessError(error)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessControl, setAccessControl] = useState(null)
  const [loading, setLoading] = useState(isFirebaseConfigured)
  const [authError, setAuthError] = useState('')
  const currentRole = useMemo(() => resolveAccessRole(accessControl, user?.email) || 'admin', [accessControl, user?.email])
  const currentRoleLabel = useMemo(() => roleLabel(currentRole), [currentRole])

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
        const accessData = await verifyAdminAccess(nextUser)
        if (active) {
          setUser(nextUser)
          setAccessControl(accessData)
          setAuthError('')
          redirectToWebAppHostIfNeeded()
        }
      } catch (error) {
        if (active) {
          setUser(null)
          setAccessControl(null)
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
      const accessData = await verifyAdminAccess(result.user)
      setUser(result.user)
      setAccessControl(accessData)
      return result
    } catch (error) {
      await firebaseSignOut(auth)
      setAccessControl(null)
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
      currentRole,
      currentRoleLabel,
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
        return firebaseSignOut(auth)
      },
    }),
    [accessControl, authError, completeSignIn, currentRole, currentRoleLabel, loading, startGoogleSignIn, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
