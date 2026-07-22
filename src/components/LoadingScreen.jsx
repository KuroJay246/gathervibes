import { BrandMark } from './BrandMark'

export function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#FFF8F2]">
      <div className="flex flex-col items-center gap-5" role="status" aria-label="Loading dashboard">
        <BrandMark />
        <div className="h-1 w-32 overflow-hidden rounded-full bg-[#F7DDE6]">
          <div className="loading-bar h-full w-1/2 rounded-full bg-[#9A5260]" />
        </div>
        <p className="text-sm text-[#78655B]">Preparing your event hub…</p>
      </div>
    </main>
  )
}
