import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#FFF8F2] p-6 text-center">
      <div>
        <div className="mb-10 flex justify-center">
          <BrandMark />
        </div>
        <p className="font-serif text-8xl italic text-[#E9B7C0]">404</p>
        <h1 className="mt-3 font-serif text-3xl text-[#2B1723]">This place isn’t on the guest list.</h1>
        <p className="mt-3 text-sm text-[#806C61]">The page may have moved or the address may be incorrect.</p>
        <Link to="/dashboard" className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-[#8A3F4B]">
          <ArrowLeft className="size-4" /> Return to the event hub
        </Link>
      </div>
    </main>
  )
}
