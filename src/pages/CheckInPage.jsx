import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ClipboardCheck, Search, XCircle } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { subscribeToRegistrations } from '../services/registrationService'
import { completeCheckIn, recordDuplicateCheckInAttempt } from '../services/ticketService'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { canCompleteCheckIn, checkInWarnings, searchableRegistrationText } from '../utils/ticketUtils'

function StatusBadge({ children, tone = 'neutral' }) {
  const tones = {
    green: 'bg-[#E5F3EC] text-[#1E7345]',
    gold: 'bg-[#FFF4DF] text-[#986F26]',
    blush: 'bg-[#FCEEF1] text-[#A32626]',
    plum: 'bg-[#F2E8FA] text-[#6B3FA0]',
    neutral: 'bg-[#F7F1ED] text-[#8C766A]',
  }
  return <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${tones[tone]}`}>{children}</span>
}

function paymentTone(status) {
  if (status === 'paid') return 'green'
  if (status === 'pending' || status === 'unknown') return 'gold'
  if (status === 'complimentary') return 'plum'
  return 'neutral'
}

function useRegistrations(activeEvent) {
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!activeEvent?.eventId) {
      setLoading(false)
      return undefined
    }
    setLoading(true)
    setError('')
    return subscribeToRegistrations(
      activeEvent.eventId,
      (data) => {
        setRegistrations(data)
        setLoading(false)
      },
      (err) => {
        if (import.meta.env.DEV) console.error('Check-in registration fetch error:', err)
        setError('Could not load the door list.')
        setLoading(false)
      },
    )
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeEvent?.eventId])

  return { registrations, loading, error }
}

export function CheckInPage() {
  const { user } = useAuth()
  const { activeEvent } = useActiveEvent()
  const { registrations, loading, error } = useRegistrations(activeEvent)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')

  const matches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return []
    return registrations
      .filter((registration) => searchableRegistrationText(registration).includes(query))
      .slice(0, 8)
  }, [registrations, searchQuery])

  const selectedRegistration = registrations.find((registration) => registration.registrationId === selectedId) || matches[0]
  const selectedWarnings = selectedRegistration ? checkInWarnings(selectedRegistration) : []
  const checkInState = selectedRegistration ? canCompleteCheckIn(selectedRegistration) : { allowed: false, reason: '' }

  if (!activeEvent?.eventId) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="No selected event"
        description="Select a Working Event before opening the door check-in screen."
        action={<Link to="/events" className="mt-6 inline-block rounded-xl bg-[#B76E79] px-6 py-2.5 text-sm font-bold text-white">Choose an event</Link>}
      />
    )
  }

  if (loading) return <LoadingState message="Loading door list…" />

  async function handleCheckIn() {
    if (!selectedRegistration || !checkInState.allowed) return
    setSaving(true)
    setMessage('')
    setActionError('')
    try {
      await completeCheckIn(selectedRegistration, user)
      setMessage(`${selectedRegistration.fullName} checked in.`)
      setSearchQuery('')
      setSelectedId('')
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
      setActionError(err.message || 'Check-in failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDuplicateAttempt() {
    if (!selectedRegistration) return
    setSaving(true)
    setMessage('')
    setActionError('')
    try {
      await recordDuplicateCheckInAttempt(selectedRegistration, user)
      setMessage('Duplicate check-in attempt recorded.')
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
      setActionError('Duplicate attempt could not be recorded.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#1E7345]">Phase 4.5</p>
          <h2 className="font-serif text-3xl text-[#2B1723]">Door Check-In</h2>
          <p className="mt-2 text-sm text-[#816D62]">
            Checking in guests for <strong>{activeEvent.eventName}</strong>.
          </p>
        </div>
        <div className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-3 text-xs text-[#6B564C]">
          QR scan coming later; search by ticket code is active now.
        </div>
      </header>

      {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}
      {message && <div className="rounded-xl border border-[#CFE8D8] bg-[#E5F3EC] px-4 py-3 text-sm text-[#1E7345]">{message}</div>}
      {actionError && <div className="rounded-xl border border-[#F2C3C3] bg-[#FFF1F1] px-4 py-3 text-sm text-[#A32626]">{actionError}</div>}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#EEDFD6] bg-white p-4 shadow-[0_4px_16px_rgba(43,23,35,0.03)]">
            <label htmlFor="door-search" className="event-label">Find guest</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#B8A49A]" />
              <input
                id="door-search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value)
                  setSelectedId('')
                  setMessage('')
                  setActionError('')
                }}
                placeholder="Name, email, phone, or GSV ticket code"
                className="min-h-16 w-full rounded-2xl border border-[#E5D7CF] bg-white py-4 pl-12 pr-4 text-lg font-semibold text-[#2B1723] focus:border-[#B76E79] focus:outline-none focus:ring-4 focus:ring-[#B76E79]/15"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="grid gap-2">
            {searchQuery.trim() && matches.length === 0 && (
              <div className="rounded-xl border border-[#F2C3C3] bg-[#FFF1F1] p-4 text-sm text-[#A32626]">
                No guest found. Try a shorter name, email, phone, or ticket code.
              </div>
            )}
            {matches.map((registration) => (
              <button
                key={registration.registrationId}
                type="button"
                onClick={() => setSelectedId(registration.registrationId)}
                className={`rounded-xl border p-4 text-left transition ${selectedRegistration?.registrationId === registration.registrationId ? 'border-[#B76E79] bg-[#FFF8F2]' : 'border-[#EEDFD6] bg-white hover:bg-[#FBF8F5]'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#2B1723]">{registration.fullName}</p>
                    <p className="mt-1 text-xs text-[#816D62]">{registration.email || registration.phone || registration.ticketCode || 'No contact'}</p>
                  </div>
                  <StatusBadge tone={registration.checkedIn ? 'green' : 'neutral'}>{registration.checkedIn ? 'Checked in' : 'Waiting'}</StatusBadge>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[24rem] rounded-2xl border border-[#EEDFD6] bg-white p-5 shadow-[0_4px_16px_rgba(43,23,35,0.03)] sm:p-6">
          {!selectedRegistration ? (
            <div className="grid min-h-[20rem] place-items-center text-center">
              <div>
                <ClipboardCheck className="mx-auto size-12 text-[#C4B4AA]" />
                <h3 className="mt-4 font-serif text-2xl text-[#2B1723]">Ready for the next guest</h3>
                <p className="mt-2 text-sm text-[#816D62]">Search to open a guest card.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#8C7567]">Guest</p>
                  <h3 className="mt-1 font-serif text-3xl text-[#2B1723]">{selectedRegistration.fullName}</h3>
                  <p className="mt-2 text-sm text-[#816D62]">
                    {selectedRegistration.email || 'No email'} {selectedRegistration.phone ? `· ${selectedRegistration.phone}` : ''}
                  </p>
                </div>
                {selectedRegistration.checkedIn ? (
                  <CheckCircle2 className="size-12 shrink-0 text-[#1E7345]" />
                ) : (
                  <ClipboardCheck className="size-12 shrink-0 text-[#B76E79]" />
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-[#FBF8F5] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8C7567]">Payment</p>
                  <div className="mt-2"><StatusBadge tone={paymentTone(selectedRegistration.paymentStatus)}>{selectedRegistration.paymentStatus?.replace('-', ' ') || 'unknown'}</StatusBadge></div>
                </div>
                <div className="rounded-xl bg-[#FBF8F5] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8C7567]">Ticket</p>
                  <p className="mt-2 font-mono text-sm font-bold text-[#2B1723]">{selectedRegistration.ticketCode || 'Not assigned'}</p>
                </div>
                <div className="rounded-xl bg-[#FBF8F5] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8C7567]">Door status</p>
                  <div className="mt-2"><StatusBadge tone={selectedRegistration.checkedIn ? 'green' : 'neutral'}>{selectedRegistration.checkedIn ? 'Checked in' : 'Not checked in'}</StatusBadge></div>
                </div>
              </div>

              {selectedWarnings.length > 0 && !selectedRegistration.checkedIn && (
                <div className="rounded-xl border border-[#F2D6A3] bg-[#FFF7E8] p-4 text-sm text-[#7A5818]">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                    <div>
                      <p className="font-bold">Review before check-in</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4">
                        {selectedWarnings.map((warning) => <li key={warning}>{warning}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {selectedRegistration.checkedIn && (
                <div className="rounded-xl border border-[#CFE8D8] bg-[#E5F3EC] p-4 text-sm text-[#1E7345]">
                  <div className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
                    <div>
                      <p className="font-bold">Already checked in</p>
                      <p className="mt-1">Duplicate check-in is blocked in this phase.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={saving || !checkInState.allowed}
                  className="flex min-h-16 flex-1 items-center justify-center gap-3 rounded-2xl bg-[#B76E79] px-6 text-base font-bold text-white shadow-lg shadow-[#B76E79]/20 transition hover:bg-[#A9606B] disabled:cursor-not-allowed disabled:bg-[#D9C8C0] disabled:shadow-none"
                >
                  {checkInState.allowed ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
                  {saving ? 'Saving…' : checkInState.allowed ? 'Check in guest' : 'Check-in blocked'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedId('')
                    setMessage('')
                    setActionError('')
                  }}
                  className="min-h-16 rounded-2xl border border-[#E7D6CC] bg-white px-6 text-sm font-bold text-[#6B564C] hover:bg-[#FBF8F5]"
                >
                  Reset
                </button>
              </div>

              {selectedRegistration.checkedIn && (
                <button
                  type="button"
                  onClick={handleDuplicateAttempt}
                  disabled={saving}
                  className="w-full rounded-xl border border-[#E7D6CC] bg-white px-4 py-3 text-sm font-bold text-[#6B564C] hover:bg-[#FBF8F5] disabled:opacity-50"
                >
                  Record duplicate attempt
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
