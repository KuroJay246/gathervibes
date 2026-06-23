import { User } from 'lucide-react'
import { formatPaymentLabel, normalizePaymentStatus } from '../../utils/paymentStatus'

function attendeesText(registration = {}) {
  return Array.isArray(registration.attendeeNames) && registration.attendeeNames.length > 0
    ? registration.attendeeNames.join(', ')
    : ''
}

export function RegistrationCard({ registration, onEdit, onDelete }) {
  const attendees = attendeesText(registration)
  const paymentStatus = normalizePaymentStatus(registration.paymentStatus)
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#EEDFD6] bg-white p-4 shadow-[0_4px_16px_rgba(43,23,35,0.03)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-[#2B1723]">{registration.fullName}</h3>
          </div>
          {registration.buyerName && (
            <div className="mt-1 text-xs font-semibold text-[#8C7567]">Buyer / Contact: {registration.buyerName}</div>
          )}
          {attendees && (
            <div className="mt-1 text-xs text-[#5D4A52]">Guests: {attendees}</div>
          )}
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#816D62]">
            {registration.email && <span>{registration.email}</span>}
            {registration.phone && <span>{registration.phone}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-[#FFF8F2] px-2 py-1 text-xs font-bold text-[#B76E79]">
          <User className="size-3" />
          {registration.personsAttending}
        </div>
      </div>

      {(registration.groupName || registration.notes) && (
        <div className="rounded-xl bg-[#FBF8F5] p-3 text-xs text-[#5D4A52]">
          {registration.groupName && (
            <div className="font-semibold text-[#8C7567]">Group: {registration.groupName}</div>
          )}
          {registration.notes && (
            <div className={registration.groupName ? 'mt-1' : ''}>{registration.notes}</div>
          )}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[#F2E8E1] pt-3">
        <span className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
          paymentStatus === 'paid' ? 'bg-[#E5F3EC] text-[#1E7345]' :
          paymentStatus === 'pending' ? 'bg-[#FFF4DF] text-[#986F26]' :
          paymentStatus === 'complimentary' ? 'bg-[#F2E8FA] text-[#6B3FA0]' :
          paymentStatus === 'door' ? 'bg-[#E6F0FA] text-[#285E9E]' :
          'bg-[#F7F1ED] text-[#8C766A]'
        }`}>
          {formatPaymentLabel(registration.paymentStatus)}
        </span>
        <span className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
          registration.ticketStatus === 'assigned' ? 'bg-[#E5F3EC] text-[#1E7345]' :
          registration.ticketStatus === 'partially-assigned' ? 'bg-[#FFF4DF] text-[#986F26]' :
          'bg-[#FCEEF1] text-[#A32626]'
        }`}>
          {registration.ticketStatus.replace(/-/g, ' ')}
        </span>
        <span className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
          registration.checkedIn ? 'bg-[#E5F3EC] text-[#1E7345]' : 'bg-[#F7F1ED] text-[#8C766A]'
        }`}>
          {registration.checkedIn ? 'Checked in' : 'Not checked in'}
        </span>
        
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(registration)}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#8C766A] hover:bg-[#FFF8F2]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(registration)}
            className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#A85F6B] hover:bg-[#FCEEF1]"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
