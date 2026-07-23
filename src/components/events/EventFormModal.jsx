import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react'
import { toDateInput } from '../../utils/dateUtils'
import {
  EVENT_STATUS_OPTIONS,
  EVENT_TYPE_OPTIONS,
  buildReadinessChecklist,
  createUid,
  emptyFinancialPlan,
  emptyOperationsPlan,
  emptyReadinessChecklist,
  hydrateEventForPlanning,
} from '../../utils/eventPlanning'
import { VALID_TIER_NAMES, VALID_TIER_STATUSES, MAX_PRICE_TIERS, validateEvent } from '../../utils/validators'

const EMPTY_TIER = { name: 'General', price: '', status: 'active' }

const EMPTY_EVENT = {
  eventName: '',
  eventDate: '',
  venueName: '',
  location: '',
  eventType: 'food-event',
  status: 'planning',
  eventStartTime: '',
  eventEndTime: '',
  eventDescription: '',
  capacity: '',
  ticketPrice: '',
  registrationRequired: true,
  ticketTypeCount: '1',
  complimentaryAllowed: false,
  doorPaymentAllowed: true,
  registrationOpenDate: '',
  registrationCloseDate: '',
  notes: '',
  priceTiers: [],
  financialPlan: emptyFinancialPlan(),
  operationsPlan: emptyOperationsPlan(),
  readinessChecklist: emptyReadinessChecklist(),
}

const STEPS = [
  {
    id: 'basics',
    label: 'Event Basics',
    description: 'Set the event name, type, date, time, venue, and overall status.',
  },
  {
    id: 'registration',
    label: 'Capacity and Registration',
    description: 'Define capacity, ticket pricing, registration dates, and event entry rules.',
  },
  {
    id: 'financial-plan',
    label: 'Financial Plan',
    description: 'Capture the registration target and the main event budget categories.',
  },
  {
    id: 'operations',
    label: 'Operations',
    description: 'Record suppliers, staffing, equipment, safety notes, and the event-day timeline.',
  },
  {
    id: 'readiness',
    label: 'Readiness',
    description: 'Review what is complete, what still needs attention, and then open the event Overview.',
  },
]

const tierStatusLabels = {
  active: 'Active',
  'sold-out': 'Sold out',
  hidden: 'Hidden',
}

function valuesFromEvent(event) {
  if (!event) return EMPTY_EVENT

  const hydratedEvent = hydrateEventForPlanning(event)

  return {
    eventName: hydratedEvent.eventName || '',
    eventDate: toDateInput(hydratedEvent.eventDate),
    venueName: hydratedEvent.venueName || '',
    location: hydratedEvent.location || '',
    eventType: hydratedEvent.eventType || 'food-event',
    status: hydratedEvent.status || 'planning',
    eventStartTime: hydratedEvent.eventStartTime || '',
    eventEndTime: hydratedEvent.eventEndTime || '',
    eventDescription: hydratedEvent.eventDescription || '',
    capacity: String(hydratedEvent.capacity ?? ''),
    ticketPrice: String(hydratedEvent.ticketPrice ?? ''),
    registrationRequired: hydratedEvent.registrationRequired !== false,
    ticketTypeCount: String(hydratedEvent.ticketTypeCount ?? 1),
    complimentaryAllowed: Boolean(hydratedEvent.complimentaryAllowed),
    doorPaymentAllowed: hydratedEvent.doorPaymentAllowed !== false,
    registrationOpenDate: toDateInput(hydratedEvent.registrationOpenDate),
    registrationCloseDate: toDateInput(hydratedEvent.registrationCloseDate),
    notes: hydratedEvent.notes || '',
    priceTiers: Array.isArray(hydratedEvent.priceTiers)
      ? hydratedEvent.priceTiers.map((tier) => ({ name: tier.name, price: String(tier.price), status: tier.status || 'active' }))
      : [],
    financialPlan: Object.fromEntries(
      Object.entries(hydratedEvent.financialPlan || {}).map(([key, value]) => [key, value === null || value === undefined ? '' : String(value)]),
    ),
    operationsPlan: {
      ...emptyOperationsPlan(),
      ...hydratedEvent.operationsPlan,
      timeline: Array.isArray(hydratedEvent.operationsPlan?.timeline) && hydratedEvent.operationsPlan.timeline.length > 0
        ? hydratedEvent.operationsPlan.timeline.map((item) => ({
            timelineId: item.timelineId || createUid('timeline'),
            time: item.time || '',
            label: item.label || '',
          }))
        : emptyOperationsPlan().timeline,
    },
    readinessChecklist: {
      ...emptyReadinessChecklist(),
      ...(hydratedEvent.readinessChecklist || {}),
    },
  }
}

