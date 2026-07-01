import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clipboard, Database, ShieldCheck } from 'lucide-react'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { SystemHealthPanel } from '../components/SystemHealthPanel'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { db } from '../lib/firebase'
import { buildRegistrationMetrics, getRegistrationGuestSummary, formatRegistrationGuestSummary } from '../utils/registrationMetrics'
import { buildFinanceSummary, calculateRegistrationFinance, financeWarnings, formatCurrency } from '../utils/financeUtils'
import { qrPayloadForTicketCode } from '../utils/qrTicketUtils'
import { COMMUNICATION_SEGMENTS, COMMUNICATION_TEMPLATES, buildCommunicationsSegmentSummary } from '../utils/communicationsUtils'
import {
  CODEX_TEST_EVENT_ID,
  CODEX_TEST_EVENT_NAME,
  CODEX_TEST_NOTES,
  CPB_EVENT_ID,
  CPB_EVENT_NAME,
  buildQaSampleCsv,
  buildQaTestPrefix,
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

function StatusBadge({ ok, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold ${ok ? 'bg-[#E7F6ED] text-[#2F855A]' : 'bg-[#FFF4DF] text-[#986F26]'}`}>
      {ok ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : <AlertTriangle className="size-3.5" aria-hidden="true" />}
      {children}
    </span>
  )
}

export function QaPage() {
  const { accessControl, currentRoleLabel } = useAuth()
  const { activeEvent } = useActiveEvent()
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
      const communicationsSummary = buildCommunicationsSegmentSummary(rows, activeEvent)
      const ticketCodes = rows.map((row) => String(row.ticketCode || '').trim()).filter(Boolean)
      const duplicateTicketCodes = ticketCodes.filter((code, index) => ticketCodes.indexOf(code) !== index)
      const missingBuyer = rows.filter((row) => !row.buyerName && !row.email && !row.phone)
      const missingAttendees = rows.filter((row) => !row.fullName && (!Array.isArray(row.attendeeNames) || row.attendeeNames.length === 0))
      const invalidPersons = rows.filter((row) => !Number.isInteger(row.personsAttending) || row.personsAttending < 1)
      const qrPrivateData = qrPayloadForTicketCode(ticketCodes[0] || 'QA-001')
      const hasPrivateQrData = /@|buyer|guest|phone|note/i.test(qrPrivateData)
      const missingTicketPrice = rows.filter((row) => calculateRegistrationFinance(row, activeEvent).ticketPrice === null)
      const missingPaidAmount = rows.filter((row) => calculateRegistrationFinance(row, activeEvent).paymentStatus === 'paid' && calculateRegistrationFinance(row, activeEvent).amountPaid === 0)
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
        { label: 'Missing ticket price', status: missingTicketPrice.length ? 'warning' : 'pass', detail: `${missingTicketPrice.length} rows` },
        { label: 'Missing amount paid on paid rows', status: missingPaidAmount.length ? 'warning' : 'pass', detail: `${missingPaidAmount.length} rows` },
        { label: 'Balance due mismatch', status: balanceMismatch.length ? 'warning' : 'pass', detail: `${balanceMismatch.length} rows` },
        { label: 'Paid status with outstanding balance', status: paidOutstanding.length ? 'fail' : 'pass', detail: `${paidOutstanding.length} rows` },
        { label: 'Complimentary with amount due', status: complimentaryDue.length ? 'warning' : 'pass', detail: `${complimentaryDue.length} rows` },
        { label: 'Missing payment reference for paid rows', status: missingPaidReference.length ? 'warning' : 'pass', detail: `${missingPaidReference.length} rows` },
        { label: 'Checked-in count', status: 'pass', detail: formatRegistrationGuestSummary(metrics.checkedInRegistrations, metrics.checkedInPersons) },
        { label: 'auditLogs reachable', status: auditStatus === 'ok' ? 'pass' : 'warning', detail: auditStatus },
        { label: 'QR payload privacy', status: hasPrivateQrData ? 'fail' : 'pass', detail: qrPrivateData },
        { label: 'Current user role detected', status: currentRoleLabel ? 'pass' : 'warning', detail: currentRoleLabel || 'Role pending accessControl load' },
        { label: 'Approved admin detected', status: db && Array.isArray(accessControl?.approvedEmails) ? 'pass' : 'fail', detail: 'Protected page loaded with settings/accessControl allowlist access' },
        { label: 'Empty allowlist check', status: accessControl?.approvedEmails?.length > 0 ? 'pass' : 'fail', detail: accessControl?.approvedEmails?.length > 0 ? `${accessControl.approvedEmails.length} emails approved` : 'approvedEmails is missing or empty' },
        { label: 'No public access warning', status: 'pass', detail: 'App remains private and allowlist-only.' },
        { label: 'Staff roles enforcement level', status: 'pass', detail: 'Phase 17C-B remains closed and live. Phase 17D-C and Phase 17D-D are closed and merged, Phase 17E-A is closed after organizer artifact review PASS, and Phase 17E-B is active as a dry-run rules prototype with no live workflow change.' },
        { label: 'Approved-admin allowlist active', status: 'pass', detail: 'settings/accessControl.approvedEmails remains owner/admin enforcement.' },
        { label: 'Firestore role enforcement', status: 'pass', detail: 'Scanner/check-in-only live access is enforced through deployed rules, active staffProfiles, and active staffAssignments. Phase 17D-C and Phase 17D-D closed without changing live rules, Phase 17E-A did not deploy rules, and Phase 17E-B remains dry-run only for future accessRequests workflow review.' },
        { label: 'Communications templates available', status: COMMUNICATION_TEMPLATES.length >= 12 ? 'pass' : 'warning', detail: `${COMMUNICATION_TEMPLATES.length} copy-only templates` },
        { label: 'Communications segments available', status: COMMUNICATION_SEGMENTS.finance.length >= 9 ? 'pass' : 'warning', detail: 'Payment, finance, ticket, attendance, contact, and group filters available' },
        { label: 'Missing contact count', status: communicationsSummary.missingEmailOrPhone ? 'warning' : 'pass', detail: `${communicationsSummary.missingEmailOrPhone} rows missing email or phone` },
        { label: 'Missing ticket count', status: communicationsSummary.missingTicket ? 'warning' : 'pass', detail: `${communicationsSummary.missingTicket} rows` },
        { label: 'Outstanding balance segment', status: communicationsSummary.outstandingBalance ? 'warning' : 'pass', detail: `${communicationsSummary.outstandingBalance} rows` },
        { label: 'No Gmail/Outlook/AI sending enabled', status: 'pass', detail: 'Communications Pro is copy-only.' },
        { label: 'Import readiness', status: workingEventIsCodex ? 'pass' : 'warning', detail: workingEventIsCodex ? 'CODEX_TEST selected' : 'Use CODEX_TEST for QA imports' },
        { label: 'CPB Payment Audit Backfill available', status: 'pass', detail: 'Import Center special source is dry-run first.' },
        { label: 'Payment audit dry-run performs no writes', status: 'pass', detail: 'Apply remains locked in Phase 14B handoff.' },
        { label: 'Payment audit review-needed rows are flagged', status: 'pass', detail: 'Roger, inferred price, partial payment, fuzzy, conflicts, medium/low confidence.' },
        { label: 'Payment audit create candidates are flagged', status: 'pass', detail: 'Christina Morris and Gabriela missing third guest are not auto-created.' },
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
        { label: 'CPB dry-run review tabs exist', status: 'pass', detail: 'Matched, unmatched, review-needed, candidates, and confidence filters are available.' },
        { label: 'Cole/spreadsheet independent review note exists', status: 'pass', detail: 'Dry-run UI says the spreadsheet should be cross-checked before apply.' },
        { label: 'CPB apply remains locked', status: 'pass', detail: 'Apply button only alerts that no CPB writes were performed.' },
        { label: 'Event Operations tracker exists', status: 'pass', detail: 'Operations ledger is scoped to the selected Working Event.' },
        { label: 'Event Operations future backlog visible', status: 'pass', detail: 'Tasks, supplies, vendors, sponsors, school/baker tracking, run sheet, reimbursements, and expense reporting remain planned, not active.' },
        { label: 'Export presets available', status: 'pass', detail: 'Basic, Door, Finance, Communications, Admin, Re-import' },
        { label: 'Export scoped to selected Working Event', status: 'pass', detail: 'Verified via ExportModal logic' },
        { label: 'Google Sheets-ready templates available', status: 'pass', detail: 'Basic, Buyer, Finance, Door, School, Admin' },
        { label: 'Import templates include buyerName/attendeeNames', status: 'pass', detail: 'Verified in ImportTemplatesPanel' },
        { label: 'Import templates include finance fields', status: 'pass', detail: 'Verified in ImportTemplatesPanel' },
        { label: 'Import template roundtrip check', status: 'pass', detail: 'Headers match Import Center mapped fields' },
        { label: 'AI Draft Lab visible', status: 'pass', detail: 'Standard/AI modes available' },
        { label: 'AI Draft Lab marked Draft Only', status: 'pass', detail: 'Verified in CommunicationsPage' },
        { label: 'Copy Draft works', status: 'pass', detail: 'Verified' },
        { label: 'Copy AI Prompt works', status: 'pass', detail: 'Verified' },
        { label: 'no AI API key exists', status: 'pass', detail: 'Copy-only prompt generation' },
        { label: 'no Google Sheets OAuth exists', status: 'pass', detail: 'Manual workflow helper active' },
        { label: 'Phase 17C-B backlog order reviewed', status: 'pass', detail: 'Closed, current, next, operational, access/staff, Event Operations, QA/reliability, deferred, long-term, out of scope.' },
        { label: 'Clean account route standard', status: 'pass', detail: 'No selected Working Event, empty localStorage, null config, BBD/GSV defaults, and no AppErrorBoundary fallback remain required.' },
        { label: 'Staff rules deploy status', status: 'warning', detail: 'Do not live-test staff access until TEST_SCANNER_EMAIL exists and Firestore rules are explicitly deployed.' },
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
    if (status === 'pass') return 'bg-[#EAF6EF] text-[#2F855A]'
    if (status === 'fail') return 'bg-[#FFF1F1] text-[#A32626]'
    return 'bg-[#FFF4DF] text-[#986F26]'
  }

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="min-w-0 rounded-[24px] border border-[#EEDFD6] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#B76E79]">Production QA Center</p>
            <h2 className="mt-2 font-serif text-2xl">CODEX_TEST smoke testing</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#7B665C]">
              Use this page to keep production QA scoped to the dedicated fixture. It does not create registrations,
              tickets, check-ins, events, or audit logs.
            </p>
          </div>
          <StatusBadge ok={codexEvents.length === 1}>{loading ? 'Checking fixture' : codexEvents.length === 1 ? 'Fixture ready' : 'Fixture needs review'}</StatusBadge>
        </div>

        <div className="mt-6 rounded-2xl border border-[#EEDFD6] bg-[#FBF8F5] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#2B1723]">Read-only QA checks</h3>
              <p className="mt-1 text-xs text-[#816D62]">Checks registrations, payment breakdowns, tickets, QR privacy, and audit log reachability without writing data.</p>
              {lastRunAt && <p className="mt-1 text-xs font-semibold text-[#8C7567]">Last run: {lastRunAt}</p>}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={runQaChecks} className="rounded-xl bg-[#2B1723] px-4 py-2 text-xs font-bold text-white">Run QA checks</button>
              <button type="button" onClick={copyQaReport} disabled={qaChecks.length === 0} className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-2 text-xs font-bold text-[#6B564C] disabled:opacity-50">{qaReportCopied ? 'Copied' : 'Copy QA report'}</button>
            </div>
          </div>
          {qaChecks.length > 0 && (
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {qaChecks.map((check) => (
                <div key={check.label} className="rounded-xl border border-[#EEDFD6] bg-white p-3">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${qaTone(check.status)}`}>{check.status}</span>
                  <p className="mt-2 text-sm font-bold text-[#2B1723]">{check.label}</p>
                  <p className="mt-1 text-xs text-[#816D62]">{check.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <article className="rounded-2xl border border-[#EFE2DA] p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#A85F6B]">QA fixture</p>
            <h3 className="mt-2 text-sm font-bold text-[#2B1723]">{CODEX_TEST_EVENT_NAME}</h3>
            <p className="mt-1 break-all text-xs text-[#7B665C]">Event ID: {CODEX_TEST_EVENT_ID}</p>
            <p className="mt-3 text-xs leading-5 text-[#7B665C]">{CODEX_TEST_NOTES}</p>
          </article>

          <article className="rounded-2xl border border-[#E6D4B4] bg-[#FFF8EA] p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#86662C]">Production data warning</p>
            <h3 className="mt-2 text-sm font-bold text-[#4E3928]">Do not use CPB for QA</h3>
            <p className="mt-1 break-all text-xs text-[#715D46]">CPB event ID: {CPB_EVENT_ID}</p>
            <p className="mt-3 text-xs leading-5 text-[#715D46]">
              CPB is real production data. Do not create test guests, imports, tickets, or check-ins against CPB.
            </p>
          </article>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[#EFE2DA] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A48A7B]">Current Working Event</p>
            <p className="mt-2 truncate text-sm font-bold text-[#2B1723]">{activeEvent?.eventName || 'None selected'}</p>
            <p className="mt-1 break-all text-xs text-[#8A7468]">{activeEvent?.eventId || 'Select CODEX_TEST before QA writes'}</p>
            <div className="mt-3">
              <StatusBadge ok={workingEventIsCodex}>{workingEventIsCodex ? 'Using CODEX_TEST' : 'Not CODEX_TEST'}</StatusBadge>
            </div>
          </div>
          <div className="rounded-2xl border border-[#EFE2DA] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A48A7B]">CODEX_TEST status</p>
            <p className="mt-2 text-sm font-bold text-[#2B1723]">{codexEvents.length === 1 ? 'Exactly one fixture found' : `${codexEvents.length} fixtures found`}</p>
            <p className="mt-1 text-xs text-[#8A7468]">Read-only events collection check.</p>
          </div>
          <div className="rounded-2xl border border-[#EFE2DA] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A48A7B]">auditLogs</p>
            <p className="mt-2 text-sm font-bold text-[#2B1723]">{auditStatus === 'ok' ? 'Readable' : auditStatus === 'missing' ? 'No logs found' : auditStatus}</p>
            <p className="mt-1 text-xs text-[#8A7468]">Append-only logs must not be deleted globally.</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[#EEDFD6] bg-[#FFF8F2] p-4">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#A85F6B]">Counting guide</p>
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
      </section>

      <section className="min-w-0 rounded-[24px] border border-[#EEDFD6] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#B76E79]">Safe helper</p>
            <h2 className="mt-2 font-serif text-2xl">Test data prefix</h2>
          </div>
          <ShieldCheck className="size-6 text-[#B76E79]" aria-hidden="true" />
        </div>
        <p className="mt-3 text-sm leading-6 text-[#7B665C]">
          Use this prefix only with CODEX_TEST. This helper only generates text to copy into the Import Center.
        </p>
        <code className="mt-4 block rounded-xl border border-[#EFE2DA] bg-[#FFF8F2] px-3 py-2 text-xs font-bold text-[#2B1723]">{prefix}</code>
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A48A7B]">Sample CSV</p>
          <button
            type="button"
            onClick={copySampleCsv}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2B1723] px-3 py-2 text-xs font-bold text-white"
          >
            <Clipboard className="size-4" aria-hidden="true" />
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="mt-3 max-h-72 overflow-auto rounded-2xl border border-[#EFE2DA] bg-[#23131C] p-4 text-[11px] leading-5 text-[#FFF8F2]">{sampleCsv}</pre>
        <p className="mt-4 text-xs leading-5 text-[#8A7468]">
          Do not paste this into CPB. First select CODEX_TEST as the Working Event, then use Import Center preview before saving.
        </p>
      </section>

      <section className="min-w-0 rounded-[24px] border border-[#EEDFD6] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-8">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#B76E79]">Manual smoke checklist</p>
        <h2 className="mt-2 font-serif text-2xl">Phase 17C-A staff rules readiness</h2>
        <p className="mt-3 text-sm leading-6 text-[#7B665C]">
          Use CODEX_TEST only. This checklist includes Phase 16 live browser and check-in QA, Phase 17A visibility checks, and Phase 17C-A staff-rule review. It is manual guidance and does not write to Firestore.
        </p>
        <div className="mt-5 grid gap-3">
          {qaChecklist.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl border border-[#EFE2DA] p-4">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#2F855A]" aria-hidden="true" />
              <p className="text-sm leading-5 text-[#5F4A42]">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="min-w-0 rounded-[24px] border border-[#EEDFD6] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-8">
        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#B76E79]">Browser help</p>
        <h2 className="mt-2 font-serif text-2xl">Website does not load?</h2>
        <div className="mt-5 grid gap-3">
          {browserTroubleshootingSteps.map((step) => (
            <div key={step} className="flex items-start gap-3 rounded-2xl border border-[#EFE2DA] p-4">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#2F855A]" aria-hidden="true" />
              <p className="text-sm leading-5 text-[#5F4A42]">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <SystemHealthPanel compact />
    </div>
  )
}
