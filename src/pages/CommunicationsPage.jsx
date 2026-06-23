import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageSquareText, Search, Copy, CheckCircle2 } from 'lucide-react'
import { useActiveEvent } from '../events/useActiveEvent'
import { subscribeToRegistrations } from '../services/registrationService'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import { 
  COMMUNICATION_TEMPLATES, 
  extractAvailableGroups, 
  filterCommunicationsRegistrations, 
  buildCommunicationsExport 
} from '../utils/communicationsUtils'
import { buildRegistrationMetrics } from '../utils/registrationMetrics'

export function CommunicationsPage() {
  const { activeEvent } = useActiveEvent()
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    paymentStatus: 'all',
    checkInStatus: 'all',
    ticketStatus: 'all',
    groupName: '',
  })

  const [selectedTemplate, setSelectedTemplate] = useState(COMMUNICATION_TEMPLATES[0].id)
  const [draftContent, setDraftContent] = useState(COMMUNICATION_TEMPLATES[0].content)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!activeEvent?.eventId) {
      setLoading(false)
      return
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

  if (!activeEvent?.eventId) {
    return (
      <EmptyState
        icon={MessageSquareText}
        title="No selected event"
        description="Select an event from Events or the dashboard before preparing communications."
        action={(
          <Link to="/events" className="mt-6 inline-block rounded-xl bg-[#B76E79] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#A9606B]">
            Choose an event
          </Link>
        )}
      />
    )
  }

  if (loading) return <LoadingState message="Loading registrations…" />
  if (loadError) return <ErrorState message={loadError} onRetry={() => window.location.reload()} />

  const availableGroups = extractAvailableGroups(registrations)
  const filteredRegistrations = filterCommunicationsRegistrations(registrations, filters, searchQuery)
  const metrics = buildRegistrationMetrics(filteredRegistrations, activeEvent)
  const finalExportText = buildCommunicationsExport(filteredRegistrations, draftContent, activeEvent)

  function handleTemplateChange(templateId) {
    setSelectedTemplate(templateId)
    const template = COMMUNICATION_TEMPLATES.find((t) => t.id === templateId)
    if (template) {
      setDraftContent(template.content)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(finalExportText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Failed to copy', err)
      alert('Failed to copy to clipboard')
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-3xl text-[#2B1723]">Communications</h2>
          <p className="mt-2 text-sm text-[#816D62]">
            Prepare copy-ready messages for <strong>{activeEvent.eventName}</strong>
          </p>
        </div>
      </header>

      <div className="rounded-xl border border-[#EFE2DA] bg-[#FFF8F2] px-4 py-3 text-sm text-[#8A7468]">
        <strong>Safety Notice:</strong> This page prepares copy-ready drafts only. It does not send messages automatically.
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-4">
          <section className="rounded-2xl border border-[#EEDFD6] bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-bold text-[#2B1723]">Guest Segment</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="search" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#A48A7B]">
                  Search Guest
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#B8A49A]" />
                  <input
                    id="search"
                    type="text"
                placeholder="Guest, buyer, attendee, email, ticket..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-[#E5D7CF] bg-white py-2 pl-9 pr-4 text-sm focus:border-[#B76E79] focus:outline-none focus:ring-2 focus:ring-[#B76E79]/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#A48A7B]">
                  Payment Status
                </label>
                <select
                  value={filters.paymentStatus}
                  onChange={(e) => setFilters(f => ({ ...f, paymentStatus: e.target.value }))}
                  className="w-full rounded-xl border border-[#E5D7CF] bg-white py-2 pl-3 pr-8 text-sm focus:border-[#B76E79] focus:outline-none focus:ring-2 focus:ring-[#B76E79]/20"
                >
                  <option value="all">All Payments</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="complimentary">Complimentary</option>
                  <option value="door">Door</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#A48A7B]">
                  Check-in Status
                </label>
                <select
                  value={filters.checkInStatus}
                  onChange={(e) => setFilters(f => ({ ...f, checkInStatus: e.target.value }))}
                  className="w-full rounded-xl border border-[#E5D7CF] bg-white py-2 pl-3 pr-8 text-sm focus:border-[#B76E79] focus:outline-none focus:ring-2 focus:ring-[#B76E79]/20"
                >
                  <option value="all">All Guests</option>
                  <option value="checked-in">Checked In</option>
                  <option value="not-checked-in">Not Checked In</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#A48A7B]">
                  Ticket Status
                </label>
                <select
                  value={filters.ticketStatus}
                  onChange={(e) => setFilters(f => ({ ...f, ticketStatus: e.target.value }))}
                  className="w-full rounded-xl border border-[#E5D7CF] bg-white py-2 pl-3 pr-8 text-sm focus:border-[#B76E79] focus:outline-none focus:ring-2 focus:ring-[#B76E79]/20"
                >
                  <option value="all">All Statuses</option>
                  <option value="assigned">Ticket Assigned</option>
                  <option value="not-assigned">No Ticket Assigned</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#A48A7B]">
                  Group Name
                </label>
                <input
                  type="text"
                  placeholder="Search group..."
                  value={filters.groupName}
                  onChange={(e) => setFilters(f => ({ ...f, groupName: e.target.value }))}
                  list="groups-list"
                  className="w-full rounded-xl border border-[#E5D7CF] bg-white py-2 px-3 text-sm focus:border-[#B76E79] focus:outline-none focus:ring-2 focus:ring-[#B76E79]/20"
                />
                <datalist id="groups-list">
                  {availableGroups.map((g) => <option key={g} value={g} />)}
                </datalist>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#EEDFD6] bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-bold text-[#2B1723]">Segment Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#EFE2DA] bg-[#FBF8F5] p-3">
                <div className="text-2xl font-serif text-[#2B1723]">{metrics.totalRegistrations}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A7468]">Registrations</div>
              </div>
              <div className="rounded-xl border border-[#EFE2DA] bg-[#FBF8F5] p-3">
                <div className="text-2xl font-serif text-[#2B1723]">{metrics.totalPersons}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#8A7468]">Persons</div>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 text-sm text-[#5D4A52]">
              <div className="flex justify-between">
                <span>Paid / Pending</span>
                <span className="font-medium text-[#2B1723]">{metrics.paidRegistrations} / {metrics.pendingRegistrations}</span>
              </div>
              <div className="flex justify-between">
                <span>Complimentary / Door</span>
                <span className="font-medium text-[#2B1723]">{metrics.complimentaryRegistrations} / {metrics.doorRegistrations}</span>
              </div>
              <div className="flex justify-between">
                <span>Missing ticket codes</span>
                <span className="font-medium text-[#2B1723]">{metrics.missingTicketRegistrations}</span>
              </div>
              <div className="flex justify-between">
                <span>Checked In</span>
                <span className="font-medium text-[#2B1723]">{metrics.checkedInRegistrations}</span>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6 lg:col-span-8">
          <section className="rounded-2xl border border-[#EEDFD6] bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-bold text-[#2B1723]">Message Template</h3>
            
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#A48A7B]">
                Starter Template
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full rounded-xl border border-[#E5D7CF] bg-white py-2 pl-3 pr-8 text-sm font-medium focus:border-[#B76E79] focus:outline-none focus:ring-2 focus:ring-[#B76E79]/20"
              >
                {COMMUNICATION_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#A48A7B]">
                Editable Draft
              </label>
              <textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                rows={5}
                className="w-full resize-y rounded-xl border border-[#E5D7CF] bg-white p-3 text-sm focus:border-[#B76E79] focus:outline-none focus:ring-2 focus:ring-[#B76E79]/20"
                placeholder="Write your message here..."
              />
              <p className="mt-2 text-xs text-[#8A7468]">
                Placeholders: {'{{guestName}}'}, {'{{buyerName}}'}, {'{{attendeeNames}}'}, {'{{eventName}}'}, {'{{ticketCode}}'}, {'{{paymentStatus}}'}, {'{{personsAttending}}'}, {'{{groupName}}'}, {'{{eventDate}}'}, {'{{eventTime}}'}, {'{{venue}}'}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-[#EEDFD6] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-[#2B1723]">Copy-Ready Output</h3>
              <button
                type="button"
                onClick={handleCopy}
                disabled={filteredRegistrations.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2B1723] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#160B12] disabled:opacity-50"
              >
                {copied ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
                {copied ? 'Copied to Clipboard' : 'Copy Full Packet'}
              </button>
            </div>

            {filteredRegistrations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#E5D7CF] p-8 text-center text-sm text-[#8A7468]">
                No guests match your segment filters.
              </div>
            ) : (
              <pre className="max-h-[400px] overflow-auto rounded-xl border border-[#EFE2DA] bg-[#FBF8F5] p-4 text-[13px] leading-relaxed text-[#2B1723] whitespace-pre-wrap font-mono">
                {finalExportText}
              </pre>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
