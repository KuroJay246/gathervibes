import { ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { buildHeaderMappingPreview } from '../../utils/importUtils'

const REGISTRATION_FIELDS = [
  { value: 'fullName', label: 'Full Name (Required)' },
  { value: 'buyerName', label: 'Buyer / Purchaser Name' },
  { value: 'attendeeNames', label: 'Guest / Attendee Name(s)' },
  { value: 'email', label: 'Email Address' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'groupName', label: 'Group Name' },
  { value: 'preferredSchool', label: 'Preferred School / Organization Notes' },
  { value: 'personsAttending', label: 'Guest Count (Default 1)' },
  { value: 'paymentStatus', label: 'Payment Status', help: 'Use Paid, Pending, Complimentary, Door Paid, or To Pay at Door. Unknown statuses stop for review.' },
  { value: 'priceTier', label: 'Price Tier / Ticket Type', help: 'Use the named ticket tier, such as Early Bird, General, Door/Late, or Complimentary.' },
  { value: 'ticketPrice', label: 'Ticket Price', help: 'Use the explicit price for one ticket. Leave blank if it is not known.' },
  { value: 'amountDue', label: 'Amount Due', help: 'Use the expected total for this registration. Do not rely on the event base price for missing values.' },
  { value: 'amountPaid', label: 'Amount Paid', help: 'Use only confirmed money collected. Leave blank or zero when not confirmed.' },
  { value: 'balanceDue', label: 'Balance Due', help: 'Use the remaining balance. To Pay at Door rows should keep the balance due visible.' },
  { value: 'paymentMethod', label: 'Payment Method', help: 'Map only proven methods. Use Unknown when the method is unclear.' },
  { value: 'paymentReference', label: 'Payment Reference', help: 'Use a safe receipt or transfer reference. Do not paste Gmail, Drive, bank, or card links.' },
  { value: 'ticketCode', label: 'Ticket Code' },
  { value: 'timestamp', label: 'Timestamp (for duplicate detection)' },
  { value: 'notes', label: 'Notes' },
]

export function FieldMappingForm({
  headers,
  fieldMap,
  onMapChange,
  onCancel,
  onProceed,
  sheetName,
  onChangeSheet,
  onStartOver,
}) {
  const hasAttendeeNames = Array.isArray(fieldMap.attendeeNames) && fieldMap.attendeeNames.length > 0
  const isReady = fieldMap.fullName !== undefined || fieldMap.buyerName !== undefined || hasAttendeeNames
  const mappingPreview = buildHeaderMappingPreview(headers, fieldMap)
  const headerRows = useMemo(() => {
    const seenHeaders = new Map()
    return headers.map((header, index) => {
      const label = header || 'Column'
      const count = (seenHeaders.get(label) || 0) + 1
      seenHeaders.set(label, count)
      return {
        id: `${label}-${count}`,
        header,
        index,
      }
    })
  }, [headers])
  const fieldMapsIndex = (field, index) => (
    Array.isArray(fieldMap[field]) ? fieldMap[field].includes(index) : fieldMap[field] === index
  )
  
  return (
    <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(43,23,35,0.04)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-serif text-xl text-[#2B1723]">Header Mapping Preview</h3>
          {sheetName && <p className="mt-1 text-xs font-bold text-[#1E7345]">Using sheet: {sheetName}</p>}
        </div>
        {onChangeSheet && (
          <button
            type="button"
            onClick={onChangeSheet}
            className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-2 text-xs font-bold text-[#6B564C] hover:bg-[#FBF8F5]"
          >
            Back to Sheet Selection
          </button>
        )}
      </div>
      <p className="mt-2 text-sm text-[#816D62]">
        Match imported columns to Gather & Savor registration fields. Extra columns can remain ignored safely.
      </p>

      <div className="mt-6 space-y-4">
        {headerRows.map(({ id, header, index }) => {
          // Find if this field is currently mapped. attendeeNames can map to several columns.
          const mappedKey = Object.keys(fieldMap).find(key => fieldMapsIndex(key, index))
          const mappedField = REGISTRATION_FIELDS.find((field) => field.value === mappedKey)
          const selectId = `import-column-map-${index}`
          
          return (
            <div key={id} className="flex flex-col gap-3 rounded-xl border border-[#F2E8E1] p-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex-1 font-mono text-sm font-semibold text-[#5D4A52]">
                <label htmlFor={selectId}>{header || `Column ${index + 1}`}</label>
                <div className="mt-1 flex flex-wrap gap-2 font-sans text-[10px] font-bold uppercase tracking-wider">
                  <span className="rounded-full bg-[#F7F1ED] px-2 py-0.5 text-[#80685B]">
                    Detected: {mappingPreview[index]?.detectedField || 'Unmapped'}
                  </span>
                  <span className="rounded-full bg-[#F7F1ED] px-2 py-0.5 text-[#80685B]">
                    Confidence: {mappingPreview[index]?.confidence || 'none'}
                  </span>
                </div>
              </div>
              <ChevronRight className="hidden size-4 text-[#C4B4AA] sm:block" />
              <div className="flex-1">
                <select
                  id={selectId}
                  value={mappedKey || ''}
                  onChange={(e) => {
                    const newMap = { ...fieldMap }
                    if (mappedKey === 'attendeeNames') {
                      newMap.attendeeNames = (newMap.attendeeNames || []).filter((item) => item !== index)
                      if (newMap.attendeeNames.length === 0) delete newMap.attendeeNames
                    } else if (mappedKey) {
                      delete newMap[mappedKey]
                    }
                    if (e.target.value === 'attendeeNames') {
                      newMap.attendeeNames = [...new Set([...(newMap.attendeeNames || []), index])]
                    } else if (e.target.value) {
                      newMap[e.target.value] = index
                    }
                    onMapChange(newMap)
                  }}
                  className="w-full rounded-lg border border-[#E5D7CF] bg-[#FBF8F5] px-3 py-2 text-sm text-[#2B1723] focus:border-[#9A5260] focus:outline-none"
                >
                  <option value="">-- Skip this column --</option>
                  {REGISTRATION_FIELDS.map(field => (
                    <option 
                      key={field.value} 
                      value={field.value}
                      disabled={field.value !== 'attendeeNames' && field.value !== mappedKey && Object.keys(fieldMap).includes(field.value)}
                    >
                      {field.label}
                    </option>
                  ))}
                </select>
                {mappedField?.help && (
                  <p className="mt-1 text-[11px] leading-4 text-[#80685B]">{mappedField.help}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {!isReady && (
        <div className="mt-6 rounded-xl bg-[#FFF1F1] px-4 py-3 text-sm text-[#A32626]">
          <strong>Action needed:</strong> Name information is missing. Detected columns: {headers.join(', ') || 'none'}. Map a full name, buyer/contact name, or guest/attendee names before preview.
        </div>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onStartOver || onCancel}
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-[#80685B] transition hover:bg-[#F2E8E1]"
        >
          Change File / Start Over
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-[#80685B] transition hover:bg-[#F2E8E1]"
        >
          Clear File
        </button>
        {!isReady && (
          <p className="self-center text-xs font-semibold text-[#A32626]">
            Map a full name, buyer/contact, or attendee column to continue.
          </p>
        )}
        <button
          type="button"
          onClick={onProceed}
          disabled={!isReady}
          className="rounded-xl bg-[#9A5260] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#9A5260]/20 transition hover:bg-[#A9606B] hover:shadow-xl hover:shadow-[#9A5260]/30 disabled:opacity-50"
        >
          Preview Import
        </button>
      </div>
    </div>
  )
}
