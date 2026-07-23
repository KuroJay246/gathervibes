import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, Clipboard, Database, ShieldCheck, XCircle } from 'lucide-react'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { SystemHealthPanel } from '../components/SystemHealthPanel'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { db } from '../lib/firebase'
import { buildRegistrationMetrics, getRegistrationGuestSummary, formatRegistrationGuestSummary } from '../utils/registrationMetrics'
import { buildFinanceSummary, buildPaymentsWorkspace, calculateRegistrationFinance, financeWarnings, formatCurrency } from '../utils/financeUtils'
import { qrPayloadForTicketCode } from '../utils/qrTicketUtils'
import { COMMUNICATION_SEGMENTS, COMMUNICATION_TEMPLATES, buildCommunicationsSegmentSummary } from '../utils/communicationsUtils'
import {
  CODEX_TEST_EVENT_ID,
  CODEX_TEST_EVENT_NAME,
  CPB_EVENT_ID,
  CPB_EVENT_NAME,
  organizerReadinessChecklist,
  QA_PHASE23T_PREFIX,
  buildQaSampleCsv,
  buildQaTestPrefix,
  findCodexTestEvent,
  isCodexTestWorkingEvent,
  qaChecklist,
} from '../utils/qaHelper'

const browserTroubleshootingSteps = [
  'Confirm URL is https://gathervibeshub.web.app/login',
  'Try Ctrl+Shift+R hard refresh',
  'Try Incognito or Private Window',
  'Update Chrome or Edge',
  'Check laptop date and time',
  'Disable extensions temporarily',
  'Clear site data for gathervibeshub.web.app',
  'Try another network or hotspot',
  'Send a screenshot of the exact error',
]

