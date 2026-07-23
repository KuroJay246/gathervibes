import { useMemo, useState } from 'react'
import { CheckCircle2, PencilLine, Plus, ReceiptText, Search, Trash2 } from 'lucide-react'
import {
  buildPartnerSummary,
  createEmptyPartner,
  hydrateEventForPlanning,
  PARTNER_STATUS_OPTIONS,
  PARTNER_TYPE_OPTIONS,
  SPONSOR_TYPE_OPTIONS,
} from '../../utils/eventPlanning'
import { formatCurrency, formatPaymentMethod } from '../../utils/financeUtils'
import { validatePartnerRecord } from '../../utils/validators'

function SummaryCard({ label, value, detail }) {
  return (
    <div className="rounded-xl border border-[#EEDFD6] bg-white p-4">
      <p className="text-lg font-bold text-[#2B1723]">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#80685B]">{label}</p>
      {detail && <p className="mt-2 text-xs leading-5 text-[#816D62]">{detail}</p>}
    </div>
  )
}

function partnerTypeLabel(recordType) {
  return PARTNER_TYPE_OPTIONS.find(([value]) => value === recordType)?.[1] || 'Contact'
}

export function PartnerCommitmentsPanel({ event, onSaveRecord, onDeleteRecord }) {
  const hydratedEvent = useMemo(() => hydrateEventForPlanning(event), [event])
  const [partnerForm, setPartnerForm] = useState(createEmptyPartner())
  const [partnerErrors, setPartnerErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [recordTypeFilter, setRecordTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const summary = useMemo(() => buildPartnerSummary(hydratedEvent.partnerRecords), [hydratedEvent.partnerRecords])

  const visibleRecords = useMemo(() => hydratedEvent.partnerRecords.filter((record) => {
    if (recordTypeFilter !== 'all' && record.recordType !== recordTypeFilter) return false
    if (statusFilter !== 'all' && record.status !== statusFilter) return false
    if (!search.trim()) return true
    const query = search.trim().toLowerCase()
    return [
      record.name,
      record.company,
      record.role,
      record.service,
      record.email,
      record.phone,
      record.notes,
      record.evidence,
      record.itemOrService,
    ].some((value) => String(value || '').toLowerCase().includes(query))
  }), [hydratedEvent.partnerRecords, recordTypeFilter, search, statusFilter])

  async function handleSave(submitEvent) {
    submitEvent.preventDefault()
    const errors = validatePartnerRecord(partnerForm)
    setPartnerErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    setMessage('')
    try {
      await onSaveRecord(partnerForm)
      setMessage(partnerForm.partnerId ? 'Record updated.' : 'Record added.')
      setPartnerForm(createEmptyPartner())
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(record) {
    if (!window.confirm(`Remove ${record.name} from ${event.eventName}?`)) return
    setSaving(true)
    setMessage('')
    try {
      await onDeleteRecord(record.partnerId)
      setMessage('Record removed.')
      if (partnerForm.partnerId === record.partnerId) setPartnerForm(createEmptyPartner())
    } finally {
      setSaving(false)
    }
  }

  const sponsorRecord = partnerForm.recordType === 'sponsor'

  return (
    <section className="space-y-6">
      <section className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Partners and commitments</p>
            <h3 className="mt-2 font-serif text-2xl text-[#2B1723]">Bakers, vendors, suppliers, sponsors, venue contacts, and helpers</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#816D62]">
              Keep planning contacts and event commitments here. Use Operations ledger entries below for settled event money and final adjustments.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label="Partner records" value={summary.totalRecords} />
          <SummaryCard label="Confirmed sponsor cash" value={formatCurrency(summary.confirmedCashSponsors)} />
          <SummaryCard label="In-kind support value" value={formatCurrency(summary.inKindEstimatedValue)} />
          <SummaryCard label="Outstanding balance" value={formatCurrency(summary.outstandingBalance)} />
          <SummaryCard label="Baker balance" value={formatCurrency(hydratedEvent.partnerRecords.filter((record) => record.recordType === 'baker').reduce((sum, record) => sum + (record.balance || 0), 0))} detail="Only the remaining baker commitment balance" />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={handleSave} className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">{partnerForm.partnerId ? 'Edit record' : 'Add contact or commitment'}</p>
              <h3 className="mt-2 font-serif text-2xl text-[#2B1723]">{partnerForm.partnerId ? 'Update this record' : 'Create a planning record'}</h3>
            </div>
            {partnerForm.partnerId && (
              <button type="button" onClick={() => setPartnerForm(createEmptyPartner())} className="rounded-xl border border-[#E7D6CC] bg-white px-3 py-2 text-xs font-bold text-[#5A443B]">
                Cancel edit
              </button>
            )}
          </div>

          {message && (
            <div className="mt-4 rounded-xl border border-[#CFE8D8] bg-[#E5F3EC] px-4 py-3 text-sm text-[#1E7345]">
              {message}
            </div>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="partner-record-type" className="event-label">Record type</label>
              <select id="partner-record-type" value={partnerForm.recordType} onChange={(changeEvent) => setPartnerForm((current) => ({ ...current, recordType: changeEvent.target.value }))} className="event-input">
                {PARTNER_TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="partner-status" className="event-label">Status</label>
              <select id="partner-status" value={partnerForm.status} onChange={(changeEvent) => setPartnerForm((current) => ({ ...current, status: changeEvent.target.value }))} className="event-input">
                {PARTNER_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="partner-name" className="event-label">Name</label>
              <input id="partner-name" value={partnerForm.name} onChange={(changeEvent) => setPartnerForm((current) => ({ ...current, name: changeEvent.target.value }))} className="event-input" placeholder="Person name" />
              {partnerErrors.name && <p className="mt-1 text-[11px] font-medium text-[#C53030]">{partnerErrors.name}</p>}
            </div>
            <div>
              <label htmlFor="partner-company" className="event-label">Company</label>
              <input id="partner-company" value={partnerForm.company} onChange={(changeEvent) => setPartnerForm((current) => ({ ...current, company: changeEvent.target.value }))} className="event-input" placeholder="Company or organization" />
            </div>
            <div>
              <label htmlFor="partner-role" className="event-label">Role</label>
              <input id="partner-role" value={partnerForm.role} onChange={(changeEvent) => setPartnerForm((current) => ({ ...current, role: changeEvent.target.value }))} className="event-input" placeholder="Vendor owner, venue manager, helper..." />
            </div>
            <div>
              <label htmlFor="partner-service" className="event-label">Service or contribution</label>
              <input id="partner-service" value={partnerForm.service} onChange={(changeEvent) => setPartnerForm((current) => ({ ...current, service: changeEvent.target.value }))} className="event-input" placeholder="Cakes, decor, rentals, sponsorship..." />
            </div>
            <div>
              <label htmlFor="partner-email" className="event-label">Email</label>
              <input id="partner-email" value={partnerForm.email} onChange={(changeEvent) => setPartnerForm((current) => ({ ...current, email: changeEvent.target.value }))} className="event-input" placeholder="Email address" />
            </div>
            <div>
              <label htmlFor="partner-phone" className="event-label">Phone</label>
              <input id="partner-phone" value={partnerForm.phone} onChange={(changeEvent) => setPartnerForm((current) => ({ ...current, phone: changeEvent.target.value }))} className="event-input" placeholder="Phone number" />
            </div>

            {sponsorRecord ? (
              <>
                <div>
                  <label htmlFor="partner-sponsor-type" className="event-label">Sponsor type</label>
                  <select id="partner-sponsor-type" value={partnerForm.sponsorType} onChange={(changeEvent) => setPartnerForm((current) => ({ ...current, sponsorType: changeEvent.target.value }))} className="event-input">
                    {SPONSOR_TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="partner-follow-up-date" className="event-label">Follow-up date</label>
                  <input id="partner-follow-up-date" type="date" value={partnerForm.followUpDate} onChange={(changeEvent) => setPartnerForm((current) => ({ ...current, followUpDate: changeEvent.target.value }))} className="event-input" />
                </div>
                <div>
                  <label htmlFor="partner-requested-amount" className="event-label">Requested amount</label>
                  <input id="partner-requested-amount" type="number" min="0" step="0.01" value={partnerForm.requestedAmount} onChange={(changeEvent) => setPartnerForm((current) => ({ ...current, requestedAmount: changeEvent.target.value }))} className="event-input" placeholder="0.00" />
                </div>
                <div>
                  <label htmlFor="partner-confirmed-cash-amount" className="event-label">Confirmed cash amount</label>
                  <input id="partner-confirmed-cash-amount" type="number" min="0" step="0.01" value={partnerForm.confirmedCashAmount} onChange={(changeEvent) => setPartnerForm((current) => ({ ...current, confirmedCashAmount: changeEvent.target.value }))} className="event-input" placeholder="0.00" />
                </div>
                {partnerForm.sponsorType === 'in-kind' && (
                  <>
                    <div>
                      <label htmlFor="partner-item-or-service" className="event-label">Item or service</label>
                      <input id="partner-item-or-service" value={partnerForm.itemOrService} onChange={(changeEvent) => setPartnerForm((current) => ({ ...current, itemOrService: changeEvent.target.value }))} className="event-input" placeholder="Cake boxes, drinks, decor..." />
                    </div>
                    <div>
                      <label htmlFor="partner-quantity" className="event-label">Quantity</label>
                      <input id="partner-quantity" value={partnerForm.quantity} onChange={(changeEvent) => setPartnerForm((current) => ({ ...current, quantity: changeEvent.target.value }))} className="event-input" placeholder="12 boxes, 2 banners..." />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="partner-estimated-value" className="event-label">Estimated value</label>
                      <input id="partner-estimated-value" type="number" min="0" step="0.01" value={partnerForm.estimatedValue} onChange={(changeEvent) => setPartnerForm((current) => ({ ...current, estimatedValue: changeEvent.target.value }))} className="event-input" placeholder="0.00" />
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="partner-agreed-amount" className="event-label">Agreed amount</label>
                  <input id="partner-agreed-amount" type="number" min="0" step="0.01" value={partnerForm.agreedAmount} onChange={(changeEvent) => setPartnerForm((current) => ({ ...current, agreedAmount: changeEvent.target.value }))} className="event-input" placeholder="0.00" />
                </div>
                <div>
                  <label htmlFor="partner-amount-paid" className="event-label">Amount paid</label>
                  <input id="partner-amount-paid" type="number" min="0" step="0.01" value={partnerForm.amountPaid} onChange={(changeEvent) => setPartnerForm((current) => ({ ...current, amountPaid: changeEvent.target.value }))} className="event-input" placeholder="0.00" />
                </div>
                <div>
                  <label htmlFor="partner-due-date" className="event-label">Due date</label>
                  <input id="partner-due-date" type="date" value={partnerForm.dueDate} onChange={(changeEvent) => setPartnerForm((current) => ({ ...current, dueDate: changeEvent.target.value }))} className="event-input" />
                </div>
                <div>
                  <label htmlFor="partner-payment-date" className="event-label">Payment date</label>
                  <input id="partner-payment-date" type="date" value={partnerForm.paymentDate} onChange={(changeEvent) => setPartnerForm((current) => ({ ...current, paymentDate: changeEvent.target.value }))} className="event-input" />
                </div>
                <div>
                  <label htmlFor="partner-payment-method" className="event-label">Payment method</label>
                  <select id="partner-payment-method" value={partnerForm.paymentMethod} onChange={(changeEvent) => setPartnerForm((current) => ({ ...current, paymentMethod: changeEvent.target.value }))} className="event-input">
                    <option value="unknown">Unknown</option>
                    <option value="cash">Cash</option>
                    <option value="bank-transfer">Bank transfer</option>
                    <option value="firstpay">CIBC 1stPay</option>
                    <option value="card">Card</option>
                  </select>
                </div>
              </>
            )}

            <div className="sm:col-span-2">
              <label htmlFor="partner-evidence" className="event-label">Evidence or receipt</label>
              <input id="partner-evidence" value={partnerForm.evidence} onChange={(changeEvent) => setPartnerForm((current) => ({ ...current, evidence: changeEvent.target.value }))} className="event-input" placeholder="Receipt reference, invoice note, sponsor proof..." />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="partner-notes" className="event-label">Notes</label>
              <textarea id="partner-notes" value={partnerForm.notes} onChange={(changeEvent) => setPartnerForm((current) => ({ ...current, notes: changeEvent.target.value }))} className="event-input resize-y" rows={3} placeholder="Anything the organizer should remember about this contact or commitment." />
            </div>
          </div>

          <div className="mt-4">
            <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#2B1723] px-4 text-xs font-bold text-white disabled:opacity-50">
              <Plus className="size-4" />
              {partnerForm.partnerId ? 'Save record' : 'Add record'}
            </button>
          </div>
        </form>

        <section className="rounded-[24px] border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9A5260]">Current records</p>
              <h3 className="mt-2 font-serif text-2xl text-[#2B1723]">Contact and commitment list</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#B8A49A]" />
                <input aria-label="Search partner records" value={search} onChange={(changeEvent) => setSearch(changeEvent.target.value)} placeholder="Search name, service, note..." className="rounded-xl border border-[#E5D7CF] py-2 pl-9 pr-3 text-xs font-bold" />
              </label>
              <select aria-label="Partner type filter" value={recordTypeFilter} onChange={(changeEvent) => setRecordTypeFilter(changeEvent.target.value)} className="rounded-xl border border-[#E5D7CF] px-3 py-2 text-xs font-bold text-[#5A443B]">
                <option value="all">All types</option>
                {PARTNER_TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select aria-label="Partner status filter" value={statusFilter} onChange={(changeEvent) => setStatusFilter(changeEvent.target.value)} className="rounded-xl border border-[#E5D7CF] px-3 py-2 text-xs font-bold text-[#5A443B]">
                <option value="all">All statuses</option>
                {PARTNER_STATUS_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
          </div>

          {visibleRecords.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-[#EEDFD6] bg-[#FFF8F2] p-6 text-sm leading-6 text-[#816D62]">
              No contacts or commitments match the current filters.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {visibleRecords.map((record) => (
                <div key={record.partnerId} className="rounded-2xl border border-[#EFE2DA] bg-[#FBF8F5] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-[#2B1723]">{record.name}</p>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6B564C]">{partnerTypeLabel(record.recordType)}</span>
                        <span className="rounded-full bg-[#FCEEF1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8A3F4B]">{record.status}</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[#816D62]">
                        {[record.company, record.role, record.service].filter(Boolean).join(' · ') || 'No service details yet'}
                      </p>
                      {(record.phone || record.email) && (
                        <p className="mt-2 text-xs leading-5 text-[#816D62]">{[record.phone, record.email].filter(Boolean).join(' · ')}</p>
                      )}
                      {record.recordType === 'sponsor' ? (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <SummaryCard label="Requested" value={formatCurrency(record.requestedAmount)} />
                          <SummaryCard label={record.sponsorType === 'cash' ? 'Confirmed cash' : 'Estimated value'} value={formatCurrency(record.sponsorType === 'cash' ? record.confirmedCashAmount : record.estimatedValue)} />
                        </div>
                      ) : (
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          <SummaryCard label="Agreed" value={formatCurrency(record.agreedAmount)} />
                          <SummaryCard label="Paid" value={formatCurrency(record.amountPaid)} />
                          <SummaryCard label="Balance" value={formatCurrency(record.balance)} />
                        </div>
                      )}
                      <div className="mt-3 text-xs leading-5 text-[#816D62]">
                        {record.dueDate && <p>Due: {record.dueDate}</p>}
                        {record.paymentDate && <p>Payment date: {record.paymentDate}</p>}
                        {record.paymentMethod && record.recordType !== 'sponsor' && <p>Payment method: {formatPaymentMethod(record.paymentMethod)}</p>}
                        {record.followUpDate && <p>Follow-up: {record.followUpDate}</p>}
                        {record.evidence && <p>Evidence: {record.evidence}</p>}
                        {record.notes && <p className="mt-1">{record.notes}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setPartnerForm(record)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-3 text-xs font-bold text-[#5A443B]">
                        <PencilLine className="size-3.5" />
                        Edit
                      </button>
                      {record.recordType === 'baker' && (record.balance || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => setPartnerForm({
                            ...record,
                            status: 'Paid',
                            amountPaid: String(record.agreedAmount ?? record.amountPaid ?? ''),
                            paymentDate: new Date().toISOString().slice(0, 10),
                          })}
                          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#1E7345] px-3 text-xs font-bold text-white"
                        >
                          <CheckCircle2 className="size-3.5" />
                          Record payment
                        </button>
                      )}
                      <button type="button" onClick={() => void handleDelete(record)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#F2C3C3] bg-white px-3 text-xs font-bold text-[#A32626]">
                        <Trash2 className="size-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>

      <div className="rounded-2xl border border-[#E6D4B4] bg-[#FFF8EA] p-4 text-sm leading-6 text-[#715D46]">
        <ReceiptText className="mb-2 size-4 text-[#7A5818]" />
        Requested sponsorship does not count as confirmed income. Record actual event money in the Operations ledger only when cash or expenses have really been received, paid, or committed there.
      </div>
    </section>
  )
}
