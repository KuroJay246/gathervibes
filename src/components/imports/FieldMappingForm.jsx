import { ChevronRight } from 'lucide-react'
import { buildHeaderMappingPreview } from '../../utils/importUtils'

const REGISTRATION_FIELDS = [
  { value: 'fullName', label: 'Full Name (Required)' },
  { value: 'email', label: 'Email Address' },
  { value: 'phone', label: 'Phone Number' },
  { value: 'groupName', label: 'Group Name' },
  { value: 'personsAttending', label: 'Persons Attending (Default 1)' },
  { value: 'paymentStatus', label: 'Payment Status' },
  { value: 'paymentReference', label: 'Payment Reference' },
  { value: 'ticketCode', label: 'Ticket Code' },
  { value: 'timestamp', label: 'Timestamp (for duplicate detection)' },
  { value: 'notes', label: 'Notes' },
]

export function FieldMappingForm({ headers, fieldMap, onMapChange, onCancel, onProceed, sheetName, onChangeSheet }) {
  const isReady = fieldMap.fullName !== undefined
  const mappingPreview = buildHeaderMappingPreview(headers, fieldMap)
  
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
            Change Sheet
          </button>
        )}
      </div>
      <p className="mt-2 text-sm text-[#816D62]">
        Match imported columns to Gather & Savor registration fields. Extra columns can remain ignored safely.
      </p>

      <div className="mt-6 space-y-4">
        {headers.map((header, index) => {
          // Find if this field is currently mapped
          const mappedKey = Object.keys(fieldMap).find(key => fieldMap[key] === index)
          
          return (
            <div key={index} className="flex flex-col gap-3 rounded-xl border border-[#F2E8E1] p-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex-1 font-mono text-sm font-semibold text-[#5D4A52]">
                {header || `Column ${index + 1}`}
                <div className="mt-1 flex flex-wrap gap-2 font-sans text-[10px] font-bold uppercase tracking-wider">
                  <span className="rounded-full bg-[#F7F1ED] px-2 py-0.5 text-[#8C7567]">
                    Detected: {mappingPreview[index]?.detectedField || 'Unmapped'}
                  </span>
                  <span className="rounded-full bg-[#F7F1ED] px-2 py-0.5 text-[#8C7567]">
                    Confidence: {mappingPreview[index]?.confidence || 'none'}
                  </span>
                </div>
              </div>
              <ChevronRight className="hidden size-4 text-[#C4B4AA] sm:block" />
              <div className="flex-1">
                <select
                  value={mappedKey || ''}
                  onChange={(e) => {
                    const newMap = { ...fieldMap }
                    // Remove old mapping if it exists
                    if (mappedKey) delete newMap[mappedKey]
                    // Set new mapping
                    if (e.target.value) newMap[e.target.value] = index
                    onMapChange(newMap)
                  }}
                  className="w-full rounded-lg border border-[#E5D7CF] bg-[#FBF8F5] px-3 py-2 text-sm text-[#2B1723] focus:border-[#B76E79] focus:outline-none"
                >
                  <option value="">-- Skip this column --</option>
                  {REGISTRATION_FIELDS.map(field => (
                    <option 
                      key={field.value} 
                      value={field.value}
                      disabled={field.value !== mappedKey && Object.keys(fieldMap).includes(field.value)}
                    >
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )
        })}
      </div>

      {!isReady && (
        <div className="mt-6 rounded-xl bg-[#FFF1F1] px-4 py-3 text-sm text-[#A32626]">
          <strong>Action needed:</strong> Full Name is missing. Detected columns: {headers.join(', ') || 'none'}. Map a name column or fix the uploaded headers before preview.
        </div>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-5 py-2.5 text-sm font-bold text-[#8C7567] transition hover:bg-[#F2E8E1]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onProceed}
          disabled={!isReady}
          className="rounded-xl bg-[#B76E79] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#B76E79]/20 transition hover:bg-[#A9606B] hover:shadow-xl hover:shadow-[#B76E79]/30 disabled:opacity-50"
        >
          Preview Import
        </button>
      </div>
    </div>
  )
}
