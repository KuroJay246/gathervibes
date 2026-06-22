import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clipboard, Database, ShieldCheck } from 'lucide-react'
import { collection, getDocs, limit, query } from 'firebase/firestore'
import { SystemHealthPanel } from '../components/SystemHealthPanel'
import { useActiveEvent } from '../events/useActiveEvent'
import { db } from '../lib/firebase'
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

function StatusBadge({ ok, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold ${ok ? 'bg-[#E7F6ED] text-[#2F855A]' : 'bg-[#FFF4DF] text-[#986F26]'}`}>
      {ok ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : <AlertTriangle className="size-3.5" aria-hidden="true" />}
      {children}
    </span>
  )
}

export function QaPage() {
  const { activeEvent } = useActiveEvent()
  const [events, setEvents] = useState([])
  const [auditStatus, setAuditStatus] = useState('checking')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
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
        <h2 className="mt-2 font-serif text-2xl">Use CODEX_TEST only</h2>
        <div className="mt-5 grid gap-3">
          {qaChecklist.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl border border-[#EFE2DA] p-4">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#2F855A]" aria-hidden="true" />
              <p className="text-sm leading-5 text-[#5F4A42]">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <SystemHealthPanel compact />
    </div>
  )
}
