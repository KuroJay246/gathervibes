import { useCallback, useEffect, useState } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../auth/useAuth'

export const TARGET_UIDS = ['WcDU2jmbopdAgDlMMWvD3TkqqbC3', 'WM2UOQtSeuOglCI5uMZQKrYYqP53']
export const ONBOARDING_VERSION = 'mother-launch-v1'

export function useOnboarding() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showWalkthrough, setShowWalkthrough] = useState(false)
  const [state, setState] = useState(null)
  
  const isTargetUser = user && TARGET_UIDS.includes(user.uid)

  useEffect(() => {
    let isMounted = true
    if (!isTargetUser || !user) {
      setTimeout(() => {
        if (isMounted) setLoading(false)
      }, 0)
      return
    }
    
    async function loadState() {
      try {
        const docRef = doc(db, 'staffProfiles', user.uid, 'preferences', 'onboarding')
        const docSnap = await getDoc(docRef)
        
        let currentOnboarding = {
          version: null,
          startedAt: null,
          completed: false,
          completedAt: null,
          skippedAt: null,
          lastStep: 0,
          replayRequestedAt: null
        }

        if (docSnap.exists()) {
          const data = docSnap.data()
          currentOnboarding = {
            version: data.version || null,
            startedAt: data.startedAt || null,
            completed: data.completed || false,
            completedAt: data.completedAt || null,
            skippedAt: data.skippedAt || null,
            lastStep: data.lastStep || 0,
            replayRequestedAt: data.replayRequestedAt || null
          }
        }
        
        if (isMounted) {
          setState(currentOnboarding)
          
          const isCurrentVersion = currentOnboarding.version === ONBOARDING_VERSION
          const isCompleted = currentOnboarding.completed === true
          
          const sessionSkipped = sessionStorage.getItem(`onboarding_skipped_${ONBOARDING_VERSION}`)
          const needsWelcome = !isCurrentVersion || (!isCompleted && !sessionSkipped)
          
          if (needsWelcome) {
            setShowWelcome(true)
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('[Onboarding] Error loading state:', err)
          setError(err)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    loadState()
    
    return () => {
      isMounted = false
    }
  }, [user, isTargetUser])

  const startTour = useCallback(async () => {
    setShowWelcome(false)
    setShowWalkthrough(true)
    
    try {
      const docRef = doc(db, 'staffProfiles', user.uid, 'preferences', 'onboarding')
      await setDoc(docRef, {
        version: ONBOARDING_VERSION,
        startedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true })
    } catch (err) {
      console.error('[Onboarding] Error starting tour:', err)
    }
  }, [user])

  const skipTour = useCallback(async () => {
    setShowWelcome(false)
    setShowWalkthrough(false)
    sessionStorage.setItem(`onboarding_skipped_${ONBOARDING_VERSION}`, 'true')
    
    try {
      const docRef = doc(db, 'staffProfiles', user.uid, 'preferences', 'onboarding')
      await setDoc(docRef, {
        version: ONBOARDING_VERSION,
        skippedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true })
    } catch (err) {
      console.error('[Onboarding] Error skipping tour:', err)
    }
  }, [user])

  const completeTour = useCallback(async (lastStep = 13) => {
    try {
      const docRef = doc(db, 'staffProfiles', user.uid, 'preferences', 'onboarding')
      
      const payload = {
        version: ONBOARDING_VERSION,
        completed: true,
        lastStep,
        updatedAt: serverTimestamp()
      }

      // Preserve the original completedAt value if it already exists in the state
      if (!state?.completedAt) {
        payload.completedAt = serverTimestamp()
      }

      await setDoc(docRef, payload, { merge: true })
      
      setState(prev => ({ 
        ...prev, 
        completed: true, 
        version: ONBOARDING_VERSION,
        completedAt: prev?.completedAt || new Date() // Fallback mock value for state updating
      }))
      setShowWalkthrough(false)
      return { success: true }
    } catch (err) {
      console.error('[Onboarding] Error completing tour:', err)
      return { success: false, error: err }
    }
  }, [user, state])

  const replayTour = useCallback(async () => {
    setShowWelcome(true)
    setShowWalkthrough(false)
    
    try {
      const docRef = doc(db, 'staffProfiles', user.uid, 'preferences', 'onboarding')
      await setDoc(docRef, {
        replayRequestedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true })
    } catch (err) {
      console.error('[Onboarding] Error replaying tour:', err)
    }
  }, [user])

  useEffect(() => {
    const handler = () => replayTour()
    window.addEventListener('replay-onboarding', handler)
    return () => window.removeEventListener('replay-onboarding', handler)
  }, [replayTour])

  return {
    loading,
    error,
    isTargetUser,
    showWelcome,
    showWalkthrough,
    state,
    startTour,
    skipTour,
    completeTour,
    replayTour,
    closeTour: skipTour,
    setShowWelcome,
    setShowWalkthrough
  }
}