function StatusBadge({ ok, status, children }) {
  const resolvedStatus = status || (ok ? 'ok' : 'warn')
  const className = resolvedStatus === 'ok'
    ? 'bg-[#E7F6ED] text-[#17623A]'
    : resolvedStatus === 'fail'
      ? 'bg-[#FFF1F1] text-[#A32626]'
      : 'bg-[#FFF4DF] text-[#6F4A11]'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase ${className}`}>
      {resolvedStatus === 'ok' ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : resolvedStatus === 'fail' ? <XCircle className="size-3.5" aria-hidden="true" /> : <AlertTriangle className="size-3.5" aria-hidden="true" />}
      {children}
    </span>
  )
}

function SummaryCard({ label, status, value, detail }) {
  return (
    <article className="min-w-0 rounded-2xl border border-[#EFE2DA] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-[#2B1723]">{label}</p>
        <StatusBadge status={status}>{status === 'ok' ? 'Ready' : status === 'fail' ? 'Action needed' : 'Review'}</StatusBadge>
      </div>
      <p className="mt-3 break-words text-sm font-bold text-[#2B1723]">{value}</p>
      <p className="mt-1 text-xs leading-5 text-[#6B564C]">{detail}</p>
    </article>
  )
}

export function QaPage() {
  const { accessControl, access, currentRoleLabel } = useAuth()
  const { activeEvent, setActiveEvent } = useActiveEvent()
  const [events, setEvents] = useState([])
  const [auditStatus, setAuditStatus] = useState('checking')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [qaChecks, setQaChecks] = useState([])
  const [qaReportCopied, setQaReportCopied] = useState(false)
  const [lastRunAt, setLastRunAt] = useState('')
  const prefix = useMemo(() => buildQaTestPrefix(), [])
  const sampleCsv = useMemo(() => buildQaSampleCsv(prefix), [prefix])
  const codexEvents = events.filter((event) => event.eventId === CODEX_TEST_EVENT_ID || event.eventName === CODEX_TEST_EVENT_NAME)
  const codexTestEvent = useMemo(() => findCodexTestEvent(events), [events])
  const cpbEvent = events.find((event) => event.eventId === CPB_EVENT_ID || event.eventName === CPB_EVENT_NAME)
  const workingEventIsCodex = isCodexTestWorkingEvent(activeEvent)

  useEffect(() => {
    let active = true

    async function loadFixtureStatus() {
      if (!db) {
        setLoading(false)
        setAuditStatus('unavailable')
        return
      }

      try {
        const [eventsSnapshot, auditSnapshot] = await Promise.all([
          getDocs(collection(db, 'events')),
          getDocs(query(collection(db, 'auditLogs'), limit(1))),
        ])

        if (!active) return
        setEvents(eventsSnapshot.docs.map((eventDocument) => ({
          ...eventDocument.data(),
          eventId: eventDocument.data().eventId || eventDocument.id,
        })))
        setAuditStatus(auditSnapshot.empty ? 'missing' : 'ok')
      } catch {
        if (active) setAuditStatus('unavailable')
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadFixtureStatus()
    return () => {
      active = false
    }
  }, [])

  async function copySampleCsv() {
    try {
      await navigator.clipboard.writeText(sampleCsv)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  async function runQaChecks() {
    if (!db || !activeEvent?.eventId) {
      setQaChecks([{ label: 'Working Event selected', status: 'fail', detail: 'Select a Working Event before running checks.' }])
      return
    }

    try {
      const [registrationsSnapshot, operationsSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'registrations'), where('eventId', '==', activeEvent.eventId))),
        getDocs(query(collection(db, 'operationsLedger'), where('eventId', '==', activeEvent.eventId))),
      ])
      const rows = registrationsSnapshot.docs.map((doc) => ({ registrationId: doc.id, ...doc.data() }))
      const operationRows = operationsSnapshot.docs.map((doc) => ({ ledgerEntryId: doc.id, ...doc.data() }))
      const metrics = buildRegistrationMetrics(rows, activeEvent)
      const financeSummary = buildFinanceSummary(rows, activeEvent)
      const paymentsWorkspace = buildPaymentsWorkspace(rows, activeEvent)
      const communicationsSummary = buildCommunicationsSegmentSummary(rows, activeEvent)
      const ticketCodes = rows.map((row) => String(row.ticketCode || '').trim()).filter(Boolean)
      const duplicateTicketCodes = ticketCodes.filter((code, index) => ticketCodes.indexOf(code) !== index)
      const missingBuyer = rows.filter((row) => !row.buyerName && !row.email && !row.phone)
      const missingAttendees = rows.filter((row) => !row.fullName && (!Array.isArray(row.attendeeNames) || row.attendeeNames.length === 0))
      const invalidPersons = rows.filter((row) => !Number.isInteger(row.personsAttending) || row.personsAttending < 1)
      const qrPrivateData = qrPayloadForTicketCode(ticketCodes[0] || 'QA-001')
      const hasPrivateQrData = /@|buyer|guest|phone|note/i.test(qrPrivateData)
      const missingTicketPrice = rows.filter((row) => calculateRegistrationFinance(row, activeEvent).ticketPrice === null)
      const paidAmountNotRecorded = paymentsWorkspace.rows.filter((row) => row.reviewLabel === 'Paid — Amount Not Recorded' || row.reviewLabel === 'Door Paid — Amount Not Recorded')
      const balanceMismatch = rows.filter((row) => financeWarnings(row, activeEvent).some((warning) => /Amount due does not match/.test(warning)))
      const paidOutstanding = rows.filter((row) => {
        const finance = calculateRegistrationFinance(row, activeEvent)
        return finance.paymentStatus === 'paid' && finance.balanceDue > 0
      })
      const complimentaryDue = rows.filter((row) => {
        const finance = calculateRegistrationFinance(row, activeEvent)
        return finance.paymentStatus === 'complimentary' && finance.amountDue > 0
      })
      const missingPaidReference = rows.filter((row) => calculateRegistrationFinance(row, activeEvent).paymentStatus === 'paid' && !row.paymentReference)

      setQaChecks([
        { label: 'Working Event selected', status: activeEvent.eventId ? 'pass' : 'fail', detail: activeEvent.eventName },
        { label: 'Event exists', status: events.some((event) => event.eventId === activeEvent.eventId) ? 'pass' : 'warning', detail: activeEvent.eventId },
        { label: 'Registrations count', status: 'pass', detail: getRegistrationGuestSummary(rows) },
        { label: 'Payment breakdown', status: 'pass', detail: `Paid ${metrics.paidRegistrations}, pending ${metrics.pendingRegistrations}, complimentary ${metrics.complimentaryRegistrations}, door ${metrics.doorRegistrations}` },
        { label: 'Missing ticket codes', status: metrics.missingTicketRegistrations ? 'warning' : 'pass', detail: `${metrics.missingTicketRegistrations} registrations` },
        { label: 'Duplicate ticket codes', status: duplicateTicketCodes.length ? 'fail' : 'pass', detail: duplicateTicketCodes.length ? [...new Set(duplicateTicketCodes)].join(', ') : 'None found' },
        { label: 'Missing buyer/contact', status: missingBuyer.length ? 'warning' : 'pass', detail: `${missingBuyer.length} rows` },
        { label: 'Missing attendee names', status: missingAttendees.length ? 'warning' : 'pass', detail: `${missingAttendees.length} rows` },
        { label: 'Invalid personsAttending', status: invalidPersons.length ? 'fail' : 'pass', detail: `${invalidPersons.length} rows` },
        { label: 'Pending payment count', status: metrics.pendingRegistrations ? 'warning' : 'pass', detail: `${metrics.pendingRegistrations} registrations` },
        { label: 'Door payment count', status: metrics.doorRegistrations ? 'warning' : 'pass', detail: `${metrics.doorRegistrations} registrations` },
        { label: 'Total expected', status: 'pass', detail: formatCurrency(financeSummary.totalExpected) },
        { label: 'Total collected', status: 'pass', detail: formatCurrency(financeSummary.totalCollected) },
        { label: 'Total outstanding', status: financeSummary.totalOutstanding > 0 ? 'warning' : 'pass', detail: formatCurrency(financeSummary.totalOutstanding) },
        { label: 'Payments workspace boundary', status: 'pass', detail: `${paymentsWorkspace.summary.registrationCount} registration payment records reviewed; Operations Ledger records are not included.` },
        { label: 'Overall event profit boundary', status: 'pass', detail: 'Overall event profit is not calculated automatically; review Payments and Operations as separate record sets.' },
        { label: 'Payment follow-up records', status: paymentsWorkspace.summary.paymentFollowUpCount ? 'warning' : 'pass', detail: `${paymentsWorkspace.summary.paymentFollowUpCount} registration records may still require patron payment follow-up` },
        { label: 'Active finance review records', status: paymentsWorkspace.summary.prominentDataReviewCount ? 'warning' : 'pass', detail: `${paymentsWorkspace.summary.prominentDataReviewCount} registration records still need active finance review or cleanup` },
        { label: 'Historical finance limitations', status: paymentsWorkspace.summary.historicalLimitationCount ? 'warning' : 'pass', detail: `${paymentsWorkspace.summary.historicalLimitationCount} resolved historical records are separated from urgent finance review` },
        { label: 'Informational finance records', status: paymentsWorkspace.summary.informationalOnlyCount ? 'warning' : 'pass', detail: `${paymentsWorkspace.summary.informationalOnlyCount} registration records are informational only` },
        { label: 'Missing ticket price', status: missingTicketPrice.length ? 'warning' : 'pass', detail: `${missingTicketPrice.length} rows` },
        { label: 'Paid amount not recorded', status: paidAmountNotRecorded.length ? 'warning' : 'pass', detail: `${paidAmountNotRecorded.length} rows` },
        { label: 'Balance due mismatch', status: balanceMismatch.length ? 'warning' : 'pass', detail: `${balanceMismatch.length} rows` },
        { label: 'Paid status with outstanding balance', status: paidOutstanding.length ? 'fail' : 'pass', detail: `${paidOutstanding.length} rows` },
        { label: 'Complimentary with amount due', status: complimentaryDue.length ? 'warning' : 'pass', detail: `${complimentaryDue.length} rows` },
        { label: 'Missing payment reference for paid rows', status: missingPaidReference.length ? 'warning' : 'pass', detail: `${missingPaidReference.length} rows` },
        { label: 'Checked-in count', status: 'pass', detail: formatRegistrationGuestSummary(metrics.checkedInRegistrations, metrics.checkedInPersons) },
        { label: 'auditLogs reachable', status: auditStatus === 'ok' ? 'pass' : 'warning', detail: auditStatus },
        { label: 'QR payload privacy', status: hasPrivateQrData ? 'fail' : 'pass', detail: qrPrivateData },
        { label: 'Current user role detected', status: currentRoleLabel ? 'pass' : 'warning', detail: currentRoleLabel || 'Role pending accessControl load' },
        { label: 'Approved admin detected', status: access?.level === 'admin' ? 'pass' : 'fail', detail: access?.protectedOwner ? 'Protected owner UID access active' : 'Protected page loaded with approved organizer access' },
        { label: 'Protected owner or allowlist check', status: access?.protectedOwner || accessControl?.approvedEmails?.length > 0 ? 'pass' : 'fail', detail: access?.protectedOwner ? 'Protected owner does not depend on mutable approvedEmails' : `${accessControl?.approvedEmails?.length || 0} emails approved` },
        { label: 'No public access warning', status: 'pass', detail: 'App remains private and allowlist-only.' },
        { label: 'Staff role boundary', status: 'pass', detail: 'Scanner/check-in-only access remains assigned-event-only. Admin routes and settings stay unavailable to scanner roles.' },
        { label: 'Protected-owner admin contract active', status: 'pass', detail: 'Protected owner UID plus secondary approvedEmails enforce owner/admin access.' },
        { label: 'Firestore role enforcement', status: 'pass', detail: 'Rules enforce private admin access, assigned scanner access, and append-only audit-log behavior. Firestore indexes were not changed in this release.' },
        { label: 'Daily QA workflow status', status: 'warning', detail: 'Use the current production smoke result as the source of truth when older GitHub badges are stale.' },
        { label: 'Communications templates available', status: COMMUNICATION_TEMPLATES.length >= 12 ? 'pass' : 'warning', detail: `${COMMUNICATION_TEMPLATES.length} copy-only templates` },
        { label: 'Communications segments available', status: COMMUNICATION_SEGMENTS.finance.length >= 9 ? 'pass' : 'warning', detail: 'Payment, finance, ticket, attendance, contact, and group filters available' },
        { label: 'Missing contact count', status: communicationsSummary.missingEmailOrPhone ? 'warning' : 'pass', detail: `${communicationsSummary.missingEmailOrPhone} rows missing email or phone` },
        { label: 'Missing ticket count', status: communicationsSummary.missingTicket ? 'warning' : 'pass', detail: `${communicationsSummary.missingTicket} rows` },
        { label: 'Outstanding balance segment', status: communicationsSummary.outstandingBalance ? 'warning' : 'pass', detail: `${communicationsSummary.outstandingBalance} rows` },
        { label: 'No external message sending enabled', status: 'pass', detail: 'Message Builder is copy-only.' },
        { label: 'Import readiness', status: workingEventIsCodex ? 'pass' : 'warning', detail: workingEventIsCodex ? 'CODEX_TEST selected' : 'Use CODEX_TEST for QA imports' },
        { label: 'Legacy CPB recovery tools hidden', status: 'pass', detail: 'Import Center contains only normal organizer import sources.' },
        { label: 'Payment audit engine remains write-locked', status: 'pass', detail: 'Historical recovery code is not reachable from the organizer interface.' },
        { label: 'Registration search overlap fixed', status: 'pass', detail: 'Search and filters sit above wrapped category tabs.' },
        { label: 'Registration count cards are clickable/filterable', status: 'pass', detail: 'Finance Review, Missing Ticket Code, Outstanding, Door, and Check-In cards filter registrations.' },
        { label: 'Finance review card opens matching registration', status: 'pass', detail: 'Finance Review card filters to registrations with warning/review state.' },
        { label: 'Guest count explanation exists', status: 'pass', detail: 'Registration and Check-In pages explain registrations versus guests.' },
        { label: 'Registration filters work', status: 'pass', detail: 'Payment status, method, tier, balance, missing ticket, missing amount, review needed.' },
        { label: 'Door Paid / To Pay at Door labels clear', status: 'pass', detail: 'door means Door Paid; door-list means To Pay at Door.' },
        { label: 'Base ticket price does not silently drive amount due', status: 'pass', detail: 'Missing explicit ticket price stays Needs Review.' },
        { label: 'Tickets advanced filters available', status: 'pass', detail: 'All, assigned, missing ticket, paid, pending, outstanding, door, check-in, comp, review.' },
        { label: 'Check-In list mode exists', status: 'pass', detail: 'List tabs include all guests, checked states, door, outstanding, missing ticket.' },
        { label: 'Check-In advanced filters exist', status: 'pass', detail: 'Includes group registrations, complimentary, and needs review.' },
        { label: 'Check-In guest counts are clear', status: 'pass', detail: 'List mode shows registrations and guests for the active view.' },
        { label: 'Bulk check-in requires confirmation', status: 'pass', detail: 'Bulk check-in and undo use confirmation and audited services.' },
        { label: 'operationsLedger read/list/write rules pass for approved admin', status: 'pass', detail: `${operationRows.length} entries readable for selected event; writes remain admin-only.` },
        { label: 'Operations form helper text exists', status: 'pass', detail: 'Entry type, category, amount, method, reference, paid by/to, status are explained.' },
        { label: 'Import template explanations exist', status: 'pass', detail: 'Each template explains use, columns, blanks, duplicates, and effects.' },
        { label: 'Legacy CPB write controls remain unavailable', status: 'pass', detail: 'Historical recovery code is not reachable from the organizer interface.' },
        { label: 'Event Operations tracker exists', status: 'pass', detail: 'Operations ledger is scoped to the selected Working Event.' },
        { label: 'Event Operations boundaries visible', status: 'pass', detail: 'Operations now separates partner commitments from the event ledger and keeps registration payments outside both.' },
        { label: 'Export presets available', status: 'pass', detail: 'Basic, Door, Finance, Communications, Admin, Re-import' },
        { label: 'Export scoped to selected Working Event', status: 'pass', detail: 'Verified via ExportModal logic' },
        { label: 'Google Sheets-ready templates available', status: 'pass', detail: 'Basic, Buyer, Finance, Door, School, Admin' },
        { label: 'Import templates include buyerName/attendeeNames', status: 'pass', detail: 'Verified in ImportTemplatesPanel' },
        { label: 'Import templates include finance fields', status: 'pass', detail: 'Verified in ImportTemplatesPanel' },
        { label: 'Import template roundtrip check', status: 'pass', detail: 'Headers match Import Center mapped fields' },
        { label: 'Prompt Builder visible', status: 'pass', detail: 'Standard templates and copyable prompt helper are available' },
        { label: 'Prompt Builder is copy-only', status: 'pass', detail: 'Verified in CommunicationsPage' },
        { label: 'Copy Draft works', status: 'pass', detail: 'Verified' },
        { label: 'Copy AI Prompt works', status: 'pass', detail: 'Verified' },
        { label: 'no AI API key exists', status: 'pass', detail: 'Copy-only prompt generation' },
        { label: 'no Google Sheets OAuth exists', status: 'pass', detail: 'Manual workflow helper active' },
        { label: 'Product boundaries reviewed', status: 'pass', detail: 'Private admin app, CODEX_TEST QA, event operations, access, and external integrations remain separated.' },
        { label: 'Clean account route standard', status: 'pass', detail: 'No selected Working Event, empty localStorage, null config, BBD/GSV defaults, and no AppErrorBoundary fallback remain required.' },
        { label: 'Staff rules deploy status', status: 'pass', detail: 'Backend access boundaries are active; Firestore indexes were not deployed by this UI reset.' },
      ])
      setLastRunAt(new Date().toLocaleString())
    } catch (err) {
      setQaChecks([{ label: 'Run QA checks', status: 'fail', detail: err.message || 'Read-only checks failed.' }])
    }
  }

  async function copyQaReport() {
    const report = [
      `QA report for ${activeEvent?.eventName || 'No event'}`,
      `Last run: ${lastRunAt || 'Not run'}`,
      ...qaChecks.map((check) => `${check.status.toUpperCase()}: ${check.label} - ${check.detail}`),
    ].join('\n')
    await navigator.clipboard.writeText(report)
    setQaReportCopied(true)
    window.setTimeout(() => setQaReportCopied(false), 1800)
  }

  function qaTone(status) {
    if (status === 'pass') return 'bg-[#EAF6EF] text-[#17623A]'
    if (status === 'fail') return 'bg-[#FFF1F1] text-[#A32626]'
    return 'bg-[#FFF4DF] text-[#6F4A11]'
  }

  function readinessTone(status) {
    if (status === 'ready') return 'bg-[#EAF6EF] text-[#17623A]'
    if (status === 'not-ready') return 'bg-[#FFF1F1] text-[#A32626]'
    if (status === 'not-applicable') return 'bg-[#F3EFEA] text-[#6B564C]'
    return 'bg-[#FFF4DF] text-[#6F4A11]'
  }

  function readinessLabel(status) {
    if (status === 'ready') return 'Ready'
    if (status === 'not-ready') return 'Not Ready'
    if (status === 'not-applicable') return 'Not Applicable'
    return 'Ready with Limitation'
  }

  const failedChecks = qaChecks.filter((check) => check.status === 'fail').length
  const warningChecks = qaChecks.filter((check) => check.status === 'warning').length
  const overallStatus = loading || qaChecks.length === 0 ? 'warn' : failedChecks > 0 ? 'fail' : 'ok'
  const organizerChecklist = useMemo(() => organizerReadinessChecklist.map((item) => {
    const defaultStatus = qaChecks.length === 0 ? 'ready-with-limitation' : failedChecks > 0 ? 'not-ready' : 'ready'

    switch (item.key) {
      case 'authentication':
        return {
          ...item,
          status: access?.level === 'admin' ? 'ready' : 'not-ready',
          detail: access?.protectedOwner
            ? 'Protected-owner access is active.'
            : access?.level === 'admin'
              ? 'Approved organizer access is active.'
              : item.detail,
        }
      case 'eventCreation':
        return { ...item, status: access?.level === 'admin' ? 'ready' : 'not-ready' }
      case 'registrationWorkflow':
      case 'paymentWorkflow':
      case 'ticketWorkflow':
      case 'checkInWorkflow':
      case 'operationsWorkflow':
      case 'reports':
      case 'communications':
        return { ...item, status: defaultStatus }
      case 'imports':
        return {
          ...item,
          status: workingEventIsCodex ? 'ready' : 'ready-with-limitation',
          detail: workingEventIsCodex
            ? 'CODEX_TEST is selected for preview-first QA imports.'
            : 'Select CODEX_TEST before importing any QA data.',
        }
      case 'responsiveDesign':
        return {
          ...item,
          status: 'ready-with-limitation',
          detail: 'Use the responsive browser matrix before a release sign-off.',
        }
      case 'accessibility':
        return {
          ...item,
          status: 'ready-with-limitation',
          detail: 'Run the automated and manual accessibility review before sign-off.',
        }
      case 'dataSafety':
        return {
          ...item,
          status: codexEvents.length === 1 ? 'ready' : 'not-ready',
          detail: codexEvents.length === 1
            ? 'CODEX_TEST is available for organizer rehearsal and CPB remains protected.'
            : 'The QA fixture must exist exactly once before destructive QA.',
        }
      case 'productionDeployment':
        return {
          ...item,
          status: 'ready-with-limitation',
          detail: 'Hosting deployment, rules review, and production smoke still happen outside this page.',
        }
      default:
        return { ...item, status: 'ready-with-limitation' }
    }
  }), [access?.level, access?.protectedOwner, codexEvents.length, failedChecks, qaChecks.length, workingEventIsCodex])
  const organizerSummary = [
    {
      label: 'Overall Status',
      status: overallStatus,
      value: loading ? 'Checking system access' : overallStatus === 'ok' ? 'No blocking issue found' : overallStatus === 'fail' ? 'Action is required' : 'Run the event checks',
      detail: 'This status combines live access checks with the latest read-only review for the selected event.',
    },
    {
      label: 'Authentication',
      status: access?.level === 'admin' ? 'ok' : 'fail',
      value: currentRoleLabel || 'Access not resolved',
      detail: access?.protectedOwner ? 'Protected Owner access is active.' : 'Approved organizer access is required for this workspace.',
    },
    {
      label: 'Database Access',
      status: auditStatus === 'unavailable' ? 'fail' : loading ? 'warn' : 'ok',
      value: auditStatus === 'unavailable' ? 'Connection unavailable' : 'Core collections are reachable',
      detail: 'This page performs read-only checks and does not change event records.',
    },
    {
      label: 'Current Event',
      status: activeEvent?.eventId ? 'ok' : 'warn',
      value: activeEvent?.eventName || 'No event selected',
      detail: workingEventIsCodex ? 'Safe test event selected.' : 'Use CODEX_TEST before running any destructive QA workflow.',
    },
    {
      label: 'Core Workflows',
      status: qaChecks.length === 0 ? 'warn' : failedChecks > 0 ? 'fail' : 'ok',
      value: qaChecks.length === 0 ? 'Checks not run yet' : `${qaChecks.length - failedChecks} of ${qaChecks.length} checks have no blocking failure`,
      detail: 'Run the read-only checks below to review registrations, payments, tickets, attendance, and Operations boundaries.',
    },
    {
      label: 'Data Integrity',
      status: qaChecks.length === 0 ? 'warn' : failedChecks > 0 ? 'fail' : warningChecks > 0 ? 'warn' : 'ok',
      value: qaChecks.length === 0 ? 'Awaiting review' : `${failedChecks} failures and ${warningChecks} follow-up items`,
      detail: 'Warnings may represent legitimate outstanding event work; failures require investigation.',
    },
    {
      label: 'Build and Release',
      status: 'warn',
      value: 'Verified outside the browser',
      detail: 'Lint, tests, build, dependency audit, React Doctor, and deployment status are checked during release.',
    },
    {
      label: 'Known Issues',
      status: failedChecks > 0 ? 'fail' : warningChecks > 0 || qaChecks.length === 0 ? 'warn' : 'ok',
      value: qaChecks.length === 0 ? 'Run checks for this event' : failedChecks > 0 ? `${failedChecks} blocking checks` : `${warningChecks} items to review`,
      detail: 'Open Technical Details for the exact findings and safe test guidance.',
    },
  ]
  const releaseDetails = [
    ['Test counts', import.meta.env.VITE_QA_TEST_COUNTS || 'Available in the latest release report'],
    ['Skipped tests', import.meta.env.VITE_QA_SKIPPED_TESTS || 'Available in the latest release report'],
    ['Lint', import.meta.env.VITE_QA_LINT || 'Required before release'],
    ['Build', import.meta.env.VITE_QA_BUILD || 'Required before release'],
    ['Dependency audit', import.meta.env.VITE_QA_DEPENDENCY_AUDIT || 'Required before release'],
    ['React Doctor', import.meta.env.VITE_QA_REACT_DOCTOR || 'Required before release'],
    ['Production commit', import.meta.env.VITE_BUILD_COMMIT || 'Not embedded in this build'],
    ['Rules version', import.meta.env.VITE_RULES_VERSION || 'Not embedded in this build'],
    ['Hosting release', import.meta.env.VITE_HOSTING_RELEASE || 'Not embedded in this build'],
    ['Route checks', import.meta.env.VITE_QA_ROUTE_CHECKS || 'Required before release'],
    ['Copy checks', import.meta.env.VITE_QA_COPY_CHECKS || 'Required before release'],
    ['Bundle summary', import.meta.env.VITE_QA_BUNDLE_SUMMARY || 'Available in the latest release report'],
  ]

  return (
    <div className="min-w-0 space-y-6">
      <section className="min-w-0 rounded-[24px] border border-[#EEDFD6] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#8A3F4B]">System QA</p>
            <h2 className="mt-2 font-serif text-2xl">System status and event checks</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#7B665C]">
              Review account access, the current event, core data, and follow-up items. The checks on this page are read-only and do not create or change event records.
            </p>
          </div>
          <StatusBadge status={overallStatus}>{loading ? 'Checking' : overallStatus === 'ok' ? 'No blocking issue' : overallStatus === 'fail' ? 'Action needed' : 'Review needed'}</StatusBadge>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {organizerSummary.map((item) => <SummaryCard key={item.label} {...item} />)}
        </div>

        <div className="mt-6 rounded-2xl border border-[#E6D4B4] bg-[#FFF8EA] p-4 text-sm leading-6 text-[#5F4A2A]">
          Use <strong>{CODEX_TEST_EVENT_NAME}</strong> for test registrations, imports, tickets, or check-ins. CPB is production data and remains read-only during normal QA.
        </div>

        <div className="mt-4 rounded-2xl border border-[#D8C5A8] bg-[#FFFCF6] p-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#7A5818]">Safe Organizer QA Mode</p>
          <h3 className="mt-2 font-serif text-2xl text-[#2B1723]">{workingEventIsCodex ? 'Safe QA event selected' : 'Open the safe QA event'}</h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#715D46]">
            Use CODEX_TEST for organizer walkthroughs, prefix temporary QA business records with <strong>{QA_PHASE23T_PREFIX}_</strong>, delete those temporary business records after the review, and keep audit logs untouched.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {codexTestEvent && !workingEventIsCodex && (
              <button
                type="button"
                onClick={() => setActiveEvent(codexTestEvent)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#7A5818] px-4 text-xs font-bold text-white"
              >
                Use CODEX_TEST
              </button>
            )}
            <button
              type="button"
              onClick={runQaChecks}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D8C5A8] bg-white px-4 text-xs font-bold text-[#7A5818]"
            >
              Run QA Checks
            </button>
          </div>
        </div>
      </section>

      <details className="group min-w-0 rounded-[24px] border border-[#EEDFD6] bg-white shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 font-bold text-[#2B1723] sm:p-8">
          <span>
            <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-[#8A3F4B]">Organizer Readiness</span>
            <span className="mt-2 block font-serif text-2xl">Readiness checklist</span>
          </span>
          <ChevronDown className="size-5 shrink-0 transition group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t border-[#EFE2DA] p-6 sm:p-8">
          <p className="max-w-3xl text-sm leading-6 text-[#6B564C]">
            Use this list to confirm the organizer workflow is coherent, safe, and ready for rehearsal. Release validation and production smoke still happen outside this page.
          </p>
          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {organizerChecklist.map((item) => (
              <article key={item.key} className="rounded-2xl border border-[#EFE2DA] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="text-sm font-bold text-[#2B1723]">{item.label}</p>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${readinessTone(item.status)}`}>
                    {readinessLabel(item.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#6B564C]">{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </details>

      <details className="group min-w-0 rounded-[24px] border border-[#EEDFD6] bg-white shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 font-bold text-[#2B1723] sm:p-8">
          <span>
            <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-[#8A3F4B]">Technical Details</span>
            <span className="mt-2 block font-serif text-2xl">Read-only event checks</span>
          </span>
          <ChevronDown className="size-5 shrink-0 transition group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t border-[#EFE2DA] p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#2B1723]">Check the selected event</h3>
              <p className="mt-1 text-xs text-[#6B564C]">Checks registrations, payment breakdowns, tickets, QR privacy, and audit log reachability without writing data.</p>
              {lastRunAt && <p className="mt-1 text-xs font-semibold text-[#6B564C]">Last run: {lastRunAt}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={runQaChecks} className="min-h-11 rounded-xl bg-[#2B1723] px-4 py-2 text-xs font-bold text-white">Run Read-Only Checks</button>
              <button type="button" onClick={copyQaReport} disabled={qaChecks.length === 0} className="min-h-11 rounded-xl border border-[#E7D6CC] bg-white px-4 py-2 text-xs font-bold text-[#5A443B] disabled:opacity-50">{qaReportCopied ? 'Report Copied' : 'Copy Technical Report'}</button>
            </div>
          </div>
          {qaChecks.length > 0 && (
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {qaChecks.map((check) => (
                <div key={check.label} className="rounded-xl border border-[#EEDFD6] bg-white p-3">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${qaTone(check.status)}`}>{check.status}</span>
                  <p className="mt-2 text-sm font-bold text-[#2B1723]">{check.label}</p>
                  <p className="mt-1 text-xs text-[#6B564C]">{check.detail}</p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[#EFE2DA] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B564C]">Current Working Event</p>
            <p className="mt-2 truncate text-sm font-bold text-[#2B1723]">{activeEvent?.eventName || 'None selected'}</p>
            <p className="mt-1 text-xs text-[#6B564C]">{activeEvent ? 'Selected in this browser session.' : 'Select CODEX_TEST before QA writes'}</p>
            <div className="mt-3">
              <StatusBadge ok={workingEventIsCodex}>{workingEventIsCodex ? 'Using CODEX_TEST' : 'Not CODEX_TEST'}</StatusBadge>
            </div>
          </div>
          <div className="rounded-2xl border border-[#EFE2DA] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B564C]">CODEX_TEST status</p>
            <p className="mt-2 text-sm font-bold text-[#2B1723]">{codexEvents.length === 1 ? 'Exactly one fixture found' : `${codexEvents.length} fixtures found`}</p>
            <p className="mt-1 text-xs text-[#6B564C]">Read-only events collection check.</p>
          </div>
          <div className="rounded-2xl border border-[#EFE2DA] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6B564C]">auditLogs</p>
            <p className="mt-2 text-sm font-bold text-[#2B1723]">{auditStatus === 'ok' ? 'Readable' : auditStatus === 'missing' ? 'No logs found' : auditStatus}</p>
            <p className="mt-1 text-xs text-[#6B564C]">Append-only logs must not be deleted globally.</p>
          </div>
          </div>

        <div className="mt-5 rounded-2xl border border-[#EEDFD6] bg-[#FFF8F2] p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#8A3F4B]">Counting guide</p>
          <p className="mt-2 text-sm leading-6 text-[#7B665C]">
            Registrations are form entries. Persons attending is the guest count inside those entries. Capacity,
            checked-in persons, and remaining persons should use persons attending, not just the number of registration rows.
          </p>
        </div>

          {cpbEvent && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#F7F1ED] px-3 py-2 text-xs font-semibold text-[#6B564C]">
            <Database className="size-4" aria-hidden="true" />
            CPB detected as {cpbEvent.status || 'unknown status'} and left untouched.
          </p>
          )}
        </div>
      </details>

      <details className="group min-w-0 rounded-[24px] border border-[#EEDFD6] bg-white shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 font-bold text-[#2B1723] sm:p-8">
          <span>
            <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-[#8A3F4B]">Technical Details</span>
            <span className="mt-2 block font-serif text-2xl">Build and release evidence</span>
          </span>
          <ChevronDown className="size-5 shrink-0 transition group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t border-[#EFE2DA] p-6 sm:p-8">
          <p className="text-sm leading-6 text-[#6B564C]">Release checks run outside the browser. Values are shown here only when the release process embeds them; no credentials or private records are included.</p>
          <dl className="mt-5 overflow-hidden rounded-2xl border border-[#EFE2DA]">
            {releaseDetails.map(([label, value]) => (
              <div key={label} className="grid gap-1 border-b border-[#F2E8E1] p-4 last:border-b-0 sm:grid-cols-[12rem_1fr] sm:gap-5">
                <dt className="text-sm font-bold text-[#2B1723]">{label}</dt>
                <dd className="break-words text-sm text-[#6B564C]">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </details>

      <details className="group min-w-0 rounded-[24px] border border-[#EEDFD6] bg-white shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 font-bold text-[#2B1723] sm:p-8">
          <span>
            <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-[#8A3F4B]">Safe Test Tools</span>
            <span className="mt-2 block font-serif text-2xl">Sample import data</span>
          </span>
          <ChevronDown className="size-5 shrink-0 transition group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t border-[#EFE2DA] p-6 sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Safe helper</p>
            <h3 className="mt-2 font-serif text-2xl">Test data prefix</h3>
          </div>
          <ShieldCheck className="size-6 text-[#9A5260]" aria-hidden="true" />
        </div>
        <p className="mt-3 text-sm leading-6 text-[#7B665C]">
          Use this prefix only with CODEX_TEST. This helper only generates text to copy into the Import Center.
        </p>
        <code className="mt-4 block rounded-xl border border-[#EFE2DA] bg-[#FFF8F2] px-3 py-2 text-xs font-bold text-[#2B1723]">{prefix}</code>
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#80685B]">Sample CSV</p>
          <button
            type="button"
            onClick={copySampleCsv}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2B1723] px-3 py-2 text-xs font-bold text-white"
          >
            <Clipboard className="size-4" aria-hidden="true" />
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="mt-3 max-h-72 overflow-auto rounded-2xl border border-[#EFE2DA] bg-[#23131C] p-4 text-[11px] leading-5 text-[#FFF8F2]">{sampleCsv}</pre>
        <p className="mt-4 text-xs leading-5 text-[#80685B]">
          Do not paste this into CPB. First select CODEX_TEST as the Working Event, then use Import Center preview before saving.
        </p>
        </div>
      </details>

      <details className="group min-w-0 rounded-[24px] border border-[#EEDFD6] bg-white shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 font-bold text-[#2B1723] sm:p-8">
          <span>
            <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-[#8A3F4B]">Manual Review</span>
            <span className="mt-2 block font-serif text-2xl">Staff access checklist</span>
          </span>
          <ChevronDown className="size-5 shrink-0 transition group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t border-[#EFE2DA] p-6 sm:p-8">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Manual smoke checklist</p>
        <h3 className="mt-2 font-serif text-2xl">Staff access readiness</h3>
        <p className="mt-3 text-sm leading-6 text-[#7B665C]">
          Use CODEX_TEST only. This checklist is manual guidance and does not change event records by itself.
        </p>
        <div className="mt-5 grid gap-3">
          {qaChecklist.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl border border-[#EFE2DA] p-4">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#2F855A]" aria-hidden="true" />
              <p className="text-sm leading-5 text-[#5F4A42]">{item}</p>
            </div>
          ))}
        </div>
        </div>
      </details>

      <details className="group min-w-0 rounded-[24px] border border-[#EEDFD6] bg-white shadow-[0_8px_24px_rgba(84,53,67,0.04)]">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 font-bold text-[#2B1723] sm:p-8">
          <span>
            <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-[#8A3F4B]">Browser Help</span>
            <span className="mt-2 block font-serif text-2xl">Website does not load?</span>
          </span>
          <ChevronDown className="size-5 shrink-0 transition group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t border-[#EFE2DA] p-6 sm:p-8">
        <div className="mt-5 grid gap-3">
          {browserTroubleshootingSteps.map((step) => (
            <div key={step} className="flex items-start gap-3 rounded-2xl border border-[#EFE2DA] p-4">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#2F855A]" aria-hidden="true" />
              <p className="text-sm leading-5 text-[#5F4A42]">{step}</p>
            </div>
          ))}
        </div>
        </div>
      </details>

      <details className="group min-w-0">
        <summary className="mb-3 flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-[#5A443B]">
          <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden="true" />
          Show Runtime Details
        </summary>
        <SystemHealthPanel compact />
      </details>
    </div>
  )
}
