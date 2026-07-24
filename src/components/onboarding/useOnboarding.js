import { useCallback, useEffect, useState } from 'react'
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
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
        const docRef = doc(db, 'staffProfiles', user.uid)
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists() && isMounted) {
          const data = docSnap.data()
          const currentOnboarding = {
            version: data.onboardingVersion,
            startedAt: data.onboardingStartedAt,
            completed: data.onboardingCompleted,
            completedAt: data.onboardingCompletedAt,
            skippedAt: data.onboardingSkippedAt,
            lastStep: data.onboardingLastStep,
            replayRequestedAt: data.onboardingReplayRequestedAt
          }
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
      const docRef = doc(db, 'staffProfiles', user.uid)
      await updateDoc(docRef, {
        onboardingVersion: ONBOARDING_VERSION,
        onboardingStartedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    } catch (err) {
      console.error('[Onboarding] Error starting tour:', err)
      // Allow them to continue despite failure
    }
  }, [user])

  const skipTour = useCallback(async () => {
    setShowWelcome(false)
    setShowWalkthrough(false)
    sessionStorage.setItem(`onboarding_skipped_${ONBOARDING_VERSION}`, 'true')
    
    try {
      const docRef = doc(db, 'staffProfiles', user.uid)
      await updateDoc(docRef, {
        onboardingVersion: ONBOARDING_VERSION,
        onboardingSkippedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    } catch (err) {
      console.error('[Onboarding] Error skipping tour:', err)
    }
  }, [user])

  const completeTour = useCallback(async (lastStep = 13) => {
    try {
      const docRef = doc(db, 'staffProfiles', user.uid)
      await updateDoc(docRef, {
        onboardingVersion: ONBOARDING_VERSION,
        onboardingCompleted: true,
        onboardingCompletedAt: serverTimestamp(),
        onboardingLastStep: lastStep,
        updatedAt: serverTimestamp()
      })
      
      setState(prev => ({ ...prev, completed: true, version: ONBOARDING_VERSION }))
      setShowWalkthrough(false)
      return { success: true }
    } catch (err) {
      console.error('[Onboarding] Error completing tour:', err)
      return { success: false, error: err }
    }
  }, [user])

  const replayTour = useCallback(async () => {
    setShowWelcome(true)
    setShowWalkthrough(false)
    
    try {
      const docRef = doc(db, 'staffProfiles', user.uid)
      await updateDoc(docRef, {
        onboardingReplayRequestedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
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
