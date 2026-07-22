import { useState } from 'react'
import { Download, Copy, CheckCircle2, X } from 'lucide-react'
import { EXPORT_PRESETS, buildExportRows, convertToCsv, downloadCsv } from '../../utils/exportUtils'

export function ExportModal({ isOpen, onClose, registrations, event }) {
  const [selectedPreset, setSelectedPreset] = useState('admin')
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const rowCount = registrations?.length || 0
  const personsCount = registrations?.reduce((sum, reg) => sum + (reg.personsAttending || 1), 0) || 0

  function handleCopy() {
    const dataRows = buildExportRows(registrations, event, selectedPreset)
    const csvContent = convertToCsv(dataRows)
    navigator.clipboard.writeText(csvContent).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleDownload() {
    const dataRows = buildExportRows(registrations, event, selectedPreset)
    const csvContent = convertToCsv(dataRows)
    const dateStr = new Date().toISOString().split('T')[0]
    const safeEventName = (event?.eventName || 'event').replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const filename = `${safeEventName}_${selectedPreset}_export_${dateStr}.csv`
    downloadCsv(csvContent, filename)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B1723]/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#F2E8E1] px-6 py-4">
          <h2 className="font-serif text-xl text-[#2B1723]">Export Registrations</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#80685B] hover:bg-[#F2E8E1] hover:text-[#2B1723]"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 rounded-2xl border border-[#EFE2DA] bg-[#FBF8F5] p-4 text-sm">
            <p className="font-bold text-[#2B1723]">Scope: {event?.eventName || 'Unknown Event'}</p>
            <p className="mt-1 text-[#80685B]">
              Exporting {rowCount} row{rowCount === 1 ? '' : 's'} ({personsCount} person{personsCount === 1 ? '' : 's'})
            </p>
            <p className="mt-3 text-xs italic text-[#8A3F4B]">
              Only the selected Working Event will be exported. Audit logs and system settings are never included.
            </p>
          </div>

          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#80685B]">
            Export Preset
          </label>
          <div className="grid gap-2">
            {EXPORT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setSelectedPreset(preset.id)}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                  selectedPreset === preset.id
                    ? 'border-[#9A5260] bg-[#FFF8F9]'
                    : 'border-[#EFE2DA] bg-white hover:border-[#D6C1B5]'
                }`}
              >
                <span className={`text-sm font-bold ${selectedPreset === preset.id ? 'text-[#9A5260]' : 'text-[#2B1723]'}`}>
                  {preset.label}
                </span>
                {selectedPreset === preset.id && <CheckCircle2 className="size-5 text-[#9A5260]" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#F2E8E1] bg-[#FBF8F5] p-6 sm:flex-row sm:justify-end rounded-b-3xl">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-5 py-2.5 text-sm font-bold text-[#80685B] transition hover:bg-[#F2E8E1] sm:flex-none"
          >
            {copied ? <CheckCircle2 className="size-4" /> : <Copy className="size-4" />}
            {copied ? 'Copied' : 'Copy CSV'}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#2B1723] px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-[#3D2232] sm:flex-none"
          >
            <Download className="size-4" />
            Download CSV
          </button>
        </div>
      </div>
    </div>
  )
}
