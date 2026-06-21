import { useContext } from 'react'
import { ActiveEventContext } from './ActiveEventContext'

export function useActiveEvent() {
  const context = useContext(ActiveEventContext)

  if (!context) {
    throw new Error('useActiveEvent must be used inside ActiveEventProvider')
  }

  return context
}
