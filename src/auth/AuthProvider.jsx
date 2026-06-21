import { useEffect, useMemo, useState } from 'react'
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

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

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
  } catch (error) {
    if (error?.code?.startsWith('auth/')) throw error
    throw adminAccessError(error)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(isFirebaseConfigured)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (!auth) {
      return undefined
    }

    let active = true

    getRedirectResult(auth).catch((error) => {
      if (active) setAuthError(error.code || 'auth/redirect-failed')
    })

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!active) return

      if (!nextUser) {
        setUser(null)
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        await verifyAdminAccess(nextUser)
        if (active) {
          setUser(nextUser)
          setAuthError('')
        }
      } catch (error) {
        if (active) {
          setUser(null)
          setAuthError(error.code || 'auth/access-check-failed')
        }
        await firebaseSignOut(auth)
      } finally {
        if (active) setLoading(false)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  async function completeSignIn(signInRequest) {
    if (!auth) throw new Error('Firebase is not configured')
    setAuthError('')

    const result = await signInRequest()
    try {
      await verifyAdminAccess(result.user)
      setUser(result.user)
      return result
    } catch (error) {
      await firebaseSignOut(auth)
      setAuthError(error.code || 'auth/access-check-failed')
      throw error
    }
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      authError,
      isConfigured: isFirebaseConfigured,
      signIn: (email, password) => completeSignIn(() => signInWithEmailAndPassword(auth, email, password)),
      signInWithGoogle: () => completeSignIn(() => signInWithPopup(auth, googleProvider)),
      signInWithGoogleRedirect: () => {
        if (!auth) throw new Error('Firebase is not configured')
        setAuthError('')
        return signInWithRedirect(auth, googleProvider)
      },
      signOut: () => {
        if (!auth) return Promise.resolve()
        setUser(null)
        return firebaseSignOut(auth)
      },
    }),
    [authError, loading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
