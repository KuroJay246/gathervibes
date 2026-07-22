import { Search, X } from 'lucide-react'

export function RegistrationFilters({ filters, onFilterChange, onClearFilters }) {
  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value })
  }

  const inputClasses = "rounded-xl border border-[#E5D7CF] bg-white px-3 py-2 text-sm focus:border-[#9A5260] focus:outline-none focus:ring-1 focus:ring-[#9A5260]"
  const selectClasses = "rounded-xl border border-[#E5D7CF] bg-white px-3 py-2 text-sm focus:border-[#9A5260] focus:outline-none focus:ring-1 focus:ring-[#9A5260]"

  return (
    <div className="rounded-2xl border border-[#EEDFD6] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-bold text-[#2B1723]">Advanced Filters</h3>
          <p className="mt-1 text-xs leading-5 text-[#816D62]">
            Search buyer, guest, contact, group, ticket, payment, and review fields without covering the category tabs below.
          </p>
        </div>
        <button 
          type="button"
          onClick={onClearFilters}
          className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-[#80685B] hover:bg-[#F2E8E1] transition"
        >
          <X className="size-3" /> Clear filters
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#B8A49A]" />
          <input
            aria-label="Search keyword"
            type="text"
            placeholder="Search keyword..."
            value={filters.keyword || ''}
            onChange={(e) => handleChange('keyword', e.target.value)}
            className={`${inputClasses} w-full pl-9`}
          />
        </div>
        <input
          aria-label="Guest name"
          type="text"
          placeholder="Guest Name"
          value={filters.guestName || ''}
          onChange={(e) => handleChange('guestName', e.target.value)}
          className={inputClasses}
        />
        <input
          aria-label="Buyer or contact name"
          type="text"
          placeholder="Buyer / Contact"
          value={filters.buyerName || ''}
          onChange={(e) => handleChange('buyerName', e.target.value)}
          className={inputClasses}
        />
        <input
          aria-label="Attendee name"
          type="text"
          placeholder="Attendee Name"
          value={filters.attendeeName || ''}
          onChange={(e) => handleChange('attendeeName', e.target.value)}
          className={inputClasses}
        />
        <input
          aria-label="Email or phone"
          type="text"
          placeholder="Email / Phone"
          value={filters.contact || ''}
          onChange={(e) => handleChange('contact', e.target.value)}
          className={inputClasses}
        />
        <input
          aria-label="Group"
          type="text"
          placeholder="Group"
          value={filters.group || ''}
          onChange={(e) => handleChange('group', e.target.value)}
          className={inputClasses}
        />
        <input
          aria-label="Ticket code"
          type="text"
          placeholder="Ticket Code"
          value={filters.ticketCode || ''}
          onChange={(e) => handleChange('ticketCode', e.target.value)}
          className={inputClasses}
        />
        <input
          aria-label="Price tier"
          type="text"
          placeholder="Price Tier"
          value={filters.priceTier || ''}
          onChange={(e) => handleChange('priceTier', e.target.value)}
          className={inputClasses}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <select
          aria-label="Payment status filter"
          value={filters.paymentStatus || ''}
          onChange={(e) => handleChange('paymentStatus', e.target.value)}
          className={selectClasses}
        >
          <option value="">Any Payment Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="door">Door Paid</option>
          <option value="door-list">To Pay at Door</option>
          <option value="complimentary">Complimentary</option>
          <option value="unknown">Unknown</option>
        </select>

        <select 
          aria-label="Payment method filter"
          value={filters.paymentMethod || ''} 
          onChange={(e) => handleChange('paymentMethod', e.target.value)}
          className={selectClasses}
        >
          <option value="">Any Payment Method</option>
          <option value="firstpay">FirstPay</option>
          <option value="bank-transfer">Bank Transfer</option>
          <option value="cash">Cash</option>
          <option value="door">Door</option>
          <option value="card">Card</option>
          <option value="complimentary">Complimentary</option>
          <option value="unknown">Unknown</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-[#5D4A52]">
          <input 
            type="checkbox" 
            checked={filters.balanceDue || false}
            onChange={(e) => handleChange('balanceDue', e.target.checked)}
            className="rounded border-[#C4B4AA] text-[#9A5260] focus:ring-[#9A5260]"
          />
          Has Balance Due
        </label>

        <label className="flex items-center gap-2 text-sm text-[#5D4A52]">
          <input
            type="checkbox"
            checked={filters.missingTicket || false}
            onChange={(e) => handleChange('missingTicket', e.target.checked)}
            className="rounded border-[#C4B4AA] text-[#9A5260] focus:ring-[#9A5260]"
          />
          Missing Ticket Code
        </label>

        <label className="flex items-center gap-2 text-sm text-[#5D4A52]">
          <input
            type="checkbox"
            checked={filters.missingAmount || false}
            onChange={(e) => handleChange('missingAmount', e.target.checked)}
            className="rounded border-[#C4B4AA] text-[#9A5260] focus:ring-[#9A5260]"
          />
          Missing Amount
        </label>
        
        <label className="flex items-center gap-2 text-sm text-[#5D4A52]">
          <input
            type="checkbox"
            checked={filters.reviewNeeded || false}
            onChange={(e) => handleChange('reviewNeeded', e.target.checked)}
            className="rounded border-[#C4B4AA] text-[#9A5260] focus:ring-[#9A5260]"
          />
          Needs Review
        </label>

        <label className="flex items-center gap-2 text-sm text-[#5D4A52]">
          <input
            type="checkbox"
            checked={filters.duplicateContacts || false}
            onChange={(e) => handleChange('duplicateContacts', e.target.checked)}
            className="rounded border-[#C4B4AA] text-[#9A5260] focus:ring-[#9A5260]"
          />
          Repeated Contact Details
        </label>
      </div>
    </div>
  )
}
