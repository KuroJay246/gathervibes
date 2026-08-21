import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Camera, Keyboard, ScanLine, Square } from 'lucide-react'
import { findRegistrationByQrTicketCode, parseQrTicketCode } from '../../utils/qrTicketUtils'

const SOUND_PREF_KEY = 'gsv-scanner-sound-enabled'
const HAPTIC_PREF_KEY = 'gsv-scanner-haptic-enabled'

export function QrScannerPanel({ registrations, onMatch, onMissing, onInvalid, resumeTrigger }) {
  const [manualValue, setManualValue] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanArmed, setScanArmed] = useState(false)
  const [manualLookupOpen, setManualLookupOpen] = useState(false)
  const [scannerError, setScannerError] = useState('')
  const [scannerNote, setScannerNote] = useState('')
  const scannerRef = useRef(null)
  const scanArmedRef = useRef(false)
  const scanProcessingRef = useRef(false)
  const registrationsRef = useRef(registrations)
  const callbacksRef = useRef({ onMatch, onMissing, onInvalid })
  const continuousScanRef = useRef(false)
  const reactId = useId()
  const regionId = `ticket-qr-reader-${reactId.replace(/:/g, '')}`

  const [continuousScan, setContinuousScan] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return window.localStorage.getItem(SOUND_PREF_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [hapticEnabled, setHapticEnabled] = useState(() => {
    try {
      return window.localStorage.getItem(HAPTIC_PREF_KEY) === 'true'
    } catch {
      return false
    }
  })
  const manualInputRef = useRef(null)

  useEffect(() => {
    scanArmedRef.current = scanArmed
  }, [scanArmed])

  useEffect(() => {
    registrationsRef.current = registrations
  }, [registrations])

  useEffect(() => {
    callbacksRef.current = { onMatch, onMissing, onInvalid }
  }, [onMatch, onMissing, onInvalid])

  useEffect(() => {
    continuousScanRef.current = continuousScan
  }, [continuousScan])

  function setScannerArmed(value) {
    scanArmedRef.current = value
    setScanArmed(value)
  }

  function setScannerProcessing(value) {
    scanProcessingRef.current = value
  }

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

  const playTone = useCallback((type = 'success') => {
    if (!soundEnabled) return
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      oscillator.type = type === 'error' ? 'square' : type === 'duplicate' ? 'triangle' : 'sine'
      oscillator.frequency.setValueAtTime(type === 'error' ? 320 : type === 'duplicate' ? 540 : 880, audioCtx.currentTime)
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime)
      oscillator.start()
      oscillator.stop(audioCtx.currentTime + (type === 'error' ? 0.16 : 0.1))
    } catch {
      // Ignore audio failure
    }
  }, [soundEnabled])

  const triggerHaptic = useCallback((type = 'success') => {
    if (!hapticEnabled) return
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(type === 'duplicate' ? [120, 80, 120] : type === 'error' ? [200, 120, 200] : [140])
    }
  }, [hapticEnabled])

  const resolveTicket = useCallback((value, source = 'manual') => {
    const parsed = parseQrTicketCode(value)
    setScannerNote('')
    setScannerError('')

    if (parsed.error) {
      setScannerError(parsed.error)
      playTone('error')
      triggerHaptic('error')
      callbacksRef.current.onInvalid?.(parsed.error)
      return { status: 'invalid', ticketCode: '', error: parsed.error }
    }

    const match = findRegistrationByQrTicketCode(registrationsRef.current, parsed.ticketCode)
    if (!match) {
      const message = `No matching ticket code: ${parsed.ticketCode} was found for the selected Working Event.`
      setScannerError(message)
      playTone('error')
      triggerHaptic('error')
      callbacksRef.current.onMissing?.(parsed.ticketCode)
      return { status: 'missing', ticketCode: parsed.ticketCode, error: message }
    }

    playTone(match.checkedIn ? 'duplicate' : 'success')
    triggerHaptic(match.checkedIn ? 'duplicate' : 'success')

    setScannerNote(match.checkedIn
      ? `${match.fullName} is already checked in. Duplicate check-in is blocked and no new check-in write happened.`
      : source === 'scan'
        ? `${match.fullName} matched from QR. Review the guest card before check-in.`
        : `${match.fullName} matched from manual ticket lookup. Review the guest card before check-in.`)
    callbacksRef.current.onMatch?.(match, parsed.ticketCode)
    return { status: 'match', ticketCode: parsed.ticketCode, registrationId: match.registrationId }
  }, [playTone, triggerHaptic])

  async function stopScanner() {
    const scanner = scannerRef.current
    scannerRef.current = null
    setScannerArmed(false)
    setScannerProcessing(false)
    setTorchSupported(false)
    setTorchOn(false)
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

  const startScanner = useCallback(async () => {
    setScannerError('')
    setScannerNote('Camera ready. Position the ticket, then press Scan QR.')
    setScanning(true)
    setScannerArmed(false)
    setScannerProcessing(false)

    if (scannerRef.current) {
      await stopScanner()
      setScanning(true)
      setScannerNote('Camera ready. Position the ticket, then press Scan QR.')
    }

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode(regionId)
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (!scanArmedRef.current || scanProcessingRef.current) return
          setScannerArmed(false)
          setScannerProcessing(true)
          try {
            const result = resolveTicket(decodedText, 'scan')
            if (import.meta.env.DEV) {
              console.debug('QR decode handled', {
                status: result.status,
                ticketCodeLength: result.ticketCode?.length || 0,
                continuousScan: continuousScanRef.current,
              })
            }
          } finally {
            setScannerProcessing(false)
          }
        },
      )
      setScanning(true)
      
      const track = scanner.getRunningTrack?.()
      if (track) {
        const capabilities = track.getCapabilities?.() || {}
        if (capabilities.torch) {
          setTorchSupported(true)
        }
      }
    } catch (err) {
      scannerRef.current = null
      setScanning(false)
      if (import.meta.env.DEV) console.error('QR scanner failed:', err)
      setScannerNote('')
      setScannerError('Camera unavailable or permission denied. Note: Camera access requires HTTPS. Use the manual ticket lookup fallback below.')
    }
  // regionId and stopScanner/resolveTicket are stable within a render cycle
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId])

  function armScan() {
    if (!scanning) {
      setScannerError('Start the camera before scanning a QR code.')
      return
    }
    if (scanProcessingRef.current) return
    setScannerError('')
    setScannerNote('Scanning... Hold one ticket QR code inside the frame.')
    setScannerArmed(true)
  }

  function cancelScan() {
    setScannerArmed(false)
    setScannerNote(scanning ? 'Scan cancelled. Position the ticket, then press Scan QR.' : '')
  }

  function openManualLookup() {
    setManualLookupOpen(true)
    window.requestAnimationFrame(() => manualInputRef.current?.focus())
  }

  async function toggleTorch() {
    const scanner = scannerRef.current
    if (!scanner || !torchSupported) return
    const track = scanner.getRunningTrack?.()
    if (!track) return
    
    try {
      const nextTorchState = !torchOn
      await track.applyConstraints({
        advanced: [{ torch: nextTorchState }]
      })
      setTorchOn(() => nextTorchState)
    } catch (err) {
      if (import.meta.env.DEV) console.error('Torch toggle failed:', err)
    }
  }

  const previousTrigger = useRef(resumeTrigger)
  useEffect(() => {
    if (continuousScan && resumeTrigger !== previousTrigger.current && !scanning) {
      previousTrigger.current = resumeTrigger
      startScanner()
    } else if (continuousScan && resumeTrigger !== previousTrigger.current && scanning) {
      previousTrigger.current = resumeTrigger
      setScannerArmed(true)
      setScannerNote('Continuous mode ready. Hold the next ticket QR code inside the frame.')
    } else {
      previousTrigger.current = resumeTrigger
    }
  }, [resumeTrigger, continuousScan, scanning, startScanner])

  function handleSoundToggle() {
    const next = !soundEnabled
    setSoundEnabled(next)
    try {
      window.localStorage.setItem(SOUND_PREF_KEY, String(next))
    } catch {
      // Preference persistence is best effort only.
    }
  }

  function handleHapticToggle() {
    const next = !hapticEnabled
    setHapticEnabled(next)
    try {
      window.localStorage.setItem(HAPTIC_PREF_KEY, String(next))
    } catch {
      // Preference persistence is best effort only.
    }
  }

  return (
    <div className="rounded-2xl border border-[#EEDFD6] bg-white p-4 shadow-[0_4px_16px_rgba(43,23,35,0.03)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#1E7345]">Scan QR</p>
          <h3 className="mt-1 font-serif text-2xl text-[#2B1723]">Ticket lookup</h3>
          <p className="mt-1 text-xs leading-5 text-[#816D62]">
            QR lookup only selects the guest. Press Scan QR when the ticket is positioned. Check-in still requires confirmation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {scanArmed && <span className="rounded-full bg-[#E5F3EC] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1E7345]">Scanning...</span>}
          {scanning && !scanArmed && <span className="rounded-full bg-[#F6EEE8] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#80685B]">Camera ready</span>}
          <ScanLine className="size-8 text-[#9A5260]" />
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-3">
          <div id={regionId} className="min-h-56 overflow-hidden rounded-xl border border-[#E5D7CF] bg-[#FBF8F5]" />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={startScanner}
              disabled={scanning}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#9A5260] px-4 text-xs font-bold text-white hover:bg-[#A9606B] disabled:opacity-50"
            >
              <Camera className="size-4" />
              Start camera
            </button>
            <button
              type="button"
              onClick={armScan}
              disabled={!scanning || scanArmed}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#2B1723] px-4 text-xs font-bold text-white hover:bg-[#3B2430] disabled:opacity-50"
            >
              <ScanLine className="size-4" />
              {scanArmed ? 'Scanning...' : 'Scan QR'}
            </button>
            <button
              type="button"
              onClick={scanArmed ? cancelScan : stopScanner}
              disabled={!scanning && !scanArmed}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-4 text-xs font-bold text-[#6B564C] hover:bg-[#FBF8F5] disabled:opacity-50"
            >
              <Square className="size-4" />
              {scanArmed ? 'Cancel Scan' : 'Stop'}
            </button>
          </div>
          <div className="flex items-center justify-between text-xs font-semibold text-[#80685B]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input id="qr-continuous-scan" name="qrContinuousScan" type="checkbox" checked={continuousScan} onChange={(e) => setContinuousScan(e.target.checked)} className="rounded text-[#9A5260] focus:ring-[#9A5260]" />
              Continuous Scan Mode
            </label>
            {torchSupported && (
              <button type="button" onClick={toggleTorch} disabled={!scanning} className="text-[#6B564C] hover:text-[#2B1723] disabled:opacity-50">
                {torchOn ? 'Turn off light' : 'Turn on light'}
              </button>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-[#E7D6CC] bg-[#FFFDFC] px-3 text-xs font-semibold text-[#6B564C]">
              Sound feedback
              <input id="qr-sound-feedback" name="qrSoundFeedback" type="checkbox" checked={soundEnabled} onChange={handleSoundToggle} className="rounded text-[#9A5260] focus:ring-[#9A5260]" />
            </label>
            <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-[#E7D6CC] bg-[#FFFDFC] px-3 text-xs font-semibold text-[#6B564C]">
              Vibration / haptic
              <input id="qr-haptic-feedback" name="qrHapticFeedback" type="checkbox" checked={hapticEnabled} onChange={handleHapticToggle} className="rounded text-[#9A5260] focus:ring-[#9A5260]" />
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-[#E7D6CC] bg-[#FFFDFC] p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="event-label">Manual ticket fallback</p>
                <p className="mt-1 text-xs leading-5 text-[#816D62]">Use this only when camera scanning is unavailable.</p>
              </div>
              {!manualLookupOpen && (
                <button
                  type="button"
                  onClick={openManualLookup}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-4 text-xs font-bold text-[#6B564C] hover:bg-[#FBF8F5]"
                >
                  <Keyboard className="size-4" />
                  Use Manual Ticket Lookup
                </button>
              )}
            </div>
          </div>
          {manualLookupOpen && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Keyboard className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#B8A49A]" />
                <input
                  id="manual-ticket-code"
                  ref={manualInputRef}
                  value={manualValue}
                  onChange={(event) => setManualValue(event.target.value.toUpperCase())}
                  placeholder="TICKET-001 or GSV:TICKET:TICKET-001"
                  className="min-h-11 w-full rounded-xl border border-[#E5D7CF] bg-white py-3 pl-9 pr-3 text-sm font-semibold text-[#2B1723] focus:border-[#9A5260] focus:outline-none focus:ring-2 focus:ring-[#9A5260]/20"
                />
              </div>
              <button
                type="button"
              onClick={() => resolveTicket(manualValue, 'manual')}
                className="rounded-xl bg-[#2B1723] px-4 py-3 text-xs font-bold text-white hover:bg-[#3B2430]"
              >
                Find ticket
              </button>
            <button
              type="button"
              onClick={() => setManualLookupOpen(false)}
              className="rounded-xl border border-[#E7D6CC] bg-white px-4 py-3 text-xs font-bold text-[#6B564C] hover:bg-[#FBF8F5]"
            >
              Close
            </button>
            </div>
          )}
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
