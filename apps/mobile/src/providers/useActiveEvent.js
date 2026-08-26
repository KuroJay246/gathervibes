import { useContext } from 'react'

import { SelectedEventContext } from '@/providers/SelectedEventContext'

export function useActiveEvent() {
  const context = useContext(SelectedEventContext)
  if (!context) throw new Error('useActiveEvent must be used within SelectedEventProvider')
  return context
}
