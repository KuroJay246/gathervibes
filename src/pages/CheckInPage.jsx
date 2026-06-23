import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ClipboardCheck, Copy, Printer, Search, XCircle } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { subscribeToRegistrations } from '../services/registrationService'
import { completeCheckIn, recordDuplicateCheckInAttempt, undoCheckIn } from '../services/ticketService'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { QrScannerPanel } from '../components/checkin/QrScannerPanel'
import { canCompleteCheckIn, checkInWarnings, searchableRegistrationText } from '../utils/ticketUtils'
import { CHECK_IN_VIEWS, filterCheckInRegistrations, formatCheckInTime } from '../utils/checkInUtils'
import {
  buildEventDaySummary,
  formatDoorStatus,
  formatEventDayCsv,
  formatPaymentLabel,
  formatTicketStatus,
  getDoorListRegistrations,
  getMissingTicketRegistrations,
  getPendingPaymentRegistrations,
} from '../utils/eventDayUtils'

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
  const [activeView, setActiveView] = useState('search')
  const [confirmUndo, setConfirmUndo] = useState(false)
  const [helperView, setHelperView] = useState('door')
  const [helperMessage, setHelperMessage] = useState('')
  const summary = useMemo(() => buildEventDaySummary(registrations), [registrations])
  const visibleRegistrations = useMemo(
    () => filterCheckInRegistrations(registrations, activeView),
    [activeView, registrations],
  )
  const helperRows = useMemo(() => {
    if (helperView === 'missing-ticket') return getMissingTicketRegistrations(registrations)
    if (helperView === 'pending-payment') return getPendingPaymentRegistrations(registrations)
    return getDoorListRegistrations(registrations)
  }, [helperView, registrations])

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
      setMessage(`${selectedRegistration.fullName} checked in successfully.`)
      setSearchQuery('')
      setSelectedId('')
      setConfirmUndo(false)
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
      const permissionDenied = err?.code === 'permission-denied' || /permission|insufficient/i.test(err?.message || '')
      setActionError(permissionDenied
        ? 'Check-in was not saved because Firestore denied the write. No local success state was applied.'
        : err.message || 'Check-in failed. No local success state was applied.')
    } finally {
      setSaving(false)
    }
  }

  async function copyHelperCsv() {
    setHelperMessage('')
    try {
      await navigator.clipboard.writeText(formatEventDayCsv(helperRows, activeEvent))
      setHelperMessage('CSV text copied for the selected event-day list.')
    } catch {
      setHelperMessage('Copy failed. Select the list text manually or use browser print.')
    }
  }

  async function handleUndoCheckIn() {
    if (!selectedRegistration?.checkedIn) return
    setSaving(true)
    setMessage('')
    setActionError('')
    try {
      await undoCheckIn(selectedRegistration, user)
      setMessage(`Check-in undone for ${selectedRegistration.fullName}.`)
      setConfirmUndo(false)
      setSearchQuery('')
      setSelectedId('')
      setActiveView('not-checked-in')
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
      const permissionDenied = err?.code === 'permission-denied' || /permission|insufficient/i.test(err?.message || '')
      setActionError(permissionDenied
        ? 'Undo check-in was not saved because Firestore denied the write. The guest remains checked in.'
        : err.message || 'Undo check-in failed. The guest remains checked in.')
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

  function handleQrMatch(registration, ticketCode) {
    setActiveView('search')
    setSelectedId(registration.registrationId)
    setSearchQuery(ticketCode)
    setActionError('')
    setConfirmUndo(false)
    setMessage(registration.checkedIn
      ? `${registration.fullName} is already checked in. Duplicate check-in is blocked.`
      : `${registration.fullName} matched from ticket ${ticketCode}. Review before checking in.`)
  }

  function handleQrMissing(ticketCode) {
    setActiveView('search')
    setSelectedId('')
    setMessage('')
    setActionError(`No matching ticket code ${ticketCode} was found for ${activeEvent.eventName}. Check that CODEX_TEST is the Working Event before testing.`)
  }

  function handleQrInvalid(errorMessage) {
    setMessage('')
    setActionError(errorMessage)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#1E7345]">Event-Day Mode</p>
          <h2 className="font-serif text-3xl text-[#2B1723]">Door Check-In / QR Scan</h2>
          <p className="mt-2 text-sm text-[#816D62]">
            Checking in guests for <strong>{activeEvent.eventName}</strong>.
          </p>
        </div>
        <div className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-3 text-xs text-[#6B564C]">
          QR scan, manual ticket lookup, and name search all use this Working Event only.
        </div>
      </header>

      {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}
      {message && <div className="rounded-xl border border-[#CFE8D8] bg-[#E5F3EC] px-4 py-3 text-sm text-[#1E7345]">{message}</div>}
      {actionError && <div className="rounded-xl border border-[#F2C3C3] bg-[#FFF1F1] px-4 py-3 text-sm text-[#A32626]">{actionError}</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Total registrations', summary.totalRegistrations],
          ['Total persons attending', summary.totalPersons],
          ['Checked-in registrations', summary.checkedInRegistrations],
          ['Checked-in persons', summary.checkedInPersons],
          ['Remaining registrations', summary.remainingRegistrations],
          ['Remaining persons', summary.remainingPersons],
          ['Paid / pending / comp', `${summary.paidRegistrations}/${summary.pendingRegistrations}/${summary.complimentaryRegistrations}`],
          ['Tickets assigned / missing', `${summary.ticketAssignedRegistrations}/${summary.missingTicketRegistrations}`],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-[#EEDFD6] bg-white p-4 shadow-[0_4px_16px_rgba(43,23,35,0.03)]">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#8C7567]">{label}</p>
            <p className="mt-2 text-2xl font-bold text-[#2B1723]">{value}</p>
          </article>
        ))}
      </section>

      <p className="rounded-xl border border-[#EEDFD6] bg-white px-4 py-3 text-xs leading-5 text-[#816D62]">
        Persons attending may be higher than registrations when one registration includes multiple guests.
      </p>

      <section className="rounded-2xl border border-[#EEDFD6] bg-white p-4 shadow-[0_4px_16px_rgba(43,23,35,0.03)] sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1E7345]">Event-day helpers</p>
            <h3 className="mt-1 font-serif text-2xl text-[#2B1723]">Print and export door lists</h3>
            <p className="mt-1 text-xs leading-5 text-[#816D62]">
              Client-side only. Nothing is uploaded and no new Firestore data is created.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ['door', 'Door list'],
              ['missing-ticket', 'Missing tickets'],
              ['pending-payment', 'Pending payment'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setHelperView(value)
                  setHelperMessage('')
                }}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${helperView === value ? 'bg-[#2B1723] text-white' : 'bg-[#F7F1ED] text-[#6B564C] hover:bg-[#EFE2DA]'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm font-bold text-[#2B1723]">{helperRows.length} registrations in selected list</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={copyHelperCsv}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-4 text-xs font-bold text-[#6B564C] hover:bg-[#FBF8F5]"
            >
              <Copy className="size-4" />
              Copy CSV text
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2B1723] px-4 text-xs font-bold text-white hover:bg-[#3B2430]"
            >
              <Printer className="size-4" />
              Print current list
            </button>
          </div>
        </div>
        {helperMessage && <div className="mt-3 rounded-xl border border-[#CFE8D8] bg-[#E5F3EC] px-4 py-3 text-sm text-[#1E7345]">{helperMessage}</div>}

        <div className="mt-4 overflow-hidden rounded-xl border border-[#F2E8E1]">
          <div className="max-h-72 overflow-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F2E8E1] bg-[#FBF8F5] font-bold uppercase tracking-wider text-[#8C7567]">
                  <th className="px-3 py-2">Guest</th>
                  <th className="px-3 py-2">Persons</th>
                  <th className="px-3 py-2">Payment</th>
                  <th className="px-3 py-2">Ticket</th>
                  <th className="px-3 py-2">Door</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2E8E1] bg-white">
                {helperRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-[#816D62]" colSpan={5}>No registrations in this helper list.</td>
                  </tr>
                ) : helperRows.map((registration) => (
                  <tr key={registration.registrationId}>
                    <td className="px-3 py-2 font-medium text-[#2B1723]">
                      <div>{registration.fullName}</div>
                      {registration.groupName && <div className="mt-0.5 text-[11px] text-[#8C7567]">{registration.groupName}</div>}
                    </td>
                    <td className="px-3 py-2 text-[#5D4A52]">{registration.personsAttending || 1}</td>
                    <td className="px-3 py-2 text-[#5D4A52]">{formatPaymentLabel(registration.paymentStatus)}</td>
                    <td className="px-3 py-2 font-mono text-[#5D4A52]">{registration.ticketCode || formatTicketStatus(registration)}</td>
                    <td className="px-3 py-2 text-[#5D4A52]">{formatDoorStatus(registration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="flex gap-2 overflow-x-auto pb-2">
        {CHECK_IN_VIEWS.map((view) => (
          <button
            key={view.value}
            type="button"
            onClick={() => {
              setActiveView(view.value)
              setMessage('')
              setActionError('')
            }}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${activeView === view.value ? 'bg-[#2B1723] text-white' : 'bg-white text-[#8C766A] hover:bg-[#F2E8E1]'}`}
          >
            {view.label}
          </button>
        ))}
      </section>

      {activeView === 'search' ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <QrScannerPanel
            registrations={registrations}
            onMatch={handleQrMatch}
            onMissing={handleQrMissing}
            onInvalid={handleQrInvalid}
          />

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
                  <div className="mt-2"><StatusBadge tone={paymentTone(selectedRegistration.paymentStatus)}>{formatPaymentLabel(selectedRegistration.paymentStatus)}</StatusBadge></div>
                </div>
                <div className="rounded-xl bg-[#FBF8F5] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8C7567]">Ticket</p>
                  <p className="mt-2 font-mono text-sm font-bold text-[#2B1723]">{selectedRegistration.ticketCode || formatTicketStatus(selectedRegistration)}</p>
                </div>
                <div className="rounded-xl bg-[#FBF8F5] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8C7567]">Door status</p>
                  <div className="mt-2"><StatusBadge tone={selectedRegistration.checkedIn ? 'green' : 'neutral'}>{formatDoorStatus(selectedRegistration)}</StatusBadge></div>
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
                      <p className="mt-1">Duplicate check-in is blocked. Use Undo Check-In only for an accidental check-in.</p>
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
                    setConfirmUndo(false)
                  }}
                  className="min-h-16 rounded-2xl border border-[#E7D6CC] bg-white px-6 text-sm font-bold text-[#6B564C] hover:bg-[#FBF8F5]"
                >
                  Clear Selected Guest
                </button>
              </div>

              {selectedRegistration.checkedIn && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmUndo(true)
                      setMessage('')
                      setActionError('')
                    }}
                  disabled={saving}
                    className="w-full rounded-2xl border border-[#F2C3C3] bg-[#FFF8F8] px-4 py-4 text-base font-bold text-[#A32626] hover:bg-[#FFF1F1] disabled:opacity-50"
                  >
                    Undo Check-In
                  </button>
                  <button
                    type="button"
                    onClick={handleDuplicateAttempt}
                    disabled={saving}
                    className="w-full rounded-xl border border-[#E7D6CC] bg-white px-4 py-3 text-sm font-bold text-[#6B564C] hover:bg-[#FBF8F5] disabled:opacity-50"
                  >
                    Record duplicate attempt
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-[#EEDFD6] bg-white p-4 shadow-[0_4px_16px_rgba(43,23,35,0.03)] sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1E7345]">{CHECK_IN_VIEWS.find((view) => view.value === activeView)?.label}</p>
              <h3 className="mt-1 font-serif text-2xl text-[#2B1723]">Checked-in guest visibility</h3>
            </div>
            <p className="text-xs font-semibold text-[#8C7567]">{visibleRegistrations.length} registrations shown</p>
          </div>

          {visibleRegistrations.length === 0 ? (
            <div className="mt-5 rounded-xl border border-[#F2E8E1] bg-[#FBF8F5] p-6 text-sm text-[#816D62]">
              No guests in this view for the selected Working Event.
            </div>
          ) : (
            <div className="mt-5 overflow-hidden rounded-xl border border-[#F2E8E1]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#F2E8E1] bg-[#FBF8F5] text-xs font-bold uppercase tracking-wider text-[#8C7567]">
                      <th className="px-4 py-3">Guest</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Group</th>
                      <th className="px-4 py-3">Persons</th>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3">Ticket Code</th>
                      <th className="px-4 py-3">Check-in</th>
                      <th className="px-4 py-3">Checked in by</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2E8E1]">
                    {visibleRegistrations.map((registration) => (
                      <tr key={registration.registrationId}>
                        <td className="px-4 py-3 font-medium text-[#2B1723]">{registration.fullName}</td>
                        <td className="px-4 py-3 text-[#5D4A52]">
                          {registration.email && <div>{registration.email}</div>}
                          {registration.phone && <div>{registration.phone}</div>}
                        </td>
                        <td className="px-4 py-3 text-[#5D4A52]">{registration.groupName || '—'}</td>
                        <td className="px-4 py-3 text-[#5D4A52]">{registration.personsAttending || 1}</td>
                        <td className="px-4 py-3"><StatusBadge tone={paymentTone(registration.paymentStatus)}>{formatPaymentLabel(registration.paymentStatus)}</StatusBadge></td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-[#2B1723]">{registration.ticketCode || formatTicketStatus(registration)}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <StatusBadge tone={registration.checkedIn ? 'green' : 'neutral'}>{formatDoorStatus(registration)}</StatusBadge>
                            <p className="text-[11px] text-[#8C7567]">{formatCheckInTime(registration.checkInTime)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#5D4A52]">{registration.checkedInBy || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {confirmUndo && selectedRegistration?.checkedIn && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#2B1723]/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#EEDFD6] bg-white p-6 shadow-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#A32626]">Undo Check-In</p>
            <h3 className="mt-2 font-serif text-2xl text-[#2B1723]">{selectedRegistration.fullName}</h3>
            <p className="mt-3 text-sm leading-6 text-[#6B564C]">
              Undo check-in for this guest? This should only be used if the check-in was accidental.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmUndo(false)}
                disabled={saving}
                className="rounded-xl border border-[#E7D6CC] bg-white px-5 py-3 text-sm font-bold text-[#6B564C] hover:bg-[#FBF8F5] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUndoCheckIn}
                disabled={saving}
                className="rounded-xl bg-[#A32626] px-5 py-3 text-sm font-bold text-white hover:bg-[#8F1F1F] disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Undo Check-In'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