function FieldError({ id, children }) {
  if (!children) return null
  return <p id={id} className="mt-1.5 text-[11px] font-medium text-[#C53030]">{children}</p>
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="mb-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8A3F4B]">{eyebrow}</p>
      <h3 className="mt-2 font-serif text-xl text-[#2B1723]">{title}</h3>
      {description && <p className="mt-2 text-sm leading-6 text-[#6B564C]">{description}</p>}
    </div>
  )
}

function stepHasErrors(stepId, errors) {
  if (!errors || Object.keys(errors).length === 0) return false

  if (stepId === 'basics') {
    return ['eventName', 'eventDate', 'venueName', 'location', 'eventType', 'status', 'eventStartTime'].some((key) => errors[key])
  }

  if (stepId === 'registration') {
    return ['capacity', 'ticketPrice', 'ticketTypeCount', 'registrationOpenDate', 'registrationCloseDate', 'priceTiers'].some((key) => errors[key])
  }

  if (stepId === 'financial-plan') return Boolean(errors.financialPlan)
  if (stepId === 'operations') return Boolean(errors.operationsPlan)
  return false
}

export function EventFormModal({ event, onClose, onSave }) {
  const formRef = useRef(null)
  const [values, setValues] = useState(() => valuesFromEvent(event))
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const isEditing = Boolean(event)
  const currentStep = STEPS[stepIndex]
  const readiness = useMemo(() => buildReadinessChecklist(values), [values])
  const activeStatusMeta = useMemo(
    () => EVENT_STATUS_OPTIONS.find((option) => option.value === values.status) || EVENT_STATUS_OPTIONS[0],
    [values.status],
  )

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

  function updateNestedField(group, field, value) {
    setValues((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [field]: value,
      },
    }))
    if (errors[group]?.[field]) {
      setErrors((current) => ({
        ...current,
        [group]: {
          ...current[group],
          [field]: '',
        },
      }))
    }
  }

  function updateReadiness(key, checked) {
    updateNestedField('readinessChecklist', key, checked)
  }

  function addTier() {
    if (values.priceTiers.length >= MAX_PRICE_TIERS) return
    setValues((current) => ({
      ...current,
      priceTiers: [...current.priceTiers, { ...EMPTY_TIER }],
      ticketTypeCount: String(Math.max(Number(current.ticketTypeCount) || 1, current.priceTiers.length + 1)),
    }))
  }

  function removeTier(index) {
    setValues((current) => {
      const nextTiers = current.priceTiers.filter((_, tierIndex) => tierIndex !== index)
      return {
        ...current,
        priceTiers: nextTiers,
        ticketTypeCount: String(Math.max(1, nextTiers.length || Number(current.ticketTypeCount) || 1)),
      }
    })
  }

  function updateTier(index, field, value) {
    setValues((current) => {
      const tiers = [...current.priceTiers]
      tiers[index] = { ...tiers[index], [field]: value }
      return { ...current, priceTiers: tiers }
    })
  }

  function addTimelineRow() {
    setValues((current) => ({
      ...current,
      operationsPlan: {
        ...current.operationsPlan,
        timeline: [...current.operationsPlan.timeline, { timelineId: createUid('timeline'), time: '', label: '' }],
      },
    }))
  }

  function updateTimelineRow(index, field, value) {
    setValues((current) => {
      const timeline = [...current.operationsPlan.timeline]
      timeline[index] = { ...timeline[index], [field]: value }
      return {
        ...current,
        operationsPlan: {
          ...current.operationsPlan,
          timeline,
        },
      }
    })
  }

  function removeTimelineRow(index) {
    setValues((current) => {
      const timeline = current.operationsPlan.timeline.filter((_, rowIndex) => rowIndex !== index)
      return {
        ...current,
        operationsPlan: {
          ...current.operationsPlan,
          timeline: timeline.length > 0 ? timeline : [{ timelineId: createUid('timeline'), time: '', label: '' }],
        },
      }
    })
  }

  async function handleSubmit(submitEvent) {
    submitEvent.preventDefault()
    const validationErrors = validateEvent(values)
    setErrors(validationErrors)
    setSaveError('')

    if (Object.keys(validationErrors).length > 0) {
      const firstInvalidStep = STEPS.findIndex((step) => stepHasErrors(step.id, validationErrors))
      if (firstInvalidStep >= 0) setStepIndex(firstInvalidStep)
      return
    }

    setSaving(true)
    try {
      await onSave(values)
    } catch (error) {
      setSaveError(error.message || 'The event could not be saved. Please try again.')
      setSaving(false)
    }
  }

  function handleNextStep() {
    const validationErrors = validateEvent(values)
    setErrors(validationErrors)
    if (stepHasErrors(currentStep.id, validationErrors)) return
    setStepIndex((current) => Math.min(STEPS.length - 1, current + 1))
  }

  function handlePreviousStep() {
    setStepIndex((current) => Math.max(0, current - 1))
  }

  function handlePrimaryAction() {
    if (stepIndex < STEPS.length - 1) {
      handleNextStep()
      return
    }

    formRef.current?.requestSubmit()
  }

  const inputClass = (field) => `event-input ${errors[field] ? 'event-input-error' : ''}`

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-[#160B12]/65 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-form-title"
        className="event-modal-safe flex max-h-[calc(100dvh-0.75rem)] w-full max-w-5xl flex-col overflow-hidden rounded-t-[26px] bg-[#FFFDFB] shadow-[0_28px_90px_rgba(26,12,19,0.3)] sm:my-auto sm:max-h-[calc(100dvh-3rem)] sm:rounded-[26px]"
      >
        <div className="flex items-center justify-between border-b border-[#EEDFD6] px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#FCEEF1] text-[#9A5260]">
              <CalendarDays className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">{isEditing ? 'Update event plan' : 'Plan a New Event'}</p>
              <h2 id="event-form-title" className="mt-1 truncate font-serif text-xl text-[#2B1723]">
                {isEditing ? 'Edit event setup' : 'Create an organizer-ready event'}
              </h2>
              <p className="mt-1 text-xs text-[#6B564C]">{currentStep.label}: {currentStep.description}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl p-2 text-[#9B867A] hover:bg-[#F8EFEA]" aria-label="Close event form">
            <X className="size-5" />
          </button>
        </div>

        <div className="border-b border-[#EEDFD6] bg-[#FFF8F2] px-5 py-4 sm:px-7">
          <div className="grid gap-3 md:grid-cols-5">
            {STEPS.map((step, index) => {
              const active = index === stepIndex
              const complete = index < stepIndex
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setStepIndex(index)}
                  className={`rounded-2xl border px-3 py-3 text-left transition ${
                    active
                      ? 'border-[#9A5260] bg-white shadow-sm'
                      : complete
                        ? 'border-[#CFE8D8] bg-[#F2FAF5]'
                        : 'border-[#EEDFD6] bg-white/70'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`grid size-6 place-items-center rounded-full text-[10px] font-bold ${
                      complete ? 'bg-[#1E7345] text-white' : active ? 'bg-[#9A5260] text-white' : 'bg-[#F7E7EA] text-[#8A3F4B]'
                    }`}>
                      {complete ? <CheckCircle2 className="size-3.5" /> : index + 1}
                    </span>
                    <span className="text-xs font-bold text-[#2B1723]">{step.label}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
            {saveError && <div className="mb-5 rounded-xl border border-[#F0C6C6] bg-[#FFF4F4] px-4 py-3 text-xs text-[#A32626]" role="alert">{saveError}</div>}

            {currentStep.id === 'basics' && (
              <>
                <SectionHeading
                  eyebrow="Step 1"
                  title="Event Basics"
                  description="This is the organizer-friendly event profile guests and staff will work from later."
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="eventName" className="event-label">Event name <span>*</span></label>
                    <input
                      id="eventName"
                      value={values.eventName}
                      onChange={(changeEvent) => updateField('eventName', changeEvent.target.value)}
                      className={inputClass('eventName')}
                      placeholder="Gather & Savor Summer Brunch"
                      disabled={saving}
                      autoFocus
                    />
                    <FieldError id="eventName-error">{errors.eventName}</FieldError>
                  </div>

                  <div>
                    <label htmlFor="eventType" className="event-label">Event type <span>*</span></label>
                    <select id="eventType" value={values.eventType} onChange={(changeEvent) => updateField('eventType', changeEvent.target.value)} className={inputClass('eventType')} disabled={saving}>
                      {EVENT_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <FieldError id="eventType-error">{errors.eventType}</FieldError>
                  </div>

                  <div>
                    <label htmlFor="status" className="event-label">Lifecycle status <span>*</span></label>
                    <select id="status" value={values.status} onChange={(changeEvent) => updateField('status', changeEvent.target.value)} className={inputClass('status')} disabled={saving}>
                      {EVENT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <p className="mt-1 text-[11px] leading-5 text-[#80685B]">{activeStatusMeta.description}</p>
                    <FieldError id="status-error">{errors.status}</FieldError>
                  </div>

                  <div>
                    <label htmlFor="eventDate" className="event-label">Event date <span>*</span></label>
                    <input id="eventDate" type="date" value={values.eventDate} onChange={(changeEvent) => updateField('eventDate', changeEvent.target.value)} className={inputClass('eventDate')} disabled={saving} />
                    <FieldError id="eventDate-error">{errors.eventDate}</FieldError>
                  </div>

                  <div>
                    <label htmlFor="venueName" className="event-label">Venue <span>*</span></label>
                    <input id="venueName" value={values.venueName} onChange={(changeEvent) => updateField('venueName', changeEvent.target.value)} className={inputClass('venueName')} placeholder="LESC Hall" disabled={saving} />
                    <FieldError id="venueName-error">{errors.venueName}</FieldError>
                  </div>

                  <div>
                    <label htmlFor="eventStartTime" className="event-label">Start time <span>*</span></label>
                    <input id="eventStartTime" type="time" value={values.eventStartTime} onChange={(changeEvent) => updateField('eventStartTime', changeEvent.target.value)} className={inputClass('eventStartTime')} disabled={saving} />
                    <FieldError id="eventStartTime-error">{errors.eventStartTime}</FieldError>
                  </div>

                  <div>
                    <label htmlFor="eventEndTime" className="event-label">End time</label>
                    <input id="eventEndTime" type="time" value={values.eventEndTime} onChange={(changeEvent) => updateField('eventEndTime', changeEvent.target.value)} className={inputClass('eventEndTime')} disabled={saving} />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="location" className="event-label">Location <span>*</span></label>
                    <input id="location" value={values.location} onChange={(changeEvent) => updateField('location', changeEvent.target.value)} className={inputClass('location')} placeholder="Bridgetown, Barbados" disabled={saving} />
                    <FieldError id="location-error">{errors.location}</FieldError>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="eventDescription" className="event-label">Event description</label>
                    <textarea
                      id="eventDescription"
                      rows="3"
                      value={values.eventDescription}
                      onChange={(changeEvent) => updateField('eventDescription', changeEvent.target.value)}
                      className={`${inputClass('eventDescription')} resize-y`}
                      placeholder="Describe the experience, audience, or core event idea."
                      disabled={saving}
                    />
                  </div>
                </div>
              </>
            )}

            {currentStep.id === 'registration' && (
              <>
                <SectionHeading
                  eyebrow="Step 2"
                  title="Capacity and Registration"
                  description="Set the ticketing foundation before guests, payments, and check-in work begin."
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="capacity" className="event-label">Expected capacity <span>*</span></label>
                    <input id="capacity" type="number" min="1" step="1" value={values.capacity} onChange={(changeEvent) => updateField('capacity', changeEvent.target.value)} className={inputClass('capacity')} placeholder="150" disabled={saving} />
                    <FieldError id="capacity-error">{errors.capacity}</FieldError>
                  </div>

                  <div>
                    <label htmlFor="ticketTypeCount" className="event-label">Number of ticket types <span>*</span></label>
                    <input id="ticketTypeCount" type="number" min="1" max="12" step="1" value={values.ticketTypeCount} onChange={(changeEvent) => updateField('ticketTypeCount', changeEvent.target.value)} className={inputClass('ticketTypeCount')} placeholder="1" disabled={saving} />
                    <FieldError id="ticketTypeCount-error">{errors.ticketTypeCount}</FieldError>
                  </div>

                  <div>
                    <label htmlFor="ticketPrice" className="event-label">Default ticket price (BBD) <span>*</span></label>
                    <input id="ticketPrice" type="number" min="0" step="0.01" value={values.ticketPrice} onChange={(changeEvent) => updateField('ticketPrice', changeEvent.target.value)} className={inputClass('ticketPrice')} placeholder="75.00" disabled={saving} />
                    <p className="mt-1 text-[11px] leading-5 text-[#80685B]">This stays as the base fallback price. Price tiers can still be more specific.</p>
                    <FieldError id="ticketPrice-error">{errors.ticketPrice}</FieldError>
                  </div>

                  <div className="rounded-2xl border border-[#EFE2DA] bg-white px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#80685B]">Registration rules</p>
                    <div className="mt-3 space-y-3">
                      <label className="flex items-start gap-3 text-sm text-[#2B1723]">
                        <input type="checkbox" checked={values.registrationRequired} onChange={(changeEvent) => updateField('registrationRequired', changeEvent.target.checked)} className="mt-1" />
                        Registration is required before a guest is added to the event.
                      </label>
                      <label className="flex items-start gap-3 text-sm text-[#2B1723]">
                        <input type="checkbox" checked={values.complimentaryAllowed} onChange={(changeEvent) => updateField('complimentaryAllowed', changeEvent.target.checked)} className="mt-1" />
                        Complimentary attendees are allowed for this event.
                      </label>
                      <label className="flex items-start gap-3 text-sm text-[#2B1723]">
                        <input type="checkbox" checked={values.doorPaymentAllowed} onChange={(changeEvent) => updateField('doorPaymentAllowed', changeEvent.target.checked)} className="mt-1" />
                        Door payment is allowed.
                      </label>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="registrationOpenDate" className="event-label">Registration opening date</label>
                    <input id="registrationOpenDate" type="date" value={values.registrationOpenDate} onChange={(changeEvent) => updateField('registrationOpenDate', changeEvent.target.value)} className={inputClass('registrationOpenDate')} disabled={saving} />
                    <FieldError id="registrationOpenDate-error">{errors.registrationOpenDate}</FieldError>
                  </div>

                  <div>
                    <label htmlFor="registrationCloseDate" className="event-label">Registration closing date</label>
                    <input id="registrationCloseDate" type="date" value={values.registrationCloseDate} onChange={(changeEvent) => updateField('registrationCloseDate', changeEvent.target.value)} className={inputClass('registrationCloseDate')} disabled={saving} />
                    <FieldError id="registrationCloseDate-error">{errors.registrationCloseDate}</FieldError>
                  </div>
                </div>

                <div className="mt-7">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">Optional</p>
                      <h3 className="font-serif text-base text-[#2B1723]">Ticket types and price tiers</h3>
                    </div>
                    {values.priceTiers.length < MAX_PRICE_TIERS && (
                      <button
                        type="button"
                        onClick={addTier}
                        disabled={saving}
                        id="add-price-tier"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1D1C8] px-3 py-2 text-[11px] font-bold text-[#6B564C] hover:bg-[#FFF8F2] disabled:opacity-50"
                      >
                        <Plus className="size-3.5" />
                        Add tier
                      </button>
                    )}
                  </div>

                  {errors.priceTiers?._array && (
                    <p className="mb-3 text-[11px] font-medium text-[#C53030]">{errors.priceTiers._array}</p>
                  )}

                  {values.priceTiers.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[#EEDFD6] bg-[#FFF8F2] px-4 py-4 text-xs text-[#A08578]">
                      No price tiers set yet. Add tiers when the event needs early-bird, door, group, or complimentary pricing.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {values.priceTiers.map((tier, index) => (
                        <div key={index} className="rounded-xl border border-[#EEDFD6] bg-[#FFF8F2] p-4">
                          <div className="grid gap-3 sm:grid-cols-[1fr_120px_120px_auto]">
                            <div>
                              <label htmlFor={`tier-name-${index}`} className="event-label">Tier name</label>
                              <select
                                id={`tier-name-${index}`}
                                value={VALID_TIER_NAMES.includes(tier.name) ? tier.name : 'General'}
                                onChange={(changeEvent) => updateTier(index, 'name', changeEvent.target.value)}
                                className="event-input"
                                disabled={saving}
                              >
                                {VALID_TIER_NAMES.map((name) => (
                                  <option key={name} value={name}>{name}</option>
                                ))}
                              </select>
                              {errors.priceTiers?.[index]?.name && (
                                <p className="mt-1 text-[11px] font-medium text-[#C53030]">{errors.priceTiers[index].name}</p>
                              )}
                            </div>

                            <div>
                              <label htmlFor={`tier-price-${index}`} className="event-label">Price (BBD)</label>
                              <input
                                id={`tier-price-${index}`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={tier.price}
                                onChange={(changeEvent) => updateTier(index, 'price', changeEvent.target.value)}
                                className="event-input"
                                placeholder="0.00"
                                disabled={saving}
                              />
                              {errors.priceTiers?.[index]?.price && (
                                <p className="mt-1 text-[11px] font-medium text-[#C53030]">{errors.priceTiers[index].price}</p>
                              )}
                            </div>

                            <div>
                              <label htmlFor={`tier-status-${index}`} className="event-label">Status</label>
                              <select
                                id={`tier-status-${index}`}
                                value={tier.status}
                                onChange={(changeEvent) => updateTier(index, 'status', changeEvent.target.value)}
                                className="event-input"
                                disabled={saving}
                              >
                                {VALID_TIER_STATUSES.map((status) => (
                                  <option key={status} value={status}>{tierStatusLabels[status]}</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-end pb-0.5">
                              <button
                                type="button"
                                onClick={() => removeTier(index)}
                                disabled={saving}
                                aria-label={`Remove tier ${index + 1}`}
                                className="rounded-lg p-2 text-[#9B867A] hover:bg-[#FCEEF1] hover:text-[#9A5260] disabled:opacity-40"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {currentStep.id === 'financial-plan' && (
              <>
                <SectionHeading
                  eyebrow="Step 3"
                  title="Financial Plan"
                  description="These planning numbers help the organizer understand the event budget and projected cash position before the event runs."
                />

                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    ['projectedRegistrationIncome', 'Projected registration income'],
                    ['venueBudget', 'Venue budget'],
                    ['supplierBudget', 'Supplier budget'],
                    ['entertainmentBudget', 'Entertainment budget'],
                    ['marketingBudget', 'Marketing budget'],
                    ['staffingBudget', 'Staffing budget'],
                    ['contingencyBudget', 'Contingency'],
                    ['otherBudget', 'Other budget'],
                  ].map(([field, label]) => (
                    <div key={field}>
                      <label htmlFor={field} className="event-label">{label}</label>
                      <input
                        id={field}
                        type="number"
                        min="0"
                        step="0.01"
                        value={values.financialPlan[field]}
                        onChange={(changeEvent) => updateNestedField('financialPlan', field, changeEvent.target.value)}
                        className="event-input"
                        placeholder="0.00"
                        disabled={saving}
                      />
                      <FieldError id={`${field}-error`}>{errors.financialPlan?.[field]}</FieldError>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-[#E6D4B4] bg-[#FFF8EA] p-4 text-sm leading-6 text-[#715D46]">
                  Keep projected registration income, sponsorship, paid expenses, and outstanding commitments separate. Projected cash position is not the same as final profit.
                </div>
              </>
            )}

            {currentStep.id === 'operations' && (
              <>
                <SectionHeading
                  eyebrow="Step 4"
                  title="Operations"
                  description="Set the core logistics now. Detailed suppliers, sponsors, bakers, and commitments can be managed from Operations after the event is created."
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="venueAccessTime" className="event-label">Venue access time</label>
                    <input id="venueAccessTime" type="time" value={values.operationsPlan.venueAccessTime} onChange={(changeEvent) => updateNestedField('operationsPlan', 'venueAccessTime', changeEvent.target.value)} className="event-input" disabled={saving} />
                  </div>

                  <div>
                    <label htmlFor="setupTime" className="event-label">Setup time</label>
                    <input id="setupTime" type="time" value={values.operationsPlan.setupTime} onChange={(changeEvent) => updateNestedField('operationsPlan', 'setupTime', changeEvent.target.value)} className="event-input" disabled={saving} />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="emergencyContact" className="event-label">Emergency contact</label>
                    <input id="emergencyContact" value={values.operationsPlan.emergencyContact} onChange={(changeEvent) => updateNestedField('operationsPlan', 'emergencyContact', changeEvent.target.value)} className="event-input" placeholder="Emergency contact name and number" disabled={saving} />
                  </div>

                  {[
                    ['suppliersNote', 'Suppliers'],
                    ['bakerVendorNote', 'Bakers and vendors'],
                    ['sponsorNote', 'Sponsors'],
                    ['staffNote', 'Staff and helpers'],
                    ['equipmentNote', 'Equipment'],
                    ['licencesNote', 'Licences'],
                    ['insuranceNote', 'Insurance'],
                  ].map(([field, label]) => (
                    <div key={field} className={field === 'insuranceNote' ? 'sm:col-span-2' : ''}>
                      <label htmlFor={field} className="event-label">{label}</label>
                      <textarea
                        id={field}
                        rows="2"
                        value={values.operationsPlan[field]}
                        onChange={(changeEvent) => updateNestedField('operationsPlan', field, changeEvent.target.value)}
                        className="event-input resize-y"
                        placeholder={`Notes for ${label.toLowerCase()}`}
                        disabled={saving}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-7">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">Event-day timeline</p>
                      <h3 className="font-serif text-base text-[#2B1723]">Key schedule points</h3>
                    </div>
                    <button type="button" onClick={addTimelineRow} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1D1C8] px-3 py-2 text-[11px] font-bold text-[#6B564C] hover:bg-[#FFF8F2] disabled:opacity-50">
                      <Plus className="size-3.5" />
                      Add row
                    </button>
                  </div>

                  <div className="space-y-3">
                    {values.operationsPlan.timeline.map((item, index) => (
                      <div key={item.timelineId} className="rounded-xl border border-[#EEDFD6] bg-[#FFF8F2] p-4">
                        <div className="grid gap-3 sm:grid-cols-[120px_1fr_auto]">
                          <div>
                            <label htmlFor={`timeline-time-${index}`} className="event-label">Time</label>
                            <input id={`timeline-time-${index}`} type="time" value={item.time} onChange={(changeEvent) => updateTimelineRow(index, 'time', changeEvent.target.value)} className="event-input" disabled={saving} />
                          </div>
                          <div>
                            <label htmlFor={`timeline-label-${index}`} className="event-label">What happens</label>
                            <input id={`timeline-label-${index}`} value={item.label} onChange={(changeEvent) => updateTimelineRow(index, 'label', changeEvent.target.value)} className="event-input" placeholder="Doors open, setup complete, welcome, service starts..." disabled={saving} />
                          </div>
                          <div className="flex items-end pb-0.5">
                            <button type="button" onClick={() => removeTimelineRow(index)} disabled={saving} className="rounded-lg p-2 text-[#9B867A] hover:bg-[#FCEEF1] hover:text-[#9A5260] disabled:opacity-40" aria-label={`Remove timeline row ${index + 1}`}>
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                        <FieldError id={`timeline-row-${index}-error`}>{errors.operationsPlan?.timeline?.[index]}</FieldError>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {currentStep.id === 'readiness' && (
              <>
                <SectionHeading
                  eyebrow="Step 5"
                  title="Readiness"
                  description="Review the event setup and confirm the organizer-facing readiness items that are already complete."
                />

                <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                  <div className="rounded-2xl border border-[#EEDFD6] bg-white p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#80685B]">Event summary</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-[#FBF8F5] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#80685B]">Event</p>
                        <p className="mt-1 text-sm font-bold text-[#2B1723]">{values.eventName || 'Untitled event'}</p>
                      </div>
                      <div className="rounded-xl bg-[#FBF8F5] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#80685B]">Status</p>
                        <p className="mt-1 text-sm font-bold text-[#2B1723]">{activeStatusMeta.label}</p>
                      </div>
                      <div className="rounded-xl bg-[#FBF8F5] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#80685B]">Date and time</p>
                        <p className="mt-1 text-sm font-bold text-[#2B1723]">{values.eventDate || 'Date not set'}{values.eventStartTime ? ` · ${values.eventStartTime}` : ''}</p>
                      </div>
                      <div className="rounded-xl bg-[#FBF8F5] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#80685B]">Venue</p>
                        <p className="mt-1 text-sm font-bold text-[#2B1723]">{values.venueName || 'Venue not set'}</p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-[#E6D4B4] bg-[#FFF8EA] p-4 text-sm leading-6 text-[#715D46]">
                      {readiness.needsAttentionCount === 0
                        ? 'This event already has the core essentials needed to open the organizer Overview.'
                        : `${readiness.needsAttentionCount} readiness item${readiness.needsAttentionCount === 1 ? '' : 's'} still need attention before this event looks fully prepared.`}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#EEDFD6] bg-white p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#80685B]">Organizer readiness</p>
                    <div className="mt-4 space-y-3">
                      {[
                        ['venueConfirmed', 'Venue is confirmed'],
                        ['venueAccessConfirmed', 'Venue access time is confirmed'],
                        ['paymentMethodsConfigured', 'Payment methods are configured'],
                        ['suppliersConfirmed', 'Suppliers or vendors are confirmed'],
                        ['staffAssigned', 'Staff or helpers are assigned'],
                        ['eventDayTimelineReady', 'Event-day timeline is ready'],
                        ['ticketProcessReady', 'Ticket process is ready'],
                        ['checkInProcessReady', 'Check-In process is ready'],
                        ['communicationsPrepared', 'Communications are prepared'],
                        ['licencesReviewed', 'Required licences were reviewed'],
                        ['insuranceReviewed', 'Insurance was reviewed'],
                      ].map(([key, label]) => (
                        <label key={key} className="flex items-start gap-3 rounded-xl border border-[#F2E8E1] bg-[#FBF8F5] px-4 py-3 text-sm text-[#2B1723]">
                          <input type="checkbox" checked={Boolean(values.readinessChecklist[key])} onChange={(changeEvent) => updateReadiness(key, changeEvent.target.checked)} className="mt-1" />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-[#EEDFD6] bg-[#FBF8F5] p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#80685B]">Checklist snapshot</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {readiness.items.map((item) => (
                      <div key={item.key} className="rounded-xl border border-white bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-bold text-[#2B1723]">{item.label}</p>
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                            item.status === 'Ready'
                              ? 'bg-[#EAF6EF] text-[#17623A]'
                              : item.status === 'Not Required'
                                ? 'bg-[#F7F1ED] text-[#6B564C]'
                                : 'bg-[#FFF1F1] text-[#A32626]'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6">
                  <label htmlFor="notes" className="event-label">Internal planning notes</label>
                  <textarea id="notes" rows="3" value={values.notes} onChange={(changeEvent) => updateField('notes', changeEvent.target.value)} className={`${inputClass('notes')} resize-y`} placeholder="Optional notes for the organizer team." disabled={saving} />
                </div>
              </>
            )}
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-[#EEDFD6] bg-white px-5 py-4 sm:flex-row sm:justify-between sm:px-7">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-[#E1D1C8] px-5 py-3 text-xs font-bold text-[#6B564C] hover:bg-[#FFF8F2] disabled:opacity-50">Cancel</button>
              {stepIndex > 0 && (
                <button type="button" onClick={handlePreviousStep} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-[#E1D1C8] px-5 py-3 text-xs font-bold text-[#6B564C] hover:bg-[#FFF8F2] disabled:opacity-50">
                  <ChevronLeft className="size-4" />
                  Back
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={saving}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-bold text-white shadow-lg disabled:opacity-60 ${
                stepIndex < STEPS.length - 1
                  ? 'min-w-32 bg-[#2B1723] shadow-[#2B1723]/20 hover:bg-[#3D2232]'
                  : 'min-w-40 bg-[#9A5260] shadow-[#9A5260]/20 hover:bg-[#A9606B]'
              }`}
            >
              {stepIndex < STEPS.length - 1 ? (
                <>
                  Next
                  <ChevronRight className="size-4" />
                </>
              ) : (
                <>
                  {saving && <span className="size-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                  {saving ? 'Saving...' : isEditing ? 'Save and keep planning' : 'Create and open Overview'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
