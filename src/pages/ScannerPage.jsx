import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, CircleAlert, LogOut, RotateCcw, Search, ShieldCheck, Ticket, UserRound, WifiOff } from 'lucide-react'
import { BrandMark } from '../components/BrandMark'
import { QrScannerPanel } from '../components/checkin/QrScannerPanel'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { subscribeToRegistrations } from '../services/registrationService'
import { completeCheckIn, recordDuplicateCheckInAttempt, undoCheckIn } from '../services/ticketService'
import { isApprovedAdmin } from '../utils/accessRoles'
import { checkInWarnings, searchableRegistrationText } from '../utils/ticketUtils'
import { formatCheckInTime } from '../utils/checkInUtils'
import { normalizePaymentStatus } from '../utils/paymentStatus'

function safeText(value, fallback = 'Not provided') {
  return value || fallback
}

function statusLabel(value) {
  return String(value || 'unknown').replace(/-/g, ' ')
}

function ScannerField({ label, value }) {
  return (
    <div className="rounded-xl border border-[#EFE2DA] bg-[#FFFDFC] px-4 py-3">
      <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#80685B]">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-[#2B1723]">{value}</dd>
    </div>
  )
}

export function ScannerPage() {
  const { user, signOut, access } = useAuth()
  const { activeEvent } = useActiveEvent()
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRegistration, setSelectedRegistration] = useState(null)
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [resumeScanTrigger, setResumeScanTrigger] = useState(0)
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const [lastResult, setLastResult] = useState(null)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setRegistrations([])
    setSelectedRegistration(null)
    setNotice('')
    setError('')

    if (!activeEvent?.eventId) {
      setLoading(false)
      return undefined
    }

    setLoading(true)
    return subscribeToRegistrations(
      activeEvent.eventId,
      (nextRegistrations) => {
        setRegistrations(nextRegistrations)
        setLoading(false)
      },
      (snapshotError) => {
        setError(snapshotError?.message || 'Registrations could not be loaded for this assigned event.')
        setLoading(false)
      },
    )
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeEvent?.eventId])

  useEffect(() => {
    function updateOnlineStatus() {
      setOnline(typeof navigator === 'undefined' ? true : navigator.onLine)
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  const filteredRegistrations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return []
    return registrations
      .filter((registration) => searchableRegistrationText(registration).includes(term))
      .slice(0, 8)
  }, [registrations, searchTerm])

  const warnings = selectedRegistration ? checkInWarnings(selectedRegistration) : []
  const paymentStatus = normalizePaymentStatus(selectedRegistration?.paymentStatus)
  const checkedIn = Boolean(selectedRegistration?.checkedIn)
  const canAdminUndoCheckIn = isApprovedAdmin(access)

  function selectRegistration(registration) {
    setSelectedRegistration(registration)
    setLastResult(null)
    setNotice(`${registration.fullName || 'Guest'} selected. Review before check-in.`)
  }

  async function handleCheckIn() {
    if (!selectedRegistration || saving) return
    if (selectedRegistration.checkedIn) {
      setLastResult({
        type: 'duplicate',
        title: 'Already checked in',
        fullName: safeText(selectedRegistration.fullName, 'Guest'),
        ticketCode: safeText(selectedRegistration.ticketCode, 'No ticket code'),
        detail: 'Duplicate check-in remains blocked. No new check-in write happened.',
      })
      setNotice('Duplicate check-in is blocked. This guest is already checked in.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await completeCheckIn(selectedRegistration, user)
      setLastResult({
        type: 'success',
        title: 'Check-in complete',
        fullName: safeText(selectedRegistration.fullName, 'Guest'),
        ticketCode: safeText(selectedRegistration.ticketCode, 'No ticket code'),
        detail: 'Guest status is now checked in. Scan or search for the next guest.',
      })
      setNotice(`${selectedRegistration.fullName || 'Guest'} checked in. Ready for next guest.`)
      setSelectedRegistration(null)
      setSearchTerm('')
      setResumeScanTrigger((value) => value + 1)
    } catch (checkInError) {
      setError(checkInError?.message || 'Check-in could not be completed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDuplicateAttempt() {
    if (!selectedRegistration || saving) return

    setSaving(true)
    setError('')
    try {
      await recordDuplicateCheckInAttempt(selectedRegistration, user)
      setLastResult({
        type: 'duplicate',
        title: 'Duplicate attempt recorded',
        fullName: safeText(selectedRegistration.fullName, 'Guest'),
        ticketCode: safeText(selectedRegistration.ticketCode, 'No ticket code'),
        detail: 'The guest was already checked in. A duplicate-attempt audit entry may be appended, but check-in remains blocked.',
      })
      setNotice('Duplicate attempt recorded. Check-in remains blocked.')
    } catch (duplicateError) {
      setError(duplicateError?.message || 'Duplicate attempt could not be recorded.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAdminUndoCheckIn() {
    if (!canAdminUndoCheckIn) {
      setError('Undo Check-In is admin-only.')
      return
    }
    if (!selectedRegistration?.checkedIn || saving) return
    if (!window.confirm(`Undo check-in for ${selectedRegistration.fullName || 'this guest'}? This is an admin correction only.`)) return

    setSaving(true)
    setError('')
    try {
      await undoCheckIn(selectedRegistration, user)
      setLastResult({
        type: 'admin',
        title: 'Admin correction saved',
        fullName: safeText(selectedRegistration.fullName, 'Guest'),
        ticketCode: safeText(selectedRegistration.ticketCode, 'No ticket code'),
        detail: 'Check-in was undone through the existing admin-only correction path.',
      })
      setNotice(`Check-in undone for ${selectedRegistration.fullName || 'Guest'}.`)
      setResumeScanTrigger((value) => value + 1)
    } catch (undoError) {
      setError(undoError?.message || 'Undo Check-In could not be completed.')
    } finally {
      setSaving(false)
    }
  }

  async function copyScannerLink() {
    const scannerUrl = `${window.location.origin}/scanner`
    try {
      await navigator.clipboard.writeText(scannerUrl)
      setNotice('Scanner Mode link copied.')
    } catch {
      setNotice(scannerUrl)
    }
  }

  function clearScannerSelection() {
    setSelectedRegistration(null)
    setSearchTerm('')
    setNotice('Ready for the next guest.')
    setError('')
    setResumeScanTrigger((value) => value + 1)
  }

  function warningTone(warning) {
    if (/outstanding|door payment|not marked paid/i.test(warning)) return 'gold'
    if (/No ticket code/i.test(warning)) return 'blush'
    return 'neutral'
  }

  return (
    <main className="min-h-[100dvh] bg-[#FBF8F5] px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-5xl flex-col gap-5">
        <header className="flex flex-col gap-4 rounded-2xl border border-[#E9DDD6] bg-white px-4 py-4 shadow-[0_8px_28px_rgba(43,23,35,0.05)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <BrandMark />
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#6B564C]">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E5F3EC] px-3 py-1 text-[#1E7345]">
                <ShieldCheck className="size-3.5" />
                Scanner mode
              </span>
              <span>{safeText(activeEvent?.eventName, 'Assigned event')}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {canAdminUndoCheckIn && (
              <button
                type="button"
                onClick={copyScannerLink}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-4 text-sm font-bold text-[#6B564C] hover:bg-[#FFF8F2]"
              >
                Copy Scanner Link
              </button>
            )}
            <button
              type="button"
              onClick={signOut}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-4 text-sm font-bold text-[#6B564C] hover:bg-[#FFF8F2]"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <div className="space-y-4">
            {!online && (
              <div className="rounded-2xl border border-[#F2C3C3] bg-[#FFF4F4] px-4 py-3 text-sm font-semibold text-[#A32626]">
                <div className="flex items-start gap-2">
                  <WifiOff className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p>Connection looks offline.</p>
                    <p className="mt-1 text-xs font-medium text-[#8E4A4A]">No offline writes are supported on `/scanner`. Reconnect before trying to check guests in.</p>
                  </div>
                </div>
              </div>
            )}

            <QrScannerPanel
              registrations={registrations}
              onMatch={(registration) => selectRegistration(registration)}
              onMissing={(ticketCode) => setNotice(`No ticket found for ${ticketCode} in this assigned event.`)}
              onInvalid={(message) => setNotice(message)}
              resumeTrigger={resumeScanTrigger}
            />

            <div className="rounded-2xl border border-[#EEDFD6] bg-white p-4">
              <label htmlFor="scanner-guest-search" className="event-label">Find guest by name or ticket</label>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#B8A49A]" />
                <input
                  id="scanner-guest-search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Type a guest name or ticket code"
                  className="min-h-12 w-full rounded-xl border border-[#E5D7CF] bg-white py-3 pl-9 pr-3 text-base font-semibold text-[#2B1723] focus:border-[#9A5260] focus:outline-none focus:ring-2 focus:ring-[#9A5260]/20"
                />
              </div>
              {filteredRegistrations.length > 0 && (
                <div className="mt-3 divide-y divide-[#EFE2DA] rounded-xl border border-[#EFE2DA]">
                  {filteredRegistrations.map((registration) => (
                    <button
                      type="button"
                      key={registration.registrationId}
                      onClick={() => selectRegistration(registration)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#FFF8F2]"
                    >
                      <span>
                        <span className="block text-sm font-bold text-[#2B1723]">{safeText(registration.fullName, 'Unnamed guest')}</span>
                        <span className="mt-1 block text-xs text-[#806C61]">{safeText(registration.ticketCode, 'No ticket code')}</span>
                      </span>
                      <span className={registration.checkedIn ? 'text-xs font-bold text-[#1E7345]' : 'text-xs font-bold text-[#9A5260]'}>
                        {registration.checkedIn ? 'Checked in' : 'Ready'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#EEDFD6] bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#80685B]">Event-day guidance</p>
              <div className="mt-3 grid gap-2">
                <p className="rounded-xl bg-[#FBF8F5] px-4 py-3 text-sm font-semibold text-[#2B1723]">Scan or search, review the guest card, then tap <span className="font-bold">Check In</span>.</p>
                <p className="rounded-xl bg-[#FFF8EA] px-4 py-3 text-sm font-semibold text-[#715D46]">Scanner/check-in-only access cannot undo or check out a guest.</p>
                <p className="rounded-xl bg-[#FFF8EA] px-4 py-3 text-sm font-semibold text-[#715D46]">If a correction is needed, an approved admin handles the existing admin-only undo path.</p>
                <p className="rounded-xl bg-[#FFF8EA] px-4 py-3 text-sm font-semibold text-[#715D46]">No offline writes are supported. Keep a live connection before checking guests in.</p>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            {(notice || error) && (
              <div className={error ? 'rounded-2xl border border-[#F2C3C3] bg-[#FFF1F1] px-4 py-3 text-sm font-semibold text-[#A32626]' : 'rounded-2xl border border-[#CFE8D8] bg-[#E5F3EC] px-4 py-3 text-sm font-semibold text-[#1E7345]'}>
                {error || notice}
              </div>
            )}

            {lastResult && (
              <div className={`rounded-2xl border px-4 py-4 ${
                lastResult.type === 'success'
                  ? 'border-[#CFE8D8] bg-[#E5F3EC]'
                  : lastResult.type === 'duplicate'
                    ? 'border-[#F3DFC0] bg-[#FFF8EA]'
                    : 'border-[#E7D6CC] bg-[#FBF8F5]'
              }`}>
                <div className="flex items-start gap-3">
                  {lastResult.type === 'success' ? <Check className="mt-1 size-5 text-[#1E7345]" /> : lastResult.type === 'duplicate' ? <AlertTriangle className="mt-1 size-5 text-[#7A5818]" /> : <CircleAlert className="mt-1 size-5 text-[#6B564C]" />}
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#80685B]">{lastResult.title}</p>
                    <h2 className="mt-1 break-words font-serif text-2xl text-[#2B1723]">{lastResult.fullName}</h2>
                    <p className="mt-1 text-sm font-semibold text-[#6B564C]">{lastResult.ticketCode}</p>
                    <p className="mt-2 text-sm font-semibold text-[#2B1723]">{lastResult.detail}</p>
                    <button
                      type="button"
                      onClick={clearScannerSelection}
                      className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2B1723] px-4 text-sm font-bold text-white hover:bg-[#3B2430]"
                    >
                      Scan next guest
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-[#EEDFD6] bg-white p-4 shadow-[0_4px_16px_rgba(43,23,35,0.03)]">
              <div className="flex items-center gap-2 text-[#9A5260]">
                <Ticket className="size-5" />
                <h1 className="font-serif text-2xl text-[#2B1723]">Guest ticket</h1>
              </div>

              {!selectedRegistration ? (
                <div className="mt-5 rounded-xl border border-dashed border-[#E5D7CF] bg-[#FFF8F2] px-4 py-8 text-center">
                  <UserRound className="mx-auto size-8 text-[#9A5260]" />
                  <p className="mt-3 text-sm font-semibold text-[#2B1723]">
                    {loading ? 'Loading assigned event guests...' : 'Scan a QR code or find a ticket.'}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#806C61]">
                    Check-in requires one explicit button tap after lookup.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#80685B]">Guest</p>
                    <h2 className="mt-1 font-serif text-3xl leading-tight text-[#2B1723]">{safeText(selectedRegistration.fullName, 'Unnamed guest')}</h2>
                    <p className="mt-1 text-sm text-[#806C61]">{safeText(selectedRegistration.eventName || activeEvent?.eventName, 'Assigned event')}</p>
                  </div>

                  <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <ScannerField label="Ticket" value={safeText(selectedRegistration.ticketCode, 'No ticket code')} />
                    <ScannerField label="Group" value={safeText(selectedRegistration.groupName, 'No group')} />
                    <ScannerField label="Guests" value={Number(selectedRegistration.personsAttending) || 1} />
                    <ScannerField label="Payment" value={statusLabel(paymentStatus)} />
                    <ScannerField label="Ticket status" value={statusLabel(selectedRegistration.ticketStatus || (selectedRegistration.ticketCode ? 'assigned' : 'no-ticket-assigned'))} />
                    <ScannerField label="Check-in" value={checkedIn ? `Checked in ${formatCheckInTime(selectedRegistration.checkInTime)}` : 'Not checked in'} />
                  </dl>

                  {warnings.length > 0 && (
                    <div className="space-y-2">
                      {warnings.map((warning) => (
                        <p key={warning} className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                          warningTone(warning) === 'blush'
                            ? 'bg-[#FFF1F1] text-[#A32626]'
                            : warningTone(warning) === 'gold'
                              ? 'bg-[#FFF8EA] text-[#715D46]'
                              : 'bg-[#FBF8F5] text-[#6B564C]'
                        }`}>
                          {warning}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-2">
                    <button
                      type="button"
                      onClick={handleCheckIn}
                      disabled={saving || checkedIn}
                      className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#1E7345] px-4 text-base font-bold text-white hover:bg-[#17623A] disabled:cursor-not-allowed disabled:bg-[#AFC8BA]"
                    >
                      <Check className="size-5" />
                      Check In
                    </button>
                    <button
                      type="button"
                      onClick={clearScannerSelection}
                      disabled={saving}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-4 text-sm font-bold text-[#6B564C] hover:bg-[#FFF8F2] disabled:opacity-50"
                    >
                      Next guest
                    </button>
                    {checkedIn && (
                      <>
                        {canAdminUndoCheckIn && (
                          <button
                            type="button"
                            onClick={handleAdminUndoCheckIn}
                            disabled={saving}
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#F2C3C3] bg-[#FFF8F8] px-4 text-sm font-bold text-[#A32626] hover:bg-[#FFF1F1] disabled:opacity-50"
                          >
                            <RotateCcw className="size-4" />
                            Admin Undo Check-In
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleDuplicateAttempt}
                          disabled={saving}
                          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-4 text-sm font-bold text-[#6B564C] hover:bg-[#FFF8F2] disabled:opacity-50"
                        >
                          <RotateCcw className="size-4" />
                          Record duplicate attempt
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}
