import { useState } from 'react'
import { Copy, Download, FileSpreadsheet, CheckCircle2, Info } from 'lucide-react'
import { downloadCsv } from '../../utils/exportUtils'

const TEMPLATES = [
  {
    id: 'basic-registration',
    label: '1. Basic Registration Import',
    description: 'Use when you only have names and contact details.',
    when: 'Use this for a simple guest list with one row per registration.',
    required: ['Full Name'],
    optional: ['Email Address', 'Phone Number', 'Persons Attending', 'Ticket Code', 'Notes'],
    exampleUse: 'Adding a small list collected outside Google Forms.',
    leaveBlank: 'Leave Ticket Code blank if tickets have not been assigned yet.',
    doNotPut: 'Do not put payment proof, Gmail links, or private notes in public-facing fields.',
    duplicates: 'Avoid duplicates by keeping the same full name and contact on one row only.',
    effect: 'Creates registrations; it does not update finance unless finance columns are added.',
    headers: ['Full Name', 'Email Address', 'Phone Number', 'Persons Attending', 'Ticket Code', 'Notes'],
    sampleRow: ['Jane Doe', 'jane@example.com', '555-0100', 1, '', 'VIP guest'],
  },
  {
    id: 'buyer-attendees',
    label: '2. Buyer + Attendees Import',
    description: 'Use when one person bought tickets for a group.',
    when: 'Use this when the buyer/contact is different from the guest names.',
    required: ['Buyer Name', 'Guest Names'],
    optional: ['Email Address', 'Persons Attending', 'Ticket Code'],
    exampleUse: 'A parent or group lead bought tickets for several attendees.',
    leaveBlank: 'Leave Ticket Code blank when the group does not have an assigned ticket yet.',
    doNotPut: 'Do not split the same group across rows unless they truly need separate records.',
    duplicates: 'Use the same Buyer Name and complete Guest Names list to spot accidental duplicate groups.',
    effect: 'Creates registrations with buyer and attendee names.',
    headers: ['Buyer Name', 'Email Address', 'Guest Names', 'Persons Attending', 'Ticket Code'],
    sampleRow: ['John Smith', 'john@example.com', 'John Smith, Alice Smith, Bob Smith', 3, ''],
  },
  {
    id: 'finance-import',
    label: '3. Finance Import',
    description: 'Use when importing paid tickets with balances and payment methods.',
    when: 'Use this when payment amounts are already confirmed outside the app.',
    required: ['Full Name', 'Payment Status'],
    optional: ['Payment Method', 'Price Tier', 'Ticket Price', 'Amount Paid', 'Balance Due'],
    exampleUse: 'Updating paid, pending, complimentary, or outstanding balance rows from a reviewed spreadsheet.',
    leaveBlank: 'Leave Payment Reference blank if no safe receipt or reference exists.',
    doNotPut: 'Do not put Gmail links, bank screenshots, card numbers, or guessed payment methods.',
    duplicates: 'Match by full name, contact, or ticket code before importing finance updates.',
    effect: 'Creates registrations during import; review carefully because finance fields affect totals.',
    headers: ['Full Name', 'Email Address', 'Payment Status', 'Payment Method', 'Price Tier', 'Ticket Price', 'Amount Paid', 'Balance Due'],
    sampleRow: ['Carlos Ray', 'carlos@example.com', 'paid', 'card', 'General', 100, 100, 0],
  },
  {
    id: 'door-payment',
    label: '4. Door Payment Import',
    description: 'Use when guests are expected to pay at the door.',
    when: 'Use this for guests who are expected to pay when they arrive.',
    required: ['Full Name', 'Payment Status'],
    optional: ['Persons Attending', 'Price Tier', 'Ticket Price', 'Balance Due'],
    exampleUse: 'Preparing the event-day payment review list before guests arrive.',
    leaveBlank: 'Leave Amount Paid blank or zero until payment is confirmed.',
    doNotPut: 'Do not mark a row Door Paid unless the late or door payment was confirmed.',
    duplicates: 'Use ticket code or full name plus contact to avoid adding the same door guest twice.',
    effect: 'Creates registrations and can mark To Pay at Door or Door Paid based on the status you choose.',
    headers: ['Full Name', 'Email Address', 'Persons Attending', 'Payment Status', 'Price Tier', 'Ticket Price', 'Balance Due'],
    sampleRow: ['Sarah Connor', 'sarah@example.com', 2, 'door-list', 'General', 100, 200],
  },
  {
    id: 'school-group',
    label: '5. School / Group Import',
    description: 'Use when tracking groups, tables, or school affiliations.',
    when: 'Use this when group, table, school, or organization names matter for event operations.',
    required: ['Full Name'],
    optional: ['Group Name', 'Preferred School', 'Persons Attending', 'Payment Status'],
    exampleUse: 'Loading school teams, table groups, or vendor guest groups.',
    leaveBlank: 'Leave Preferred School blank when it is not relevant.',
    doNotPut: 'Do not put unrelated notes in Group Name; use Notes instead.',
    duplicates: 'Use consistent group names so the import review can identify shared groups.',
    effect: 'Creates registrations and keeps school preference in notes-safe import handling.',
    headers: ['Full Name', 'Group Name', 'Preferred School', 'Persons Attending', 'Payment Status'],
    sampleRow: ['Teacher Admin', 'Table 5', 'Central High School', 10, 'pending'],
  },
  {
    id: 'full-admin',
    label: '6. Full Admin Import Template',
    description: 'Includes all supported columns for a comprehensive import.',
    when: 'Use this when an admin has a complete, reviewed spreadsheet.',
    required: ['Full Name'],
    optional: ['Buyer Name', 'Guest Names', 'Group Name', 'Email Address', 'Phone Number', 'Payment Status', 'Payment Method', 'Payment Reference', 'Price Tier', 'Ticket Price', 'Amount Due', 'Amount Paid', 'Balance Due', 'Ticket Code', 'Notes'],
    exampleUse: 'Moving a cleaned master spreadsheet into the Event Hub.',
    leaveBlank: 'Leave unknown finance fields blank instead of guessing.',
    doNotPut: 'Do not include credentials, private payment exports, Gmail links, or raw bank/card details.',
    duplicates: 'Sort by full name, buyer, email, phone, and ticket code before uploading.',
    effect: 'Creates registrations with all mapped admin fields after preview.',
    headers: ['Full Name', 'Buyer Name', 'Guest Names', 'Group Name', 'Email Address', 'Phone Number', 'Persons Attending', 'Payment Status', 'Payment Method', 'Payment Reference', 'Price Tier', 'Ticket Price', 'Amount Due', 'Amount Paid', 'Balance Due', 'Dietary Notes', 'Preferred School', 'Ticket Code', 'Notes'],
    sampleRow: ['Alex Admin', 'Alex Admin', 'Alex Admin, Partner', 'VIP Table', 'alex@example.com', '555-9999', 2, 'paid', 'bank-transfer', 'REF-123', 'VIP', 150, 300, 300, 0, 'No nuts', '', '', 'Needs accessible seating'],
  },
  {
    id: 'google-reimport',
    label: '7. Google Forms Re-import Template',
    description: 'Use after exporting, cleaning, and downloading a Google Forms or Sheets CSV.',
    when: 'Use this to bring a manually cleaned Google Forms response sheet back into preview.',
    required: ['Full Name or Guest Names'],
    optional: ['Buyer Name', 'Email Address', 'Phone Number', 'Payment Status', 'Ticket Code', 'Notes'],
    exampleUse: 'Correcting spelling, contacts, ticket codes, or payment statuses after the first import.',
    leaveBlank: 'Leave fields blank when the source did not provide reliable data.',
    doNotPut: 'Do not paste Google Drive, Gmail, or Sheets edit links into guest fields.',
    duplicates: 'Keep original source rows together and review duplicate warnings before import.',
    effect: 'Creates new registrations only after preview; it is not a silent sync.',
    headers: ['Full Name', 'Buyer Name', 'Guest Names', 'Group Name', 'Email Address', 'Phone Number', 'Persons Attending', 'Payment Status', 'Payment Method', 'Payment Reference', 'Price Tier', 'Ticket Price', 'Amount Due', 'Amount Paid', 'Balance Due', 'Ticket Code', 'Notes'],
    sampleRow: ['Jamie Forms', 'Jamie Buyer', 'Jamie Forms', '', 'jamie@example.com', '555-0104', 1, 'pending', 'unknown', '', 'General', '', '', '', '', '', 'Cleaned re-import row'],
  },
  {
    id: 'cpb-payment-audit',
    label: '8. CPB Payment Audit Backfill',
    description: 'Special dry-run workflow for the Cake Piknik Barbados payment audit workbook.',
    when: 'Use only with the organizer-reviewed CPB payment audit workbook.',
    required: ['Payment Audit sheet', 'Ticket/Door ID', 'Guest Name', 'Buyer/Contact', 'Payment Status', 'Confidence'],
    optional: ['Evidence Summary', 'Evidence Date', 'Email/Phone', 'Notes'],
    exampleUse: 'Previewing proposed CPB finance backfill updates without writing to Firestore.',
    leaveBlank: 'Leave transaction numbers and payment methods blank when not proven.',
    doNotPut: 'Do not store Gmail links, CPB exports, backups, or private proof in registration fields.',
    duplicates: 'Review unmatched rows, review-needed rows, Christina Morris, Gabriela missing guest, and Roger Walcott before approval.',
    effect: 'Dry-run preview only by default; it does not apply CPB writes or create missing registrations. Cole also has the spreadsheet for independent verification.',
    headers: ['Source Register', 'Ticket/Door ID', 'Guest Name', 'Buyer/Contact', 'Email/Phone', 'Price Tier', 'Unit Price', 'Amount Paid Confirmed', 'Expected Total', 'Balance/Due', 'Payment Status', 'Evidence Summary', 'Evidence Date', 'Confidence', 'Notes'],
    sampleRow: ['CPB audit', 'CPB-001', 'Example Guest', 'Example Buyer', '', 'General', 100, 100, 100, 0, 'Paid - Confirmed', 'Safe summary only', '', 'High', 'No Gmail link'],
  },
]

