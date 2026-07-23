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
import { isApprovedAdmin } from '../utils/accessRoles'
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
import { normalizePaymentStatus } from '../utils/paymentStatus'
import { calculateRegistrationFinance, formatCurrency, formatPaymentMethod } from '../utils/financeUtils'
import { buildRegistrationMetrics, formatRegistrationGuestSummary } from '../utils/registrationMetrics'
import { InfoHint } from '../components/ui/InfoHint'
import { getEventFinancialEvidenceAudit } from '../utils/financialEvidenceAudit'

const CHECK_IN_FILTER_GROUPS = [
  { label: 'Guest Lookup', values: ['search'] },
  { label: 'Check-In Status', values: ['all', 'not-checked-in', 'checked-in'] },
  { label: 'Payment Status', values: ['door', 'door-list', 'outstanding', 'complimentary'] },
  { label: 'Review', values: ['missing-ticket', 'group', 'review-needed'] },
]

function StatusBadge({ children, tone = 'neutral' }) {
  const tones = {
    green: 'bg-[#E5F3EC] text-[#1E7345]',
    gold: 'bg-[#FFF4DF] text-[#7A5818]',
    blush: 'bg-[#FCEEF1] text-[#A32626]',
    plum: 'bg-[#F2E8FA] text-[#6B3FA0]',
    neutral: 'bg-[#F7F1ED] text-[#80685B]',
  }
  return <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${tones[tone]}`}>{children}</span>
}

function paymentTone(status) {
  const normalized = normalizePaymentStatus(status)
  if (normalized === 'paid') return 'green'
  if (normalized === 'pending' || normalized === 'unknown' || normalized === 'door' || normalized === 'door-list') return 'gold'
  if (normalized === 'complimentary') return 'plum'
  return 'neutral'
}

function attendeeNamesText(registration = {}) {
  return Array.isArray(registration.attendeeNames) && registration.attendeeNames.length > 0
    ? registration.attendeeNames.join(', ')
    : ''
}

function registrationDisplayName(registration = {}) {
  return attendeeNamesText(registration) || registration.fullName || registration.buyerName || 'Guest'
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
        setError('Could not load the event-day guest list.')
        setLoading(false)
      },
    )
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeEvent?.eventId])

  return { registrations, loading, error }
}

export function CheckInPage() {
  const { user, access } = useAuth()
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
  const [resumeScanTrigger, setResumeScanTrigger] = useState(0)
  const [selectedListIds, setSelectedListIds] = useState(new Set())
  const summary = useMemo(() => buildEventDaySummary(registrations), [registrations])
  const visibleRegistrations = useMemo(
    () => filterCheckInRegistrations(registrations, activeView, activeEvent),
    [activeEvent, activeView, registrations],
  )
  const visibleMetrics = useMemo(() => buildRegistrationMetrics(visibleRegistrations, activeEvent), [activeEvent, visibleRegistrations])
  const selectedListRows = visibleRegistrations.filter((registration) => selectedListIds.has(registration.registrationId))
  const allVisibleListRowsSelected = visibleRegistrations.length > 0 && visibleRegistrations.every((registration) => selectedListIds.has(registration.registrationId))
  const helperRows = useMemo(() => {
    if (helperView === 'missing-ticket') return getMissingTicketRegistrations(registrations)
    if (helperView === 'pending-payment') return getPendingPaymentRegistrations(registrations)
    return getDoorListRegistrations(registrations)
  }, [helperView, registrations])
  const evidenceAudit = useMemo(() => getEventFinancialEvidenceAudit(activeEvent?.eventId), [activeEvent?.eventId])

  const matches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return []
    return registrations
      .filter((registration) => searchableRegistrationText(registration).includes(query))
      .slice(0, 20)
  }, [registrations, searchQuery])

  const selectedRegistration = registrations.find((registration) => registration.registrationId === selectedId) || matches[0]
  const selectedWarnings = selectedRegistration ? checkInWarnings(selectedRegistration) : []
  const selectedFinance = selectedRegistration ? calculateRegistrationFinance(selectedRegistration, activeEvent) : null
  const checkInState = selectedRegistration ? canCompleteCheckIn(selectedRegistration) : { allowed: false, reason: '' }
  const canUndoCheckIn = isApprovedAdmin(access)

  if (!activeEvent?.eventId) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="No selected event"
        description="Select a Working Event before opening the door check-in screen."
        action={<Link to="/events" className="mt-6 inline-block rounded-xl bg-[#9A5260] px-6 py-2.5 text-sm font-bold text-white">Choose an event</Link>}
      />
    )
  }

  if (loading) return <LoadingState message="Loading event-day guest list…" />

  async function handleCheckIn() {
    if (!selectedRegistration || !checkInState.allowed) return
    setSaving(true)
    setMessage('')
    setActionError('')
    try {
      await completeCheckIn(selectedRegistration, user)
      setMessage(`${registrationDisplayName(selectedRegistration)} checked in successfully.`)
      setSearchQuery('')
      setSelectedId('')
      setConfirmUndo(false)
      setResumeScanTrigger(t => t + 1)
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
      const permissionDenied = err?.code === 'permission-denied' || /permission|insufficient/i.test(err?.message || '')
      setActionError(permissionDenied
        ? 'Check-in was not saved because your account could not confirm the update. No local success state was applied.'
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
    if (!canUndoCheckIn) {
      setActionError('Undo check-in is admin-only.')
      return
    }
    if (!selectedRegistration?.checkedIn) return
    setSaving(true)
    setMessage('')
    setActionError('')
    try {
      await undoCheckIn(selectedRegistration, user)
      setMessage(`Check-in undone for ${registrationDisplayName(selectedRegistration)}.`)
      setConfirmUndo(false)
      setSearchQuery('')
      setSelectedId('')
      setActiveView('not-checked-in')
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
      const permissionDenied = err?.code === 'permission-denied' || /permission|insufficient/i.test(err?.message || '')
      setActionError(permissionDenied
        ? 'Undo check-in was not saved because your account could not confirm the update. The guest remains checked in.'
        : err.message || 'Undo check-in failed. The guest remains checked in.')
    } finally {
      setSaving(false)
    }
  }

  function toggleListSelection(registrationId) {
    setSelectedListIds((current) => {
      const next = new Set(current)
      if (next.has(registrationId)) next.delete(registrationId)
      else next.add(registrationId)
      return next
    })
  }

  function clearListSelection() {
    setSelectedListIds(new Set())
  }

  function toggleAllVisibleListRows() {
    setSelectedListIds(allVisibleListRowsSelected ? new Set() : new Set(visibleRegistrations.map((registration) => registration.registrationId)))
  }

  async function handleBulkCheckIn() {
    const candidates = selectedListRows.filter((registration) => canCompleteCheckIn(registration).allowed)
    if (candidates.length === 0) return
    if (!window.confirm(`Check in ${candidates.length} selected guest registration${candidates.length === 1 ? '' : 's'} for ${activeEvent.eventName}?`)) return

    setSaving(true)
    setMessage('')
    setActionError('')
    try {
      for (const registration of candidates) {
        await completeCheckIn(registration, user)
      }
      setMessage(`Checked in ${candidates.length} selected registration${candidates.length === 1 ? '' : 's'}.`)
      clearListSelection()
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
      setActionError(err.message || 'Bulk check-in stopped after a failed write.')
    } finally {
      setSaving(false)
    }
  }

  async function handleBulkUndoCheckIn() {
    if (!canUndoCheckIn) {
      setActionError('Undo check-in selected is admin-only.')
      return
    }
    const candidates = selectedListRows.filter((registration) => registration.checkedIn)
    if (candidates.length === 0) return
    if (!window.confirm(`Undo check-in for ${candidates.length} selected guest registration${candidates.length === 1 ? '' : 's'}?`)) return

    setSaving(true)
    setMessage('')
    setActionError('')
    try {
      for (const registration of candidates) {
        await undoCheckIn(registration, user)
      }
      setMessage(`Undid check-in for ${candidates.length} selected registration${candidates.length === 1 ? '' : 's'}.`)
      clearListSelection()
    } catch (err) {
      if (import.meta.env.DEV) console.error(err)
      setActionError(err.message || 'Bulk undo stopped after a failed write.')
    } finally {
      setSaving(false)
    }
  }

  async function copySelectedList(kind = 'guest') {
    const rows = selectedListRows.length > 0 ? selectedListRows : visibleRegistrations
    const text = rows.map((registration) => {
      const finance = calculateRegistrationFinance(registration, activeEvent)
      if (kind === 'door') {
        return [
          registration.fullName,
          attendeeNamesText(registration),
          formatPaymentLabel(registration.paymentStatus),
          finance.balanceDue === null ? 'Balance needs review' : `Balance ${formatCurrency(finance.balanceDue)}`,
          registration.ticketCode || 'Missing ticket',
        ].filter(Boolean).join(' | ')
      }
      return [
        registration.fullName,
        attendeeNamesText(registration),
        registration.buyerName,
        registration.groupName,
        registration.ticketCode,
      ].filter(Boolean).join(' | ')
    }).join('\n')

    try {
      await navigator.clipboard.writeText(text)
      setMessage(`${kind === 'door' ? 'Payment review' : 'Guest'} list copied.`)
    } catch {
      setActionError('Copy failed. Select and copy the list manually.')
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
      ? `${registrationDisplayName(registration)} is already checked in. Duplicate check-in is blocked.`
      : `${registrationDisplayName(registration)} matched from ticket ${ticketCode}. Review before checking in.`)
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
      <header className="sticky top-0 z-40 -mx-4 -mt-6 mb-6 flex flex-col gap-3 border-b border-[#EEDFD6] bg-[#FBF8F5]/95 px-4 py-4 backdrop-blur-md lg:static lg:mx-0 lg:mt-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#1E7345]">Event-Day Mode</p>
          <h2 className="font-serif text-3xl text-[#2B1723]">Door Check-In / QR Scan</h2>
          <p className="mt-2 text-sm text-[#816D62]">
            Checking in guests for <strong>{activeEvent.eventName}</strong>. <span className="ml-2 inline-block rounded-full bg-[#E5F3EC] px-2 py-0.5 text-[10px] font-bold tracking-widest text-[#1E7345]">Checked In: {formatRegistrationGuestSummary(summary.checkedInRegistrations, summary.checkedInPersons)}</span>
          </p>
        </div>
        <div className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-3 text-xs text-[#6B564C]">
          QR scan, manual ticket lookup, and name search all use this Working Event only.
        </div>
        <Link
          to="/scanner"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#1E7345] px-4 text-xs font-bold text-white hover:bg-[#17623A]"
        >
          Open Scanner Mode
        </Link>
      </header>

      {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}
      {message && <div className="rounded-xl border border-[#CFE8D8] bg-[#E5F3EC] px-4 py-3 text-sm text-[#1E7345]">{message}</div>}
      {actionError && <div className="rounded-xl border border-[#F2C3C3] bg-[#FFF1F1] px-4 py-3 text-sm text-[#A32626]">{actionError}</div>}

      <section className="phase23v-metric-grid">
        {[
          ['Total Registrations', summary.totalRegistrations],
          ['Total Guests', summary.totalPersons],
          ['Checked-In Registrations', summary.checkedInRegistrations],
          ['Checked-In Guests', summary.checkedInPersons],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-[#EEDFD6] bg-white p-4 shadow-[0_4px_16px_rgba(43,23,35,0.03)]">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#80685B]">{label}</p>
            <p className="mt-2 text-2xl font-bold text-[#2B1723]">{value}</p>
          </article>
        ))}
      </section>

      <details className="phase23v-panel">
        <summary className="phase23v-summary">More attendance and readiness counts</summary>
        <div className="phase23v-body phase23v-metric-grid">
        {[
          ['Remaining Registrations', summary.remainingRegistrations],
          ['Remaining Guests', summary.remainingPersons],
          ['Paid / pending / comp', `${summary.paidRegistrations}/${summary.pendingRegistrations}/${summary.complimentaryRegistrations}`],
          ['Tickets assigned / missing', `${summary.ticketAssignedRegistrations}/${summary.missingTicketRegistrations}`],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-[#EEDFD6] bg-white p-4 shadow-[0_4px_16px_rgba(43,23,35,0.03)]">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#80685B]">{label}</p>
            <p className="mt-2 text-2xl font-bold text-[#2B1723]">{value}</p>
          </article>
        ))}
        </div>
      </details>

      {evidenceAudit && (
        <details className="phase23v-panel border-[#D8C5A8] bg-[#FFFCF6]" aria-labelledby="checkin-evidence-heading">
          <summary className="phase23v-summary text-[#4E3928]">Attendance evidence context</summary>
          <div className="phase23v-body">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 size-5 shrink-0 text-[#7A5818]" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#7A5818]">Attendance Evidence Reconciliation</p>
              <h2 id="checkin-evidence-heading" className="mt-2 font-serif text-2xl text-[#2B1723]">Historical attendance is not system check-in</h2>
              <p className="mt-2 text-xs leading-5 text-[#715D46]">
                The audit reports approximately {evidenceAudit.attendance.approximateAttendance} patrons checked in, while the app currently records {summary.checkedInPersons} checked-in guests. Do not create check-ins from the approximate count.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['System checked-in guests', summary.checkedInPersons],
              ['Approximate attendance', evidenceAudit.attendance.approximateAttendance],
              ['Gmail-supported ticket spaces', evidenceAudit.attendance.gmailSupportedTicketSpaces],
              ['Attendance-to-Gmail gap', evidenceAudit.attendance.attendanceToGmailGap],
            ].map(([label, value]) => (
              <article key={label} className="rounded-xl border border-[#EEDFD6] bg-white p-4" aria-label={`${label}: ${value}`}>
                <p className="text-lg font-bold text-[#2B1723]">{value}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#80685B]">{label}</p>
              </article>
            ))}
          </div>
          </div>
        </details>
      )}

      <section className="flex items-center gap-2 rounded-xl border border-[#EEDFD6] bg-white px-4 py-3 text-xs leading-5 text-[#816D62]">
        <p className="font-semibold text-[#6B564C]">Guest count may be higher than registration count.</p>
        <InfoHint label="Check-In Guest Count Info">
          Some registrations include multiple guests. QR scan selects a guest record only; check-in still requires a button click.
        </InfoHint>
      </section>

      <details className="phase23v-panel">
        <summary className="phase23v-summary">Event-day helper lists and exports</summary>
        <div className="phase23v-body">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1E7345]">Event-day helpers</p>
            <h3 className="mt-1 font-serif text-2xl text-[#2B1723]">Print and export event-day lists</h3>
            <p className="mt-1 text-xs leading-5 text-[#816D62]">
              Browser-only export. Nothing is uploaded and no new event record is created.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ['door', 'Guest list'],
              ['missing-ticket', 'Missing ticket codes'],
              ['pending-payment', 'Pending payments'],
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
          <div className="max-h-72 overflow-auto" role="region" aria-label="Check-in helper registrations" tabIndex={0}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F2E8E1] bg-[#FBF8F5] font-bold uppercase tracking-wider text-[#80685B]">
                  <th className="px-3 py-2">Guest</th>
                  <th className="px-3 py-2">Guests</th>
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
                      {attendeeNamesText(registration) && <div className="mt-0.5 text-[11px] text-[#5D4A52]">Guests: {attendeeNamesText(registration)}</div>}
                      {registration.buyerName && <div className="mt-0.5 text-[11px] text-[#80685B]">Buyer: {registration.buyerName}</div>}
                      {registration.groupName && <div className="mt-0.5 text-[11px] text-[#80685B]">{registration.groupName}</div>}
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
        </div>
      </details>

      <details className="phase23v-panel">
        <summary className="phase23v-summary">Advanced check-in filters</summary>
        <div className="phase23v-body">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1E7345]">Advanced Filters</p>
        <p className="mt-1 text-xs leading-5 text-[#816D62]">
          Switch between QR lookup and manual guest lists. Bulk check-in and undo still require confirmation and never delete records.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          {CHECK_IN_FILTER_GROUPS.map((group) => (
            <div key={group.label} className="rounded-xl border border-[#F2E8E1] bg-[#FBF8F5] p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#80685B]">{group.label}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.values.map((value) => {
                  const view = CHECK_IN_VIEWS.find((item) => item.value === value)
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setActiveView(value)
                        setMessage('')
                        setActionError('')
                        clearListSelection()
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${activeView === value ? 'bg-[#2B1723] text-white' : 'bg-white text-[#80685B] hover:bg-[#F2E8E1]'}`}
                    >
                      {view?.label || value}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        </div>
      </details>

      {activeView === 'search' ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <QrScannerPanel
            registrations={registrations}
            onMatch={handleQrMatch}
            onMissing={handleQrMissing}
            onInvalid={handleQrInvalid}
            resumeTrigger={resumeScanTrigger}
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
                placeholder="Guest, buyer, attendee, email, phone, or GSV ticket code"
                className="min-h-16 w-full rounded-2xl border border-[#E5D7CF] bg-white py-4 pl-12 pr-4 text-lg font-semibold text-[#2B1723] focus:border-[#9A5260] focus:outline-none focus:ring-4 focus:ring-[#9A5260]/15"
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
                className={`min-h-[72px] rounded-xl border p-4 text-left transition ${selectedRegistration?.registrationId === registration.registrationId ? 'border-[#9A5260] bg-[#FFF8F2] ring-2 ring-[#9A5260]/30 shadow-md' : 'border-[#EEDFD6] bg-white hover:bg-[#FBF8F5]'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[#2B1723]">{registration.fullName}</p>
                    {attendeeNamesText(registration) && <p className="mt-1 text-xs text-[#5D4A52]">Guests: {attendeeNamesText(registration)}</p>}
                    {registration.buyerName && <p className="mt-1 text-xs font-semibold text-[#80685B]">Buyer: {registration.buyerName}</p>}
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
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#80685B]">Guest</p>
                  <h3 className="mt-1 font-serif text-3xl text-[#2B1723]">{selectedRegistration.fullName}</h3>
                  {attendeeNamesText(selectedRegistration) && (
                    <p className="mt-2 text-sm font-semibold text-[#5D4A52]">Guests attending: {attendeeNamesText(selectedRegistration)}</p>
                  )}
                  {selectedRegistration.buyerName && (
                    <p className="mt-1 text-sm font-semibold text-[#80685B]">Buyer / Contact: {selectedRegistration.buyerName}</p>
                  )}
                  <p className="mt-2 text-sm text-[#816D62]">
                    {selectedRegistration.email || 'No email'} {selectedRegistration.phone ? `· ${selectedRegistration.phone}` : ''}
                  </p>
                </div>
                {selectedRegistration.checkedIn ? (
                  <CheckCircle2 className="size-12 shrink-0 text-[#1E7345]" />
                ) : (
                  <ClipboardCheck className="size-12 shrink-0 text-[#9A5260]" />
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-[#FBF8F5] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#80685B]">Door payment</p>
                  <div className="mt-2"><StatusBadge tone={paymentTone(selectedRegistration.paymentStatus)}>{formatPaymentLabel(selectedRegistration.paymentStatus)}</StatusBadge></div>
                  {selectedFinance && (
                    <div className="mt-2 text-xs leading-5 text-[#6B564C]">
                      <div>Method: {formatPaymentMethod(selectedFinance.paymentMethod)}</div>
                      <div>Due: {selectedFinance.amountDue === null ? 'Needs review' : formatCurrency(selectedFinance.amountDue)}</div>
                      <div className={selectedFinance.balanceDue > 0 ? 'font-bold text-[#A32626]' : 'text-[#1E7345]'}>Balance: {selectedFinance.balanceDue === null ? 'Needs review' : formatCurrency(selectedFinance.balanceDue)}</div>
                    </div>
                  )}
                </div>
                <div className="rounded-xl bg-[#FBF8F5] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#80685B]">Ticket</p>
                  <p className="mt-2 font-mono text-sm font-bold text-[#2B1723]">{selectedRegistration.ticketCode || formatTicketStatus(selectedRegistration)}</p>
                </div>
                <div className="rounded-xl bg-[#FBF8F5] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#80685B]">Door status</p>
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
                      <p className="mt-1">Duplicate check-in is blocked. Undo Check-In is admin-only and should only be used for an accidental check-in.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={saving || !checkInState.allowed}
                  className="flex min-h-16 flex-1 items-center justify-center gap-3 rounded-2xl bg-[#9A5260] px-6 text-base font-bold text-white shadow-lg shadow-[#9A5260]/20 transition hover:bg-[#A9606B] disabled:cursor-not-allowed disabled:bg-[#D9C8C0] disabled:shadow-none"
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
                  {canUndoCheckIn && (
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
                  )}
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
              <h3 className="mt-1 font-serif text-2xl text-[#2B1723]">Guest list mode</h3>
              <p className="mt-1 text-xs leading-5 text-[#816D62]">Browse manually by payment, ticket, group, review, or check-in state. Bulk actions require confirmation and never delete records.</p>
            </div>
            <p className="text-xs font-semibold text-[#80685B]">Showing {visibleMetrics.totalRegistrations} registration{visibleMetrics.totalRegistrations === 1 ? '' : 's'} covering {visibleMetrics.totalPersons} guest{visibleMetrics.totalPersons === 1 ? '' : 's'}.</p>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#F2E8E1] bg-[#FBF8F5] p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={toggleAllVisibleListRows} className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-2 text-xs font-bold text-[#6B564C]">
                {allVisibleListRowsSelected ? 'Clear visible selection' : 'Select visible registrations'}
              </button>
              {selectedListIds.size > 0 && (
                <button type="button" onClick={clearListSelection} className="rounded-xl px-4 py-2 text-xs font-bold text-[#80685B] hover:bg-[#F2E8E1]">
                  Clear selected
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={handleBulkCheckIn} disabled={saving || selectedListRows.length === 0} className="rounded-xl bg-[#1E7345] px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
                Check in selected
              </button>
              {canUndoCheckIn && (
                <button type="button" onClick={handleBulkUndoCheckIn} disabled={saving || selectedListRows.length === 0} className="rounded-xl border border-[#F2C3C3] bg-white px-4 py-2 text-xs font-bold text-[#A32626] disabled:opacity-40">
                  Undo check-in selected
                </button>
              )}
              <button type="button" onClick={() => copySelectedList('guest')} className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-2 text-xs font-bold text-[#6B564C]">
                Copy selected guest list
              </button>
              <button type="button" onClick={() => copySelectedList('door')} className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-2 text-xs font-bold text-[#6B564C]">
                Copy selected payment review list
              </button>
            </div>
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
                    <tr className="border-b border-[#F2E8E1] bg-[#FBF8F5] text-xs font-bold uppercase tracking-wider text-[#80685B]">
                      <th className="px-4 py-3">Select</th>
                      <th className="px-4 py-3">Guest</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Group</th>
                      <th className="px-4 py-3">Guests</th>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3">Ticket Code</th>
                      <th className="px-4 py-3">Check-in</th>
                      <th className="px-4 py-3">Checked in by</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2E8E1]">
                    {visibleRegistrations.map((registration) => (
                      <tr key={registration.registrationId}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedListIds.has(registration.registrationId)}
                            onChange={() => toggleListSelection(registration.registrationId)}
                            aria-label={`Select ${registration.fullName}`}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-[#2B1723]">
                          <div>{registration.fullName}</div>
                          {Number(registration.personsAttending) > 1 && <div className="mt-1 w-fit rounded-full bg-[#FFF8F2] px-2 py-0.5 text-[10px] font-bold text-[#9A5260]">Group of {registration.personsAttending}</div>}
                          {attendeeNamesText(registration) && <div className="mt-1 text-xs font-normal text-[#5D4A52]">Guests: {attendeeNamesText(registration)}</div>}
                          {registration.buyerName && <div className="mt-1 text-xs font-semibold text-[#80685B]">Buyer: {registration.buyerName}</div>}
                        </td>
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
                            <p className="text-[11px] text-[#80685B]">{formatCheckInTime(registration.checkInTime)}</p>
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

      {confirmUndo && selectedRegistration?.checkedIn && canUndoCheckIn && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#2B1723]/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#EEDFD6] bg-white p-6 shadow-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#A32626]">Undo Check-In</p>
            <h3 className="mt-2 font-serif text-2xl text-[#2B1723]">{registrationDisplayName(selectedRegistration)}</h3>
            <p className="mt-3 text-sm leading-6 text-[#6B564C]">
              Undo check-in for this guest? This should only be used if the check-in was accidental.
            </p>
            <p className="mt-2 text-sm font-semibold text-[#80685B]">
              Checked in at: {formatCheckInTime(selectedRegistration.checkInTime)}
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
