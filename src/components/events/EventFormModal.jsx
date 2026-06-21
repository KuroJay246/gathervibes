import { useEffect, useState } from 'react'
import { CalendarDays, X } from 'lucide-react'
import { toDateInput } from '../../utils/dateUtils'
import { validateEvent } from '../../utils/validators'

const EMPTY_EVENT = {
  eventName: '',
  eventDate: '',
  location: '',
  eventType: 'cake-picnic',
  status: 'upcoming',
  capacity: '',
  ticketPrice: '',
  notes: '',
}

const eventTypes = [
  ['cake-picnic', 'Cake picnic'],
  ['brunch', 'Brunch'],
  ['tasting', 'Tasting'],
  ['vendor-pop-up', 'Vendor pop-up'],
  ['private-food-experience', 'Private food experience'],
  ['other', 'Other'],
]

const statuses = [
  ['draft', 'Draft'],
  ['upcoming', 'Upcoming'],
  ['active', 'Active'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
]

function valuesFromEvent(event) {
  if (!event) return EMPTY_EVENT

  return {
    eventName: event.eventName || '',
    eventDate: toDateInput(event.eventDate),
    location: event.location || '',
    eventType: event.eventType || 'other',
    status: event.status || 'upcoming',
    capacity: String(event.capacity ?? ''),
    ticketPrice: String(event.ticketPrice ?? ''),
    notes: event.notes || '',
  }
}

function FieldError({ id, children }) {
  if (!children) return null
  return <p id={id} className="mt-1.5 text-[11px] font-medium text-[#C53030]">{children}</p>
}

export function EventFormModal({ event, onClose, onSave }) {
  const [values, setValues] = useState(() => valuesFromEvent(event))
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const isEditing = Boolean(event)

  useEffect(() => {
    function handleEscape(keyEvent) {
      if (keyEvent.key === 'Escape' && !saving) onClose()
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose, saving])

  function updateField(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: '' }))
  }

  async function handleSubmit(submitEvent) {
    submitEvent.preventDefault()
    const validationErrors = validateEvent(values)
    setErrors(validationErrors)
    setSaveError('')

    if (Object.keys(validationErrors).length) return

    setSaving(true)
    try {
      await onSave(values)
    } catch (error) {
      setSaveError(error.message || 'The event could not be saved. Please try again.')
      setSaving(false)
    }
  }

  const inputClass = (field) => `event-input ${errors[field] ? 'event-input-error' : ''}`

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-[#160B12]/65 p-3 backdrop-blur-sm sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-form-title"
        className="my-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[26px] bg-[#FFFDFB] shadow-[0_28px_90px_rgba(26,12,19,0.3)] sm:max-h-[calc(100vh-3rem)]"
      >
        <div className="flex items-center justify-between border-b border-[#EEDFD6] px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#FCEEF1] text-[#B76E79]">
              <CalendarDays className="size-[18px]" />
            </span>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#B76E79]">{isEditing ? 'Update details' : 'New gathering'}</p>
              <h2 id="event-form-title" className="mt-1 font-serif text-xl text-[#2B1723]">
                {isEditing ? 'Edit event' : 'Create an event'}
              </h2>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl p-2 text-[#9B867A] hover:bg-[#F8EFEA]" aria-label="Close event form">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
            {saveError && <div className="mb-5 rounded-xl border border-[#F0C6C6] bg-[#FFF4F4] px-4 py-3 text-xs text-[#A32626]" role="alert">{saveError}</div>}

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="eventName" className="event-label">Event name <span>*</span></label>
                <input
                  id="eventName"
                  value={values.eventName}
                  onChange={(changeEvent) => updateField('eventName', changeEvent.target.value)}
                  className={inputClass('eventName')}
                  placeholder="Cake Picnic Barbados"
                  disabled={saving}
                  autoFocus
                  aria-describedby={errors.eventName ? 'eventName-error' : undefined}
                />
                <FieldError id="eventName-error">{errors.eventName}</FieldError>
              </div>

              <div>
                <label htmlFor="eventDate" className="event-label">Event date <span>*</span></label>
                <input id="eventDate" type="date" value={values.eventDate} onChange={(changeEvent) => updateField('eventDate', changeEvent.target.value)} className={inputClass('eventDate')} disabled={saving} />
                <FieldError id="eventDate-error">{errors.eventDate}</FieldError>
              </div>

              <div>
                <label htmlFor="location" className="event-label">Location <span>*</span></label>
                <input id="location" value={values.location} onChange={(changeEvent) => updateField('location', changeEvent.target.value)} className={inputClass('location')} placeholder="Bridgetown, Barbados" disabled={saving} />
                <FieldError id="location-error">{errors.location}</FieldError>
              </div>

              <div>
                <label htmlFor="eventType" className="event-label">Event type <span>*</span></label>
                <select id="eventType" value={values.eventType} onChange={(changeEvent) => updateField('eventType', changeEvent.target.value)} className={inputClass('eventType')} disabled={saving}>
                  {eventTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="status" className="event-label">Status <span>*</span></label>
                <select id="status" value={values.status} onChange={(changeEvent) => updateField('status', changeEvent.target.value)} className={inputClass('status')} disabled={saving}>
                  {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="capacity" className="event-label">Capacity <span>*</span></label>
                <input id="capacity" type="number" min="1" step="1" value={values.capacity} onChange={(changeEvent) => updateField('capacity', changeEvent.target.value)} className={inputClass('capacity')} placeholder="150" disabled={saving} />
                <FieldError id="capacity-error">{errors.capacity}</FieldError>
              </div>

              <div>
                <label htmlFor="ticketPrice" className="event-label">Ticket price (BBD) <span>*</span></label>
                <input id="ticketPrice" type="number" min="0" step="0.01" value={values.ticketPrice} onChange={(changeEvent) => updateField('ticketPrice', changeEvent.target.value)} className={inputClass('ticketPrice')} placeholder="75.00" disabled={saving} />
                <FieldError id="ticketPrice-error">{errors.ticketPrice}</FieldError>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="notes" className="event-label">Internal notes</label>
                <textarea id="notes" rows="4" value={values.notes} onChange={(changeEvent) => updateField('notes', changeEvent.target.value)} className={`${inputClass('notes')} resize-y`} placeholder="Add planning notes for trusted staff…" disabled={saving} />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-[#EEDFD6] bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-[#E1D1C8] px-5 py-3 text-xs font-bold text-[#6B564C] hover:bg-[#FFF8F2] disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-xl bg-[#B76E79] px-5 py-3 text-xs font-bold text-white shadow-lg shadow-[#B76E79]/20 hover:bg-[#A9606B] disabled:opacity-60">
              {saving && <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
              {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
