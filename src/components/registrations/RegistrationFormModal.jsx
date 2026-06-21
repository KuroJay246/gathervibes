import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { validPaymentStatuses, validTicketStatuses, validateRegistration } from '../../utils/validators.js'

export function RegistrationFormModal({ isOpen, onClose, onSave, initialData, saving }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    groupName: '',
    personsAttending: 1,
    paymentStatus: 'unknown',
    paymentReference: '',
    ticketStatus: 'no-ticket-assigned',
    notes: '',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (isOpen) {
      if (initialData) {
        setFormData({
          fullName: initialData.fullName || '',
          email: initialData.email || '',
          phone: initialData.phone || '',
          groupName: initialData.groupName || '',
          personsAttending: initialData.personsAttending || 1,
          paymentStatus: initialData.paymentStatus || 'unknown',
          paymentReference: initialData.paymentReference || '',
          ticketStatus: initialData.ticketStatus || 'no-ticket-assigned',
          notes: initialData.notes || '',
        })
      } else {
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          groupName: '',
          personsAttending: 1,
          paymentStatus: 'unknown',
          paymentReference: '',
          ticketStatus: 'no-ticket-assigned',
          notes: '',
        })
      }
      setErrors({})
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [isOpen, initialData])

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen && !saving) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, saving, onClose])

  if (!isOpen) return null

  function handleChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validateRegistration(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#2B1723]/40 backdrop-blur-sm" onClick={!saving ? onClose : undefined} />
      
      <div className="relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-[#FFFdfb] shadow-[0_24px_80px_rgba(43,23,35,0.16)] sm:max-h-[85vh] sm:max-w-2xl sm:rounded-[28px]">
        <div className="flex items-center justify-between border-b border-[#F2E8E1] px-5 py-4 sm:px-6">
          <h2 className="font-serif text-xl text-[#2B1723]">{initialData ? 'Edit Registration' : 'New Registration'}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full p-2 text-[#8C7567] transition hover:bg-[#FFF8F2] hover:text-[#2B1723] disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
          <form id="registration-form" onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="event-label">Full Name <span>*</span></label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  className={`event-input ${errors.fullName ? 'event-input-error' : ''}`}
                  disabled={saving}
                  placeholder="e.g. Jane Doe"
                />
                {errors.fullName && <p className="mt-1 text-[11px] text-[#C53030]">{errors.fullName}</p>}
              </div>
              
              <div>
                <label className="event-label">Group Name (Optional)</label>
                <input
                  type="text"
                  value={formData.groupName}
                  onChange={(e) => handleChange('groupName', e.target.value)}
                  className="event-input"
                  disabled={saving}
                  placeholder="e.g. The Doe Family"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="event-label">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="event-input"
                  disabled={saving}
                  placeholder="jane@example.com"
                />
              </div>
              
              <div>
                <label className="event-label">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="event-input"
                  disabled={saving}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-3">
              <div>
                <label className="event-label">Persons Attending <span>*</span></label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.personsAttending}
                  onChange={(e) => handleChange('personsAttending', e.target.value)}
                  className={`event-input ${errors.personsAttending ? 'event-input-error' : ''}`}
                  disabled={saving}
                />
                {errors.personsAttending && <p className="mt-1 text-[11px] text-[#C53030]">{errors.personsAttending}</p>}
              </div>

              <div>
                <label className="event-label">Payment Status <span>*</span></label>
                <select
                  value={formData.paymentStatus}
                  onChange={(e) => handleChange('paymentStatus', e.target.value)}
                  className="event-input bg-white"
                  disabled={saving}
                >
                  {validPaymentStatuses.map(status => (
                    <option key={status} value={status}>{status.replace('-', ' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="event-label">Ticket Status <span>*</span></label>
                <select
                  value={formData.ticketStatus}
                  onChange={(e) => handleChange('ticketStatus', e.target.value)}
                  className="event-input bg-white"
                  disabled={saving}
                >
                  {validTicketStatuses.map(status => (
                    <option key={status} value={status}>{status.replace(/-/g, ' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="event-label">Payment Reference (Optional)</label>
              <input
                type="text"
                value={formData.paymentReference}
                onChange={(e) => handleChange('paymentReference', e.target.value)}
                className="event-input"
                disabled={saving}
                placeholder="e.g. Stripe ch_123 or Check #456"
              />
            </div>

            <div>
              <label className="event-label">Dietary & Operational Notes</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="event-input resize-y"
                disabled={saving}
                placeholder="Allergies, seating requests, VIP notes..."
              />
            </div>
          </form>
        </div>

        <div className="border-t border-[#F2E8E1] bg-[#FFF8F2] px-5 py-4 sm:px-6">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-[#8C7567] transition hover:bg-[#F2E8E1] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="registration-form"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#B76E79] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#B76E79]/20 transition hover:bg-[#A9606B] hover:shadow-xl hover:shadow-[#B76E79]/30 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving…
                </>
              ) : (
                'Save registration'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
