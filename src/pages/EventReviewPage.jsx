import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  ReceiptText,
} from 'lucide-react'
import { useActiveEvent } from '../events/useActiveEvent'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingState } from '../components/ui/LoadingState'
import { subscribeToRegistrations } from '../services/registrationService'
import { subscribeToOperationsLedger } from '../services/operationsLedgerService'
import { subscribeToEvents } from '../services/eventService'
import { buildEventReview, formatEventReviewMoney } from '../utils/eventReview'
import { formatEventDate } from '../utils/dateUtils'
import { getEventFinancialEvidenceAudit } from '../utils/financialEvidenceAudit'

function SummaryCard({ label, value, help }) {
  return (
    <article className="rounded-xl border border-[#EFE2DA] bg-[#FBF8F5] p-4" aria-label={`${label}: ${value}`}>
      <p className="text-lg font-bold text-[#2B1723]">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#8C7567]">{label}</p>
      {help && <p className="mt-2 text-[11px] leading-5 text-[#816D62]">{help}</p>}
    </article>
  )
}

function Section({ eyebrow, title, children }) {
  return (
    <section className="rounded-[24px] border border-[#EEDFD6] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-7">
      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#B76E79]">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-2xl text-[#2B1723]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function FollowUpItem({ item }) {
  return (
    <article className="rounded-2xl border border-[#EFE2DA] bg-[#FBF8F5] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#2B1723]">{item.label}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#8C7567]">{item.count}</p>
        </div>
        <Link to={item.to} className="shrink-0 text-xs font-bold text-[#B76E79] hover:underline">
          Open page
        </Link>
      </div>
      <p className="mt-2 text-xs leading-5 text-[#816D62]">{item.explanation}</p>
      {item.preview.length > 0 && (
        <div className="mt-3 rounded-xl border border-[#E7D6CC] bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8C7567]">Examples</p>
          <ul className="mt-2 space-y-1 text-xs text-[#5D4A52]">
            {item.preview.map((name, index) => <li key={`${item.key}-${name}-${index}`}>{name}</li>)}
          </ul>
          {item.remainingCount > 0 && (
            <p className="mt-2 text-[11px] text-[#816D62]">Plus {item.remainingCount} more.</p>
          )}
        </div>
      )}
    </article>
  )
}

export function EventReviewPage() {
  const { activeEvent } = useActiveEvent()
  const [registrations, setRegistrations] = useState([])
  const [operationsEntries, setOperationsEntries] = useState([])
  const [resolvedActiveEvent, setResolvedActiveEvent] = useState(activeEvent)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setRegistrations([])
    setOperationsEntries([])
    setResolvedActiveEvent(activeEvent)
    setError('')
    setLoading(Boolean(activeEvent?.eventId))
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeEvent])

  useEffect(() => {
    if (!activeEvent?.eventId) return undefined

    return subscribeToEvents(
      (events) => {
        const matchedEvent = events.find((event) => event?.eventId === activeEvent.eventId)
        if (matchedEvent) setResolvedActiveEvent(matchedEvent)
      },
      () => {},
    )
  }, [activeEvent?.eventId])

  useEffect(() => {
    if (!resolvedActiveEvent?.eventId) return undefined

    let registrationLoaded = false
    let operationsLoaded = false

    const finishLoad = () => {
      if (registrationLoaded && operationsLoaded) setLoading(false)
    }

    const unsubscribeRegistrations = subscribeToRegistrations(
      resolvedActiveEvent.eventId,
      (rows) => {
        registrationLoaded = true
        setRegistrations(rows)
        finishLoad()
      },
      (err) => {
        registrationLoaded = true
        if (import.meta.env.DEV) console.error(err)
        setError('Could not load registrations for Event Review.')
        finishLoad()
      },
    )

    const unsubscribeOperations = subscribeToOperationsLedger(
      resolvedActiveEvent.eventId,
      (rows) => {
        operationsLoaded = true
        setOperationsEntries(rows)
        finishLoad()
      },
      (err) => {
        operationsLoaded = true
        if (import.meta.env.DEV) console.error(err)
        setError('Could not load operations ledger data for Event Review.')
        finishLoad()
      },
    )

    return () => {
      unsubscribeRegistrations()
      unsubscribeOperations()
    }
  }, [resolvedActiveEvent?.eventId])

  const review = useMemo(
    () => buildEventReview(resolvedActiveEvent, registrations, operationsEntries),
    [resolvedActiveEvent, operationsEntries, registrations],
  )
  const evidenceAudit = useMemo(() => getEventFinancialEvidenceAudit(resolvedActiveEvent?.eventId), [resolvedActiveEvent?.eventId])

  if (!resolvedActiveEvent?.eventId) {
    return (
      <EmptyState
        icon={FileSearch}
        title="No selected event"
        description="Select a Working Event before reviewing follow-up, payment records, and event summary details."
        action={(
          <Link to="/events" className="mt-6 inline-block rounded-xl bg-[#B76E79] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#A9606B]">
            Choose an event
          </Link>
        )}
      />
    )
  }

  if (loading) return <LoadingState message="Loading Reports..." />
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />

  const currency = review?.paymentReview?.registrationRecords?.currency || 'BBD'

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] bg-[#2B1723] px-6 py-8 text-white shadow-[0_18px_50px_rgba(43,23,35,0.15)] sm:px-9 sm:py-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#F5E6C8]/15 bg-[#F5E6C8]/10 px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] text-[#F5E6C8]">
              <ClipboardList className="size-3.5" />
              Reports
            </p>
            <h1 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">
              Event Report & Review
            </h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/60">
              <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{formatEventDate(resolvedActiveEvent.eventDate)}</span>
              <span className="opacity-40">·</span>
              <span>Status: {resolvedActiveEvent.status || 'unknown'}</span>
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">
              This read-only report combines follow-up items, registration payment records, Operations Ledger figures, and a current or post-event summary for the selected Working Event only.
            </p>
          </div>
          <Link
            to="/payments"
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-[#B76E79] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#C57C88]"
          >
            Open Payments
          </Link>
        </div>
      </section>

      <Section eyebrow="Needs Follow-Up" title="What needs attention now">
        {review.followUp.items.length === 0 ? (
          <div className="rounded-2xl border border-[#D9EBD8] bg-[#EAF6EF] p-4 text-sm text-[#244B32]">
            No immediate follow-up items were detected for the selected Working Event from current registration and operations data.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {review.followUp.items.map((item) => <FollowUpItem key={item.key} item={item} />)}
          </div>
        )}
      </Section>

      <Section eyebrow="Financial Boundaries" title="Registration Payments and Operations Summary">
        <div className="rounded-2xl border border-[#E6D4B4] bg-[#FFF8EA] p-4 text-sm leading-6 text-[#715D46]">
          Registration payment records track guest charges, payments received, balances, methods, and follow-up. The Operations Ledger tracks manually recorded sponsor income, vendor or supplier payments, expenses, refunds, reimbursements, and adjustments. These are separate records and are not automatically reconciled.
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#B76E79]">Registration payment records</p>
              <h3 className="mt-1 text-sm font-bold text-[#2B1723]">Guest-facing payment data</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryCard label="Registration records" value={review.paymentReview.registrationRecords.registrationCount} />
              <SummaryCard label="Total guests" value={review.paymentReview.registrationRecords.guestCount} />
              <SummaryCard label="Expected Registration Income" value={formatEventReviewMoney(review.paymentReview.registrationRecords.expectedIncome, currency)} />
              <SummaryCard label="Payments Received" value={formatEventReviewMoney(review.paymentReview.registrationRecords.collectedAmount, currency)} />
              <SummaryCard label="Outstanding Balance" value={formatEventReviewMoney(review.paymentReview.registrationRecords.outstandingAmount, currency)} />
              <SummaryCard label="Pending count" value={review.paymentReview.registrationRecords.pendingCount} />
              <SummaryCard label="Partial payment count" value={review.paymentReview.registrationRecords.partialPaymentCount} />
              <SummaryCard label="Paid count" value={review.paymentReview.registrationRecords.paidCount} />
              <SummaryCard label="Complimentary registrations" value={review.paymentReview.registrationRecords.complimentaryRegistrations} />
              <SummaryCard label="Complimentary guests" value={review.paymentReview.registrationRecords.complimentaryGuests} />
              <SummaryCard label="Door paid count" value={review.paymentReview.registrationRecords.doorPaidCount} />
              <SummaryCard label="To Pay at Door count" value={review.paymentReview.registrationRecords.doorListCount} />
              <SummaryCard label="Unknown payment-state count" value={review.paymentReview.registrationRecords.unknownCount} />
              <SummaryCard label="Pricing review count" value={review.paymentReview.registrationRecords.pricingReviewCount} />
              <SummaryCard label="Finance warnings" value={review.paymentReview.registrationRecords.financeWarningCount} />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#B76E79]">Operations Ledger</p>
              <h3 className="mt-1 text-sm font-bold text-[#2B1723]">Manually recorded event money</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryCard label="Income received" value={formatEventReviewMoney(review.paymentReview.operationsLedger.incomeReceived, currency)} />
              <SummaryCard label="Income pending" value={formatEventReviewMoney(review.paymentReview.operationsLedger.incomePending, currency)} />
              <SummaryCard label="Expenses paid" value={formatEventReviewMoney(review.paymentReview.operationsLedger.expensesPaid, currency)} />
              <SummaryCard label="Expenses pending" value={formatEventReviewMoney(review.paymentReview.operationsLedger.expensesPending, currency)} />
              <SummaryCard label="Refunds paid" value={formatEventReviewMoney(review.paymentReview.operationsLedger.refundsPaid, currency)} />
              <SummaryCard label="Refunds pending" value={formatEventReviewMoney(review.paymentReview.operationsLedger.refundsPending, currency)} />
              <SummaryCard label="Adjustments" value={formatEventReviewMoney(review.paymentReview.operationsLedger.adjustments, currency)} />
              <SummaryCard label="Cancelled items" value={review.paymentReview.operationsLedger.cancelledItems} />
              <SummaryCard label="Open ledger items" value={review.paymentReview.operationsLedger.openItemCount} />
              <SummaryCard label="Current operations net" value={formatEventReviewMoney(review.paymentReview.operationsLedger.netPosition, currency)} />
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[#EEDFD6] bg-[#FBF8F5] p-4">
          <div className="flex items-start gap-3">
            <ReceiptText className="mt-0.5 size-5 shrink-0 text-[#B76E79]" />
            <div>
              <p className="text-sm font-bold text-[#2B1723]">{review.paymentReview.comparison.label}</p>
              <p className="mt-2 text-xs leading-5 text-[#816D62]">
                Registration payments received: <strong>{formatEventReviewMoney(review.paymentReview.comparison.registrationCollected, currency)}</strong>
                {' '}· Ledger received income: <strong>{formatEventReviewMoney(review.paymentReview.comparison.ledgerReceivedIncome, currency)}</strong>
                {' '}· Difference: <strong>{formatEventReviewMoney(review.paymentReview.comparison.difference, currency)}</strong>
              </p>
              <p className="mt-2 text-xs leading-5 text-[#816D62]">{review.paymentReview.comparison.note}</p>
            </div>
          </div>
        </div>
      </Section>

      {evidenceAudit && (
        <Section eyebrow="Documentary Financial Audit" title={evidenceAudit.auditStatus}>
          <div className="rounded-2xl border border-[#E6D4B4] bg-[#FFF8EA] p-4 text-sm leading-6 text-[#715D46]">
            Final profit cannot be confirmed until bank, 1stPay, baker and supplier evidence is complete.
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Audit date" value={evidenceAudit.auditDate} />
            <SummaryCard label="App registrations" value={review.paymentReview.registrationRecords.registrationCount} />
            <SummaryCard label="App guests" value={review.paymentReview.registrationRecords.guestCount} />
            <SummaryCard label="App Payments Received" value={formatEventReviewMoney(evidenceAudit.ticketIncome.appPaymentsReceived, currency)} />
            <SummaryCard label="Verified ticket income" value={formatEventReviewMoney(evidenceAudit.ticketIncome.directlyVerifiedAmount, currency)} help="Directly Verified Gmail-supported receipts." />
            <SummaryCard label="Inferred ticket value" value={formatEventReviewMoney(evidenceAudit.ticketIncome.inferredAmount, currency)} help="Amount Inferred. Not verified until matched to CIBC or 1stPay." />
            <SummaryCard label="Maximum Gmail-supported value" value={formatEventReviewMoney(evidenceAudit.ticketIncome.maximumGmailSupportedValue, currency)} />
            <SummaryCard label="Documentary-to-app variance" value={formatEventReviewMoney(evidenceAudit.ticketIncome.documentaryToAppVariance, currency)} />
            <SummaryCard label="Gmail-supported ticket spaces" value={evidenceAudit.ticketIncome.gmailSupportedTickets} />
            <SummaryCard label="Approximate attendance" value={evidenceAudit.attendance.approximateAttendance} help={evidenceAudit.attendance.systemCheckInNote} />
            <SummaryCard label="Attendance evidence gap" value={evidenceAudit.attendance.attendanceToGmailGap} />
            <SummaryCard label="Final profit status" value={evidenceAudit.finalProfitStatus} />
            <SummaryCard label="Cash sponsorship verified" value={formatEventReviewMoney(evidenceAudit.operations.cashSponsorshipVerified, currency)} />
            <SummaryCard label="Venue paid" value={formatEventReviewMoney(evidenceAudit.operations.venuePaid, currency)} help={evidenceAudit.operations.venueEvidenceClass} />
            <SummaryCard label="Baker paid organizer-reported" value={formatEventReviewMoney(evidenceAudit.operations.bakerPaidOrganizerReported, currency)} />
            <SummaryCard label="Baker outstanding organizer-reported" value={formatEventReviewMoney(evidenceAudit.operations.bakerOutstandingOrganizerReported, currency)} />
            <SummaryCard label="Baker variance" value={formatEventReviewMoney(evidenceAudit.operations.bakerVariance, currency)} help="Needs External Evidence. Not added as an expense or liability." />
            <SummaryCard label="Cake boxes / printing" value={formatEventReviewMoney(evidenceAudit.operations.cakeBoxesPrinting, currency)} help="Unverified / Outstanding." />
            <SummaryCard label="Open corrective actions" value={evidenceAudit.correctiveActions.length} />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <article className="rounded-2xl border border-[#EFE2DA] bg-[#FBF8F5] p-4">
              <p className="text-sm font-bold text-[#2B1723]">In-kind sponsorship</p>
              <div className="mt-3 space-y-3">
                {evidenceAudit.sponsorship.map((item) => (
                  <div key={item.sponsor} className="rounded-xl border border-[#E7D6CC] bg-white p-3">
                    <p className="text-xs font-bold text-[#2B1723]">{item.sponsor}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#8C7567]">{item.evidenceClass}</p>
                    <p className="mt-2 text-xs leading-5 text-[#816D62]">{item.quantity} · {item.item} · cash received {formatEventReviewMoney(item.cashReceived, currency)} · estimated value unknown.</p>
                  </div>
                ))}
              </div>
            </article>
            <article className="rounded-2xl border border-[#EFE2DA] bg-[#FBF8F5] p-4">
              <p className="text-sm font-bold text-[#2B1723]">Outstanding corrective actions</p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-5 text-[#816D62]">
                {evidenceAudit.correctiveActions.map((item) => <li key={item}>{item}</li>)}
              </ol>
            </article>
          </div>
        </Section>
      )}

      <Section eyebrow={review.summary.eyebrow} title={review.summary.title}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Event status" value={review.summary.eventStatus} />
          <SummaryCard label="Capacity" value={review.summary.capacity > 0 ? review.summary.capacity : 'Not set'} />
          <SummaryCard label="Registration records" value={review.summary.registrationCount} />
          <SummaryCard label="Total guests" value={review.summary.guestCount} />
          <SummaryCard label="Capacity usage" value={review.summary.capacity > 0 ? `${review.summary.capacityUsagePercent}%` : 'Not available'} />
          <SummaryCard label="Paid count" value={review.summary.paidCount} />
          <SummaryCard label="Pending count" value={review.summary.pendingCount} />
          <SummaryCard label="Partial payment count" value={review.summary.partialPaymentCount} />
          <SummaryCard label="Complimentary count" value={review.summary.complimentaryCount} />
          <SummaryCard label="To Pay at Door count" value={review.summary.doorListCount} />
          <SummaryCard label="Unknown count" value={review.summary.unknownCount} />
          <SummaryCard label="Tickets assigned" value={`${review.summary.ticketCoverage.assignedCount} (${review.summary.ticketCoverage.assignedPercent}%)`} />
          <SummaryCard label="Tickets missing" value={review.summary.ticketCoverage.missingCount} help={`Paid missing tickets: ${review.summary.ticketCoverage.paidMissingCount}`} />
          <SummaryCard label="Checked-in registrations" value={review.summary.checkedInRegistrations} />
          <SummaryCard label="Checked-in guests" value={review.summary.checkedInGuests} />
          <SummaryCard label="Attendance rate" value={review.summary.guestCount > 0 ? `${review.summary.attendanceRate}%` : 'Not available'} />
          <SummaryCard label="Incomplete-data warnings" value={review.summary.incompleteDataWarnings} />
          <SummaryCard label="Operations income" value={formatEventReviewMoney(review.summary.operationsIncome, currency)} />
          <SummaryCard label="Operations expenses" value={formatEventReviewMoney(review.summary.operationsExpenses, currency)} />
          <SummaryCard label="Operations refunds" value={formatEventReviewMoney(review.summary.operationsRefunds, currency)} />
          <SummaryCard label="Open operations items" value={review.summary.openOperationsItems} />
          <SummaryCard label="Operations adjustments / net" value={`${formatEventReviewMoney(review.summary.operationsAdjustments, currency)} / ${formatEventReviewMoney(review.summary.operationsNetPosition, currency)}`} />
        </div>

        <div className="mt-5 rounded-2xl border border-[#EEDFD6] bg-[#FFF8F2] p-4 text-sm leading-6 text-[#715D46]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-bold text-[#4E3928]">Attendance model limitation</p>
              <p className="mt-2">{review.summary.attendanceNote}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[#D9EBD8] bg-[#EAF6EF] p-4 text-sm leading-6 text-[#244B32]">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
            <div>
              <p className="font-bold">Read-only review surface</p>
              <p className="mt-2">
                This page does not save a report, change registrations, reconcile money automatically, or write anything to Firebase.
              </p>
            </div>
          </div>
        </div>
      </Section>
    </div>
  )
}
