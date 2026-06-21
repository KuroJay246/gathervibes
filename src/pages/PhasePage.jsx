import { ArrowLeft, Clock3, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router-dom'

export function PhasePage({ title, phase, description }) {
  return (
    <section className="grid min-h-[calc(100vh-190px)] place-items-center">
      <div className="w-full max-w-2xl rounded-[28px] border border-[#EEDFD6] bg-white px-6 py-10 text-center shadow-[0_16px_50px_rgba(84,53,67,0.07)] sm:px-12 sm:py-14">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#FCEEF1] text-[#B76E79]">
          <LockKeyhole className="size-7" strokeWidth={1.6} />
        </div>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#FFF4DF] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#986F26]">
          <Clock3 className="size-3.5" />
          Scheduled for {phase}
        </div>
        <h2 className="mt-5 font-serif text-3xl text-[#2B1723]">{title}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#816D62]">{description}</p>
        <p className="mx-auto mt-5 max-w-lg rounded-xl bg-[#FFF8F2] px-4 py-3 text-xs leading-5 text-[#8A7468]">
          This area is routed and protected, but intentionally has no fake data or inactive controls. It will be enabled when its phase is implemented end to end.
        </p>
        <Link
          to="/dashboard"
          className="mt-7 inline-flex items-center gap-2 text-xs font-bold text-[#A85F6B] transition hover:text-[#7D3F4A]"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>
      </div>
    </section>
  )
}
