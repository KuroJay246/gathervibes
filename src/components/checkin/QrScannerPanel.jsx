import { useEffect, useId, useRef, useState } from 'react'
import { Camera, Keyboard, ScanLine, Square } from 'lucide-react'
import { findRegistrationByQrTicketCode, parseQrTicketCode } from '../../utils/qrTicketUtils'

export function QrScannerPanel({ registrations, onMatch, onMissing, onInvalid }) {
  const [manualValue, setManualValue] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scannerError, setScannerError] = useState('')
  const [scannerNote, setScannerNote] = useState('')
  const scannerRef = useRef(null)
  const reactId = useId()
  const regionId = `ticket-qr-reader-${reactId.replace(/:/g, '')}`

  useEffect(() => () => {
    const scanner = scannerRef.current
    scannerRef.current = null
    if (scanner) {
      scanner.stop()
        .then(() => scanner.clear())
        .catch(() => {
          try {
            scanner.clear()
          } catch {
            // Scanner cleanup is best effort when permission/start failed.
          }
        })
    }
  }, [])

  function resolveTicket(value, source = 'manual') {
    const parsed = parseQrTicketCode(value)
    setScannerNote('')
    setScannerError('')

    if (parsed.error) {
      setScannerError(parsed.error)
      onInvalid?.(parsed.error)
      return
    }

    const match = findRegistrationByQrTicketCode(registrations, parsed.ticketCode)
    if (!match) {
      const message = `No registration with ticket code ${parsed.ticketCode} was found for the selected Working Event.`
      setScannerError(message)
      onMissing?.(parsed.ticketCode)
      return
    }

    setScannerNote(source === 'scan'
      ? 'QR matched a guest. Review the guest card before check-in.'
      : 'Ticket code matched a guest. Review the guest card before check-in.')
    onMatch(match, parsed.ticketCode)
  }

  async function stopScanner() {
    const scanner = scannerRef.current
    scannerRef.current = null
    if (!scanner) {
      setScanning(false)
      return
    }

    try {
      await scanner.stop()
    } catch {
      // Stop can reject if camera startup failed; clearing below is still safe.
    }

    try {
      scanner.clear()
    } catch {
      // Clear is best effort after failed startup.
    }

    setScanning(false)
  }

  async function startScanner() {
    setScannerError('')
    setScannerNote('')

    if (scannerRef.current) {
      await stopScanner()
    }

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode(regionId)
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          await stopScanner()
          resolveTicket(decodedText, 'scan')
        },
      )
      setScanning(true)
    } catch (err) {
      scannerRef.current = null
      setScanning(false)
      if (import.meta.env.DEV) console.error('QR scanner failed:', err)
      setScannerError('Camera scanner could not start. Check browser camera permission or paste the ticket code below.')
    }
  }

  return (
    <div className="rounded-2xl border border-[#EEDFD6] bg-white p-4 shadow-[0_4px_16px_rgba(43,23,35,0.03)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1E7345]">Scan QR</p>
          <h3 className="mt-1 font-serif text-2xl text-[#2B1723]">Ticket lookup</h3>
          <p className="mt-1 text-xs leading-5 text-[#816D62]">
            QR lookup only selects the guest. Check-in still requires confirmation.
          </p>
        </div>
        <ScanLine className="size-8 text-[#B76E79]" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-3">
          <div id={regionId} className="min-h-56 overflow-hidden rounded-xl border border-[#E5D7CF] bg-[#FBF8F5]" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={startScanner}
              disabled={scanning}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#B76E79] px-4 text-xs font-bold text-white hover:bg-[#A9606B] disabled:opacity-50"
            >
              <Camera className="size-4" />
              Start camera
            </button>
            <button
              type="button"
              onClick={stopScanner}
              disabled={!scanning}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-4 text-xs font-bold text-[#6B564C] hover:bg-[#FBF8F5] disabled:opacity-50"
            >
              <Square className="size-4" />
              Stop
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <label htmlFor="manual-ticket-code" className="event-label">Manual ticket fallback</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Keyboard className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#B8A49A]" />
              <input
                id="manual-ticket-code"
                value={manualValue}
                onChange={(event) => setManualValue(event.target.value.toUpperCase())}
                placeholder="CPB-001 or GSV:TICKET:CPB-001"
                className="min-h-11 w-full rounded-xl border border-[#E5D7CF] bg-white py-3 pl-9 pr-3 text-sm font-semibold text-[#2B1723] focus:border-[#B76E79] focus:outline-none focus:ring-2 focus:ring-[#B76E79]/20"
              />
            </div>
            <button
              type="button"
              onClick={() => resolveTicket(manualValue, 'manual')}
              className="rounded-xl bg-[#2B1723] px-4 py-3 text-xs font-bold text-white hover:bg-[#3B2430]"
            >
              Find ticket
            </button>
          </div>
          <p className="text-xs leading-5 text-[#816D62]">
            Accepted formats include raw ticket codes and the GSV:TICKET: prefix used by generated QR codes.
          </p>
          {scannerNote && <div className="rounded-xl border border-[#CFE8D8] bg-[#E5F3EC] px-4 py-3 text-sm text-[#1E7345]">{scannerNote}</div>}
          {scannerError && <div className="rounded-xl border border-[#F2C3C3] bg-[#FFF1F1] px-4 py-3 text-sm text-[#A32626]">{scannerError}</div>}
        </div>
      </div>
    </div>
  )
}
