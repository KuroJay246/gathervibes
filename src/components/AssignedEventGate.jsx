import { useEffect } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { formatEventDate } from '../utils/dateUtils'
import { isApprovedAdmin, isAssignedStaff } from '../utils/accessRoles'

export function AssignedEventGate({ children, purpose = 'this page', autoSelectSingle = false }) {
  const { access, assignedEvents = [] } = useAuth()
  const { activeEvent, setActiveEvent, clearActiveEvent } = useActiveEvent()

  const activeEventIsAssigned = activeEvent?.eventId && isAssignedStaff(access, activeEvent.eventId)
  useEffect(() => {
    if (isApprovedAdmin(access) || !autoSelectSingle || activeEventIsAssigned || assignedEvents.length !== 1) return
    setActiveEvent(assignedEvents[0])
  }, [access, activeEventIsAssigned, assignedEvents, autoSelectSingle, setActiveEvent])

  if (isApprovedAdmin(access)) return children

  if (activeEventIsAssigned) return children

  const handleSelect = (event) => {
    setActiveEvent(event)
  }

  return (
    <section className="rounded-[24px] border border-dashed border-[#DCC8BD] bg-white px-6 py-12 text-center">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#FCEEF1] text-[#B76E79]">
        <ClipboardCheck className="size-7" strokeWidth={1.6} />
      </span>
      <h2 className="mt-5 font-serif text-2xl text-[#2B1723]">Assigned event required</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#806C61]">
        Select one of your assigned events before opening {purpose}. If no assigned events are listed, please contact the organizer.
      </p>

      {activeEvent?.eventId && !activeEventIsAssigned && (
        <button type="button" onClick={clearActiveEvent} className="mt-4 rounded-xl border border-[#E7D6CC] px-4 py-2 text-xs font-bold text-[#6B564C]">
          Clear unassigned Working Event
        </button>
      )}

      {assignedEvents.length > 0 ? (
        <div className="mx-auto mt-6 grid max-w-2xl gap-3">
          {assignedEvents.map((event) => (
            <button
              type="button"
              key={event.eventId}
              onClick={() => handleSelect(event)}
              className="rounded-2xl border border-[#EFE2DA] bg-[#FFF8F2] p-4 text-left transition hover:border-[#B76E79]"
            >
              <span className="block text-sm font-bold text-[#2B1723]">{event.eventName || 'Assigned event'}</span>
              <span className="mt-1 block text-xs text-[#806C61]">{formatEventDate(event.eventDate)} · {event.eventId}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-2xl bg-[#FFF8EA] px-4 py-3 text-sm font-semibold text-[#715D46]">
          No assigned events. Please contact the organizer.
        </p>
      )}
    </section>
  )
}
