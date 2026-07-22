import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Copy, MessageSquareText, Search } from 'lucide-react'
import { useActiveEvent } from '../events/useActiveEvent'
import { subscribeToRegistrations } from '../services/registrationService'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import {
  COMMUNICATION_SEGMENTS,
  COMMUNICATION_TEMPLATES,
  buildCommunicationMessages,
  buildCommunicationsCsvPacket,
  buildCommunicationsExport,
  buildCommunicationsSegmentSummary,
  buildRecipientList,
  extractAvailableGroups,
  filterCommunicationsRegistrations,
} from '../utils/communicationsUtils'
import { formatCurrency } from '../utils/financeUtils'

function SummaryCard({ label, value, detail }) {
  return (
    <div className="rounded-xl border border-[#EFE2DA] bg-[#FBF8F5] p-3">
      <div className="text-2xl font-serif text-[#2B1723]">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#80685B]">{label}</div>
      {detail && <div className="mt-1 text-[11px] text-[#80685B]">{detail}</div>}
    </div>
  )
}

function Section({ eyebrow, title, children }) {
  return (
    <section className="rounded-2xl border border-[#EEDFD6] bg-white p-5 shadow-sm">
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#9A5260]">{eyebrow}</p>
      <h3 className="mt-1 font-bold text-[#2B1723]">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function CommunicationsPage() {
  const { activeEvent } = useActiveEvent()
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    paymentStatus: 'all',
    financeSegment: 'all',
    checkInStatus: 'all',
    ticketStatus: 'all',
    contactSegment: 'all',
    groupName: '',
  })
  const [selectedTemplate, setSelectedTemplate] = useState(COMMUNICATION_TEMPLATES[0].id)
  const [draftContent, setDraftContent] = useState(COMMUNICATION_TEMPLATES[0].content)
  const [copiedAction, setCopiedAction] = useState('')
  const [labMode, setLabMode] = useState('standard') // 'standard' or 'prompt'
  const [selectedTone, setSelectedTone] = useState('Professional')

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!activeEvent?.eventId) {
      setLoading(false)
      return undefined
    }

    setLoading(true)
    setLoadError('')

    const unsubscribe = subscribeToRegistrations(
      activeEvent.eventId,
      (data) => {
        setRegistrations(data)
        setLoading(false)
      },
      (err) => {
        if (import.meta.env.DEV) console.error('Registration fetch error:', err)
        setLoadError('Could not load registrations. Please try again later.')
        setLoading(false)
      },
    )

    return () => unsubscribe()
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [activeEvent?.eventId])

  const availableGroups = useMemo(() => extractAvailableGroups(registrations), [registrations])
  const filteredRegistrations = useMemo(
    () => filterCommunicationsRegistrations(registrations, filters, searchQuery, activeEvent),
    [activeEvent, filters, registrations, searchQuery],
  )
  const summary = useMemo(() => buildCommunicationsSegmentSummary(filteredRegistrations, activeEvent), [activeEvent, filteredRegistrations])
  const messages = useMemo(() => buildCommunicationMessages(filteredRegistrations, draftContent, activeEvent), [activeEvent, draftContent, filteredRegistrations])
  const finalExportText = useMemo(() => buildCommunicationsExport(filteredRegistrations, draftContent, activeEvent), [activeEvent, draftContent, filteredRegistrations])
  const recipientList = useMemo(() => buildRecipientList(filteredRegistrations), [filteredRegistrations])
  const csvPacket = useMemo(() => buildCommunicationsCsvPacket(filteredRegistrations, draftContent, activeEvent), [activeEvent, draftContent, filteredRegistrations])
  const firstMessage = messages[0]

  if (!activeEvent?.eventId) {
    return (
      <EmptyState
        icon={MessageSquareText}
        title="No selected event"
        description="Select an event from Events or the dashboard before preparing communications."
        action={(
          <Link to="/events" className="mt-6 inline-block rounded-xl bg-[#9A5260] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#A9606B]">
            Choose an event
          </Link>
        )}
      />
    )
  }

  if (loading) return <LoadingState message="Loading registrations…" />
  if (loadError) return <ErrorState message={loadError} onRetry={() => window.location.reload()} />

  function handleTemplateChange(templateId) {
    setSelectedTemplate(templateId)
    const template = COMMUNICATION_TEMPLATES.find((item) => item.id === templateId)
    if (template) setDraftContent(template.content)
  }

  async function copyText(label, text) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedAction(label)
      window.setTimeout(() => setCopiedAction(''), 2000)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to copy', err)
      alert('Failed to copy to clipboard')
    }
  }

  const aiPromptText = `Write a ${selectedTone.toLowerCase()} message for this event using the details below.
Draft type: ${COMMUNICATION_TEMPLATES.find(t => t.id === selectedTemplate)?.label || 'Message'}
Event Name: ${activeEvent?.eventName || 'Gather & Savor Event'}
Event Date: ${activeEvent?.eventDate || 'TBD'}
Location: ${activeEvent?.location || 'TBD'}

Include placeholders like {{guestName}}, {{balanceDue}}, {{ticketCode}} where appropriate so I can bulk-replace them in my tool.

Data context for this segment:
- Total recipients: ${summary.totalRegistrations}
- Outstanding balance for segment: ${formatCurrency(summary.finance.totalOutstanding)}`

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#9A5260]">Message Builder</p>
          <h2 className="mt-1 font-serif text-3xl text-[#2B1723]">Create Message</h2>
          <p className="mt-2 text-sm text-[#816D62]">
            Create, personalize, and copy event messages for <strong>{activeEvent.eventName}</strong>. Messages are not sent automatically.
          </p>
        </div>
      </header>

      <div className="rounded-xl border border-[#EFE2DA] bg-[#FFF8F2] px-4 py-3 text-sm text-[#80685B]">
        <strong>Copy-only:</strong> This page prepares text for clipboard copy. It does not send email or WhatsApp messages, write delivery logs, or connect to an AI API.
        <span className="mt-1 block text-xs">Use segments to choose recipients; buyer/contact can be different from attendee names, Door Paid is not the same as To Pay at Door, and historical finance limitations stay out of active reminder audiences.</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-4">
          <Section eyebrow="Recipients" title="Choose recipients">
            <div className="space-y-4">
              <div>
                <label htmlFor="search" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#80685B]">Search Guest</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#B8A49A]" />
                  <input
                    id="search"
                    type="text"
                    placeholder="Guest, buyer, attendee, email, ticket..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full rounded-xl border border-[#E5D7CF] bg-white py-2 pl-9 pr-4 text-sm focus:border-[#9A5260] focus:outline-none focus:ring-2 focus:ring-[#9A5260]/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#80685B]">Payment</label>
                <select aria-label="Payment segment filter" value={filters.paymentStatus} onChange={(event) => setFilters((current) => ({ ...current, paymentStatus: event.target.value }))} className="w-full rounded-xl border border-[#E5D7CF] bg-white py-2 pl-3 pr-8 text-sm">
                  <option value="all">All payments</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="door">Door</option>
                  <option value="complimentary">Complimentary</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#80685B]">Finance Segment</label>
                <select aria-label="Finance segment filter" value={filters.financeSegment} onChange={(event) => setFilters((current) => ({ ...current, financeSegment: event.target.value }))} className="w-full rounded-xl border border-[#E5D7CF] bg-white py-2 pl-3 pr-8 text-sm">
                  {COMMUNICATION_SEGMENTS.finance.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#80685B]">Ticket Segment</label>
                <select aria-label="Ticket segment filter" value={filters.ticketStatus} onChange={(event) => setFilters((current) => ({ ...current, ticketStatus: event.target.value }))} className="w-full rounded-xl border border-[#E5D7CF] bg-white py-2 pl-3 pr-8 text-sm">
                  {COMMUNICATION_SEGMENTS.ticket.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#80685B]">Attendance</label>
                <select aria-label="Attendance segment filter" value={filters.checkInStatus} onChange={(event) => setFilters((current) => ({ ...current, checkInStatus: event.target.value }))} className="w-full rounded-xl border border-[#E5D7CF] bg-white py-2 pl-3 pr-8 text-sm">
                  <option value="all">All guests</option>
                  <option value="checked-in">Checked in</option>
                  <option value="not-checked-in">Not checked in</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#80685B]">Guest / Contact</label>
                <select aria-label="Guest or contact segment filter" value={filters.contactSegment} onChange={(event) => setFilters((current) => ({ ...current, contactSegment: event.target.value }))} className="w-full rounded-xl border border-[#E5D7CF] bg-white py-2 pl-3 pr-8 text-sm">
                  {COMMUNICATION_SEGMENTS.contact.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#80685B]">Group Name</label>
                <input
                  type="text"
                  placeholder="Search group..."
                  value={filters.groupName}
                  onChange={(event) => setFilters((current) => ({ ...current, groupName: event.target.value }))}
                  list="groups-list"
                  className="w-full rounded-xl border border-[#E5D7CF] bg-white px-3 py-2 text-sm"
                />
                <datalist id="groups-list">{availableGroups.map((group) => <option key={group} value={group} />)}</datalist>
              </div>
            </div>
          </Section>

          <Section eyebrow="Contact List" title="Segment summary">
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard label="Registrations" value={summary.totalRegistrations} />
              <SummaryCard label="Persons" value={summary.totalPersons} />
              <SummaryCard label="Missing email/phone" value={summary.missingEmailOrPhone} />
              <SummaryCard label="Missing tickets" value={summary.missingTicket} />
              <SummaryCard label="Outstanding" value={summary.outstandingBalance} detail={formatCurrency(summary.finance.totalOutstanding)} />
              <SummaryCard label="Collected" value={formatCurrency(summary.finance.totalCollected)} />
            </div>
          </Section>
        </div>

        <div className="space-y-6 lg:col-span-8">
          <Section eyebrow="Templates" title={labMode === 'standard' ? 'Template Library' : 'Message Prompt Builder'}>
            <div className="mb-6 flex overflow-hidden rounded-xl border border-[#E5D7CF] bg-[#FBF8F5] p-1">
              <button
                type="button"
                onClick={() => setLabMode('standard')}
                className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${labMode === 'standard' ? 'bg-white text-[#2B1723] shadow-sm' : 'text-[#80685B] hover:bg-white/50'}`}
              >
                Standard Templates
              </button>
              <button
                type="button"
                onClick={() => setLabMode('ai')}
                className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${labMode === 'ai' ? 'bg-white text-[#9A5260] shadow-sm' : 'text-[#80685B] hover:bg-white/50'}`}
              >
                Prompt Builder
              </button>
            </div>

            {labMode === 'ai' && (
              <div className="mb-6 grid gap-4 md:grid-cols-2 rounded-xl border border-[#E5D7CF] bg-white p-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#80685B]">Select Tone</label>
                  <select aria-label="Drafting tone" value={selectedTone} onChange={(event) => setSelectedTone(event.target.value)} className="w-full rounded-xl border border-[#E5D7CF] bg-[#FBF8F5] py-2 pl-3 pr-8 text-sm">
                    {['Professional', 'Warm', 'Friendly', 'Urgent but polite', 'Short WhatsApp style', 'Formal email', 'Social media caption', 'Luxury/event brand tone'].map((tone) => (
                      <option key={tone} value={tone}>{tone}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button type="button" onClick={() => copyText('ai-prompt', aiPromptText)} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#2B1723] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#3D2232]">
                    {copiedAction === 'ai-prompt' ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
                    Copy prompt for drafting
                  </button>
                </div>
                <div className="col-span-full">
                  <p className="text-xs text-[#80685B]">
                    This helper only builds a prompt you can copy into your own drafting tool. It does not generate text inside the app.
                  </p>
                  <p className="mt-2 text-xs font-bold text-amber-700">
                    Review the prompt before pasting it into any external tool.
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#80685B]">{labMode === 'ai' ? 'Prompt starter' : 'Starter Template'}</label>
                <select aria-label={labMode === 'ai' ? 'Prompt starter' : 'Starter template'} value={selectedTemplate} onChange={(event) => handleTemplateChange(event.target.value)} className="w-full rounded-xl border border-[#E5D7CF] bg-white py-2 pl-3 pr-8 text-sm font-medium">
                  {COMMUNICATION_TEMPLATES.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}
                </select>
                <p className="mt-3 text-xs leading-5 text-[#80685B]">Available templates include payment reminder, balance due, door payment, payment received, ticket/QR reminder, check-in instructions, missing ticket follow-up, event reminder, group reminder, thank-you, post-event, and internal note.</p>
              </div>
              <div>
                <div className="flex justify-between items-end mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#80685B]">Editable Draft</label>
                  <button type="button" onClick={() => setDraftContent('')} className="text-[10px] font-bold text-[#8A3F4B] hover:underline">Clear Draft</button>
                </div>
                <textarea aria-label="Editable draft" value={draftContent} onChange={(event) => setDraftContent(event.target.value)} rows={6} className="w-full resize-y rounded-xl border border-[#E5D7CF] bg-white p-3 text-sm" />
                <p className="mt-2 text-[10px] leading-4 text-[#80685B]">
                  Placeholders: {'{{eventName}}'}, {'{{eventDate}}'}, {'{{eventTime}}'}, {'{{venue}}'}, {'{{buyerName}}'}, {'{{guestName}}'}, {'{{attendeeNames}}'}, {'{{groupName}}'}, {'{{ticketCode}}'}, {'{{paymentStatus}}'}, {'{{amountDue}}'}, {'{{amountPaid}}'}, {'{{balanceDue}}'}, {'{{paymentMethod}}'}, {'{{paymentReference}}'}
                </p>
              </div>
            </div>
          </Section>

          <Section eyebrow="Preview" title="Message preview and warnings">
            {firstMessage ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
                <pre className="max-h-72 overflow-auto rounded-xl border border-[#EFE2DA] bg-[#FBF8F5] p-4 text-[13px] leading-relaxed whitespace-pre-wrap text-[#2B1723]">{firstMessage.message}</pre>
                <div className="rounded-xl border border-[#EFE2DA] p-4">
                  <p className="text-sm font-bold text-[#2B1723]">{firstMessage.name}</p>
                  <p className="mt-1 break-all text-xs text-[#80685B]">{firstMessage.email || 'No email'} / {firstMessage.phone || 'No phone'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {firstMessage.warnings.length === 0 ? (
                      <span className="rounded-full bg-[#EAF6EF] px-3 py-1 text-[10px] font-bold uppercase text-[#2F855A]">No missing data</span>
                    ) : firstMessage.warnings.map((warning) => (
                      <span key={warning} className="rounded-full bg-[#FFF4DF] px-3 py-1 text-[10px] font-bold uppercase text-[#7A5818]">{warning}</span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#E5D7CF] p-8 text-center text-sm text-[#80685B]">No guests match your segment filters.</div>
            )}
          </Section>

          <Section eyebrow="Copy & Use" title="Copy one message, all messages, recipients, or CSV">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => copyText('one', firstMessage?.message || '')} disabled={!firstMessage} className="inline-flex items-center gap-2 rounded-xl bg-[#2B1723] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                {copiedAction === 'one' ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
                Copy One Message
              </button>
              <button type="button" onClick={() => copyText('all', finalExportText)} disabled={filteredRegistrations.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-[#2B1723] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                {copiedAction === 'all' ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
                Copy All Messages
              </button>
              <button type="button" onClick={() => copyText('recipients', recipientList)} disabled={filteredRegistrations.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-4 py-2 text-xs font-bold text-[#6B564C] disabled:opacity-50">
                {copiedAction === 'recipients' ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
                Copy Recipient List
              </button>
              <button type="button" onClick={() => copyText('csv', csvPacket)} disabled={filteredRegistrations.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-4 py-2 text-xs font-bold text-[#6B564C] disabled:opacity-50">
                {copiedAction === 'csv' ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
                Copy CSV Packet
              </button>
            </div>

            <pre className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-[#EFE2DA] bg-[#23131C] p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-[#FFF8F2]">
              {filteredRegistrations.length === 0 ? 'No guests match your segment filters.' : finalExportText}
            </pre>
          </Section>
        </div>
      </div>
    </div>
  )
}
