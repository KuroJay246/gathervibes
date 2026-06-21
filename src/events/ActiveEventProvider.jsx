import { useCallback, useMemo, useState } from 'react'
import { ActiveEventContext } from './ActiveEventContext'
import { toDateInput } from '../utils/dateUtils'

const STORAGE_KEY = 'gather-savor-active-event'

function readStoredEvent() {
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY)
    return storedValue ? JSON.parse(storedValue) : null
  } catch {
    return null
  }
}

function toPersistedEvent(event) {
  if (!event) return null

  return {
    eventId: event.eventId,
    eventName: event.eventName,
    eventDate: toDateInput(event.eventDate),
    location: event.location,
    status: event.status,
  }
}

export function ActiveEventProvider({ children }) {
  const [activeEvent, setActiveEventState] = useState(readStoredEvent)

  const setActiveEvent = useCallback((event) => {
    const persistedEvent = toPersistedEvent(event)
    setActiveEventState(persistedEvent)

    if (persistedEvent) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedEvent))
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const clearActiveEvent = useCallback(() => setActiveEvent(null), [setActiveEvent])

  const value = useMemo(
    () => ({ activeEvent, setActiveEvent, clearActiveEvent }),
    [activeEvent, clearActiveEvent, setActiveEvent],
  )

  return <ActiveEventContext.Provider value={value}>{children}</ActiveEventContext.Provider>
}
