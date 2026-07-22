import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Copy, Download, QrCode } from 'lucide-react'
import { qrPayloadForTicketCode } from '../../utils/qrTicketUtils'

export function TicketQrCode({ ticketCode, compact = false }) {
  const [dataUrl, setDataUrl] = useState('')
  const [status, setStatus] = useState('')
  const payload = qrPayloadForTicketCode(ticketCode)

  useEffect(() => {
    let cancelled = false

    if (!payload) {
      return () => {
        cancelled = true
      }
    }

    QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: compact ? 112 : 160,
      color: {
        dark: '#2B1723',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setStatus('QR preview unavailable.')
      })

    return () => {
      cancelled = true
    }
  }, [compact, payload])

  async function copyPayload() {
    if (!payload) return
    try {
      await navigator.clipboard.writeText(payload)
      setStatus('QR ticket code copied.')
    } catch {
      setStatus('Copy failed. Use the visible ticket code.')
    }
  }

  function downloadQr() {
    if (!dataUrl || !ticketCode) return
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `${ticketCode}-qr.png`
    link.click()
  }

  if (!payload) return null

  return (
    <div className={`rounded-xl border border-[#EEDFD6] bg-[#FBF8F5] p-3 ${compact ? 'max-w-[9rem]' : 'max-w-[12rem]'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#80685B]">Ticket QR</p>
        <QrCode className="size-4 text-[#9A5260]" />
      </div>
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={`QR code for ticket ${ticketCode}`}
          className="mt-2 aspect-square w-full rounded-lg border border-[#E5D7CF] bg-white p-1"
        />
      ) : (
        <div className="mt-2 grid aspect-square w-full place-items-center rounded-lg border border-[#E5D7CF] bg-white text-[10px] text-[#80685B]">
          Loading QR
        </div>
      )}
      <p className="mt-2 break-all font-mono text-[10px] font-bold text-[#2B1723]">{payload}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={copyPayload}
          className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border border-[#E7D6CC] bg-white text-[#6B564C] hover:bg-[#F7F1ED]"
          title="Copy QR ticket payload"
          aria-label="Copy QR ticket payload"
        >
          <Copy className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={downloadQr}
          disabled={!dataUrl}
          className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg bg-[#2B1723] text-white hover:bg-[#3B2430] disabled:opacity-50"
          title="Download QR code"
          aria-label="Download QR code"
        >
          <Download className="size-3.5" />
        </button>
      </div>
      {status && <p className="mt-2 text-[10px] text-[#6B564C]">{status}</p>}
    </div>
  )
}