export function ImportTemplatesPanel() {
  const [copiedId, setCopiedId] = useState('')

  function handleCopyHeaders(template) {
    const csvContent = template.headers.join(',')
    navigator.clipboard.writeText(csvContent).then(() => {
      setCopiedId(`${template.id}-headers`)
      setTimeout(() => setCopiedId(''), 2000)
    })
  }

  function handleDownloadSample(template) {
    
    // Convert arrays directly to CSV string
    const escapeCsv = (val) => {
      const str = String(val ?? '')
      if (str.includes(',') || str.includes('"') || str.includes('\n')) return `"${str.replace(/"/g, '""')}"`
      return str
    }
    
    const rows = [
      template.headers.map(escapeCsv).join(','),
      template.sampleRow.map(escapeCsv).join(',')
    ]
    
    downloadCsv(rows.join('\n'), `${template.id}-template.csv`)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#EFE2DA] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-[#F2E8E1] pb-4">
          <FileSpreadsheet className="size-6 text-[#B76E79]" />
          <div>
            <h2 className="font-serif text-xl text-[#2B1723]">Import Templates</h2>
            <p className="text-sm text-[#816D62]">Download sample CSV files to format your data before importing.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {TEMPLATES.map((template) => (
            <div key={template.id} className="flex flex-col justify-between rounded-xl border border-[#EFE2DA] bg-[#FBF8F5] p-4">
              <div>
                <p className="font-bold text-[#2B1723]">{template.label}</p>
                <p className="mt-1 text-xs text-[#8A7468]">{template.description}</p>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[#A85F6B]">Includes columns:</p>
                <p className="mt-1 text-xs text-[#6B564C]">{template.headers.join(', ')}</p>
                <dl className="mt-3 space-y-2 text-xs leading-5 text-[#6B564C]">
                  <div><dt className="font-bold text-[#2B1723]">When to use it</dt><dd>{template.when}</dd></div>
                  <div><dt className="font-bold text-[#2B1723]">Required columns</dt><dd>{template.required.join(', ')}</dd></div>
                  <div><dt className="font-bold text-[#2B1723]">Optional columns</dt><dd>{template.optional.join(', ')}</dd></div>
                  <div><dt className="font-bold text-[#2B1723]">Example use case</dt><dd>{template.exampleUse}</dd></div>
                  <div><dt className="font-bold text-[#2B1723]">What to leave blank</dt><dd>{template.leaveBlank}</dd></div>
                  <div><dt className="font-bold text-[#2B1723]">What not to put</dt><dd>{template.doNotPut}</dd></div>
                  <div><dt className="font-bold text-[#2B1723]">Avoid duplicates</dt><dd>{template.duplicates}</dd></div>
                  <div><dt className="font-bold text-[#2B1723]">Creates or updates</dt><dd>{template.effect}</dd></div>
                </dl>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadSample(template)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#2B1723] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#3D2232]"
                >
                  <Download className="size-3.5" />
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyHeaders(template)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#E7D6CC] bg-white px-3 py-2 text-xs font-bold text-[#8C766A] transition hover:bg-[#F2E8E1]"
                >
                  {copiedId === `${template.id}-headers` ? <CheckCircle2 className="size-3.5 text-[#B76E79]" /> : <Copy className="size-3.5" />}
                  {copiedId === `${template.id}-headers` ? 'Copied' : 'Copy Headers'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#CDE5E9] bg-[#F0F8FA] p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 size-5 shrink-0 text-[#2C7B8B]" />
          <div>
            <h3 className="font-bold text-[#1F5763]">Google Sheets Workflow</h3>
            <p className="mt-1 text-sm text-[#3E7C8B]">
              Because direct Google Sheets integration is deferred, follow these manual steps to sync data:
            </p>
            <ol className="ml-4 mt-3 list-decimal space-y-2 text-sm text-[#3E7C8B]">
              <li>Go to the <strong>Registrations</strong> page and click <strong>Export CSV</strong> (use "Google Forms re-import template").</li>
              <li>Open Google Sheets and click <strong>File &rarr; Import</strong>.</li>
              <li>Upload the CSV and choose "Replace current sheet" or "Create new spreadsheet".</li>
              <li>Edit your guest data, update payment statuses, and add new rows directly in Google Sheets.</li>
              <li>When finished, click <strong>File &rarr; Download &rarr; Comma Separated Values (.csv)</strong>.</li>
              <li>Return to this <strong>Import Center</strong> and upload the new CSV file to sync the changes.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
