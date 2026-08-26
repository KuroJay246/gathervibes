import { useEffect, useMemo, useState } from 'react'
import * as SecureStore from 'expo-secure-store'
import { SelectedEventContext } from '@/providers/SelectedEventContext'
import { useAuth } from '@/providers/useAuth'

const STORAGE_KEY = 'gsv-mobile-active-event'

function eventIsStillAssigned(event, assignedEvents) {
  return Boolean(event?.eventId && assignedEvents.some((assignedEvent) => assignedEvent.eventId === event.eventId))
}

function toPersistedEvent(event) {
  if (!event) return null
  return {
    eventId: event.eventId,
    eventName: event.eventName,
    eventDate: event.eventDate || '',
    location: event.location || '',
    status: event.status || '',
  }
}

export function SelectedEventProvider({ children }) {
  const { assignedEvents } = useAuth()
  const [persistedEvent, setPersistedEvent] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((value) => {
        if (!mounted) return
        setPersistedEvent(value ? JSON.parse(value) : null)
        setReady(true)
      })
      .catch(() => {
        if (!mounted) return
        setReady(true)
      })
    return () => {
      mounted = false
    }
  }, [])

  const normalizedAssignedEvents = useMemo(
    () => (Array.isArray(assignedEvents) ? assignedEvents : []),
    [assignedEvents]
  )
  const activeEvent = useMemo(() => {
    if (!ready || !normalizedAssignedEvents.length) return null
    if (eventIsStillAssigned(persistedEvent, normalizedAssignedEvents)) return persistedEvent
    return normalizedAssignedEvents.length === 1 ? toPersistedEvent(normalizedAssignedEvents[0]) : null
  }, [normalizedAssignedEvents, persistedEvent, ready])

  useEffect(() => {
    if (!ready) return
    if (!normalizedAssignedEvents.length) {
      void SecureStore.deleteItemAsync(STORAGE_KEY)
      return
    }

    const persistedValue = persistedEvent ? JSON.stringify(persistedEvent) : null
    const activeValue = activeEvent ? JSON.stringify(activeEvent) : null

    if (persistedValue === activeValue) return
    if (activeValue) {
      void SecureStore.setItemAsync(STORAGE_KEY, activeValue)
      return
    }
    void SecureStore.deleteItemAsync(STORAGE_KEY)
  }, [activeEvent, normalizedAssignedEvents, persistedEvent, ready])

  const value = useMemo(() => ({
    activeEvent,
    ready,
    setActiveEvent: async (event) => {
      const nextEvent = toPersistedEvent(event)
      setPersistedEvent(nextEvent)
      if (nextEvent) await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(nextEvent))
      else await SecureStore.deleteItemAsync(STORAGE_KEY)
    },
    clearActiveEvent: async () => {
      setPersistedEvent(null)
      await SecureStore.deleteItemAsync(STORAGE_KEY)
    },
  }), [activeEvent, ready])

  return <SelectedEventContext.Provider value={value}>{children}</SelectedEventContext.Provider>
}
