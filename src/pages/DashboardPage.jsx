import { ArrowRight, CalendarDays, Check, Database, Flame, LockKeyhole, MapPin, PartyPopper, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveEvent } from '../events/useActiveEvent'
import { formatEventDate } from '../utils/dateUtils'

const foundationItems = [
  { label: 'Private sign-in', detail: 'Firebase email and password authentication', icon: LockKeyhole },
  { label: 'Protected workspace', detail: 'Every admin route requires an active session', icon: ShieldCheck },
  { label: 'Firestore access rules', detail: 'Approved-email allowlist with no public access', icon: Database },
  { label: 'Hosting ready', detail: 'Firebase Hosting SPA configuration included', icon: Flame },
]

export function DashboardPage() {
  const { activeEvent } = useActiveEvent()

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-[#2B1723] px-6 py-8 text-white shadow-[0_18px_50px_rgba(43,23,35,0.15)] sm:px-9 sm:py-10 lg:px-12">
        <div className="absolute -right-16 -top-24 size-72 rounded-full bg-[#C98291]/20 blur-3xl" />
        <div className="absolute -bottom-24 right-40 size-56 rounded-full bg-[#F5E6C8]/10 blur-3xl" />
        <div className="relative z-10 grid items-end gap-8 lg:grid-cols-[1fr_auto]">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#F5E6C8]/15 bg-[#F5E6C8]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5E6C8]">
              <Check className="size-3.5" strokeWidth={2.5} />
              Phase 2 event planning live
            </div>
            <h2 className="font-serif text-3xl leading-tight sm:text-4xl lg:text-[44px]">
              {activeEvent ? 'Now planning ' : 'The table is set for your'}
              <span className="italic text-[#E9B7C0]"> {activeEvent?.eventName || 'next gathering.'}</span>
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/55">
              {activeEvent
                ? `${formatEventDate(activeEvent.eventDate)} · ${activeEvent.location}`
                : 'Create an event and choose it as active to give your team a clear planning context.'}
            </p>
          </div>
          <Link
            to="/events"
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-[#B76E79] px-5 py-3 text-xs font-bold text-white shadow-lg shadow-black/15 transition hover:bg-[#C57C88]"
          >
            {activeEvent ? 'Manage events' : 'Create an event'}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Workspace status">
        {foundationItems.map(({ label, detail, icon: Icon }) => (
          <article key={label} className="rounded-2xl border border-[#EEDFD6] bg-white p-5 shadow-[0_8px_24px_rgba(84,53,67,0.05)]">
            <div className="mb-5 flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-xl bg-[#FCEEF1] text-[#B76E79]">
                <Icon className="size-[18px]" strokeWidth={1.8} />
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF6EF] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#2F855A]">
                <Check className="size-3" strokeWidth={3} /> Ready
              </span>
            </div>
            <h3 className="text-sm font-bold text-[#3A2630]">{label}</h3>
            <p className="mt-1.5 text-xs leading-5 text-[#8A7468]">{detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <article className="rounded-[24px] border border-[#EEDFD6] bg-white p-6 shadow-[0_8px_24px_rgba(84,53,67,0.04)] sm:p-7">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#B76E79]">Event workspace</p>
              <h3 className="mt-2 font-serif text-2xl text-[#2B1723]">{activeEvent ? 'Active event' : 'Choose your focus'}</h3>
            </div>
            <span className="rounded-full bg-[#EAF6EF] px-3 py-1.5 text-[10px] font-bold text-[#2F855A]">Phase 2 ready</span>
          </div>
          <div className="rounded-2xl bg-[#FFF8F2] p-5">
            <div className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#F5E6C8] text-[#80622B]">
                <PartyPopper className="size-5" strokeWidth={1.8} />
              </span>
              <div>
                <h4 className="text-sm font-bold text-[#3A2630]">{activeEvent?.eventName || 'No active event selected'}</h4>
                <p className="mt-1 text-xs leading-5 text-[#8A7468]">
                  {activeEvent
                    ? <><span className="inline-flex items-center gap-1"><CalendarDays className="size-3" /> {formatEventDate(activeEvent.eventDate)}</span><span className="mx-2">·</span><span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {activeEvent.location}</span></>
                    : 'Create an event in Firestore, then select it as active for this workspace.'}
                </p>
              </div>
            </div>
          </div>
          <p className="mt-5 text-xs leading-5 text-[#8A7468]">
            Event create, edit, delete, active selection, and append-only audit entries are available from the Events page. Registration metrics remain intentionally unavailable until Phase 3.
          </p>
        </article>

        <article className="rounded-[24px] border border-[#E6D4B4] bg-[#F8E9CB] p-6 sm:p-7">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#86662C]">Version 1 boundaries</p>
          <h3 className="mt-2 font-serif text-2xl text-[#4E3928]">Intentionally focused</h3>
          <ul className="mt-6 space-y-3 text-xs text-[#715D46]">
            {['No public attendee accounts', 'No payment processing', 'No automatic social posting', 'No Cloud Functions or Storage'].map((item) => (
              <li className="flex items-center gap-3" key={item}>
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/70 text-[#86662C]">
                  <Check className="size-3" strokeWidth={2.5} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  )
}
