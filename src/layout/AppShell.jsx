import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Bot,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  FileInput,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Search,
  Settings,
  Sparkles,
  TicketCheck,
  UsersRound,
  X,
} from 'lucide-react'
import { BrandMark } from '../components/BrandMark'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { formatEventDate } from '../utils/dateUtils'

const navGroups = [
  {
    label: 'Overview',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, phase: 1 }],
  },
  {
    label: 'Event operations',
    items: [
      { to: '/events', label: 'Events', icon: CalendarDays, available: true },
      { to: '/registrations', label: 'Registrations', icon: UsersRound, available: true },
      { to: '/tickets', label: 'Tickets', icon: TicketCheck, available: true },
      { to: '/check-in', label: 'Check-In', icon: ClipboardCheck, available: true },
      { to: '/imports', label: 'Import Center', icon: FileInput, available: true },
    ],
  },
  {
    label: 'Guest experience',
    items: [
      { to: '/communications', label: 'Communication', icon: MessageSquareText, phase: 6 },
      { to: '/ai-writing', label: 'AI Writing', icon: Bot, phase: 7 },
    ],
  },
]

const pageTitles = {
  '/dashboard': ['Dashboard', 'Your event operations at a glance'],
  '/events': ['Events', 'Plan and organize every gathering'],
  '/registrations': ['Registrations', 'Keep your guest list beautifully organized'],
  '/tickets': ['Tickets', 'Assign and track ticket codes'],
  '/check-in': ['Check-In', 'Fast, confident event-day admissions'],
  '/imports': ['Import Center', 'Bring in CSV exports and pasted table rows safely'],
  '/communications': ['Communication Center', 'Prepare messages for the right guests'],
  '/ai-writing': ['AI Writing Assistant', 'Create polished drafts for review'],
  '/settings': ['Settings', 'Manage workspace configuration'],
}

function SidebarContent({ onNavigate }) {
  const { user, signOut } = useAuth()
  const { activeEvent } = useActiveEvent()

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pb-7 pt-6">
        <BrandMark light />
      </div>

      <div className="mx-4 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.24em] text-[#D7B8BD]">Current event</p>
        <Link to="/events" onClick={onNavigate} className="flex w-full items-center justify-between gap-3 text-left">
          <span>
            <span className="block truncate text-sm font-medium text-white">{activeEvent?.eventName || 'No event selected'}</span>
            <span className="mt-0.5 block text-[11px] text-white/45">
              {activeEvent ? formatEventDate(activeEvent.eventDate) : 'Choose one from Events'}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-white/30" aria-hidden="true" />
        </Link>
      </div>

      <nav className="mt-5 flex-1 overflow-y-auto px-3 pb-4" aria-label="Main navigation">
        {navGroups.map((group) => (
          <div className="mb-5" key={group.label}>
            <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.22em] text-white/30">{group.label}</p>
            <div className="space-y-1">
              {group.items.map(({ to, label, icon: Icon, phase, available }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition ${
                      isActive
                        ? 'bg-[#B76E79] text-white shadow-[0_8px_24px_rgba(183,110,121,0.2)]'
                        : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
                    }`
                  }
                >
                  <Icon className="size-[17px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  <span className="flex-1">{label}</span>
                  {phase > 1 && !available && (
                    <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[8px] font-bold text-white/30 group-[.active]:text-white/70">
                      P{phase}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            `mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition ${
              isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/[0.06] hover:text-white'
            }`
          }
        >
          <Settings className="size-[17px]" strokeWidth={1.8} aria-hidden="true" />
          Settings
        </NavLink>
        <div className="flex items-center gap-3 rounded-xl bg-black/10 p-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#F7DDE6] text-xs font-bold uppercase text-[#2B1723]">
            {user?.email?.slice(0, 1) || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">Admin</p>
            <p className="truncate text-[10px] text-white/40">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg p-2 text-white/40 transition hover:bg-white/10 hover:text-white"
            aria-label="Sign out"
          >
            <LogOut className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const [title, subtitle] = pageTitles[location.pathname] || ['Event Hub', 'Gather & Savor Vibes']

  return (
    <div className="min-h-screen bg-[#FFF8F2] text-[#2B1723]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[258px] bg-[#2B1723] lg:block">
        <SidebarContent />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-[#160B12]/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
            type="button"
          />
          <aside className="relative h-full w-[286px] bg-[#2B1723] shadow-2xl">
            <button
              className="absolute right-3 top-3 rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              type="button"
            >
              <X className="size-5" />
            </button>
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[258px]">
        <header className="app-safe-top sticky top-0 z-20 border-b border-[#EEDDD3] bg-[#FFF8F2]/90 px-4 py-3.5 backdrop-blur-xl sm:px-7 sm:py-4 lg:px-10">
          <div className="mx-auto flex max-w-[1480px] items-center gap-4">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="rounded-xl border border-[#E7D6CC] bg-white p-2.5 text-[#2B1723] lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-serif text-xl sm:text-2xl">{title}</h1>
              <p className="mt-0.5 hidden text-xs text-[#8C766A] sm:block">{subtitle}</p>
            </div>
            <div className="hidden min-w-[220px] items-center gap-2 rounded-xl border border-[#E7D6CC] bg-white px-3.5 py-2.5 text-left text-xs text-[#9B867A] shadow-sm md:flex">
              <Search className="size-4" aria-hidden="true" />
              <span className="italic">Local search available in Registrations</span>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-[#E7D6CC] bg-white py-1.5 pl-2 pr-3 sm:flex">
              <span className="grid size-7 place-items-center rounded-full bg-[#F7DDE6]">
                <Sparkles className="size-3.5 text-[#B76E79]" aria-hidden="true" />
              </span>
              <span className="text-[11px] font-semibold text-[#6B564C]">Private admin</span>
            </div>
          </div>
        </header>

        <main className="px-4 pb-28 pt-6 sm:px-7 sm:pt-7 lg:px-10 lg:py-9">
          <div className="mx-auto max-w-[1480px]">
            <Outlet />
          </div>
        </main>

        <nav className="mobile-tab-bar lg:hidden" aria-label="Mobile navigation">
          <NavLink to="/dashboard" className={({ isActive }) => `mobile-tab-item ${isActive ? 'mobile-tab-item-active' : ''}`}>
            <LayoutDashboard className="size-5" strokeWidth={1.8} aria-hidden="true" />
            <span>Home</span>
          </NavLink>
          <NavLink to="/events" className={({ isActive }) => `mobile-tab-item ${isActive ? 'mobile-tab-item-active' : ''}`}>
            <CalendarDays className="size-5" strokeWidth={1.8} aria-hidden="true" />
            <span>Events</span>
          </NavLink>
          <button type="button" onClick={() => setMenuOpen(true)} className="mobile-tab-item" aria-label="Open all navigation">
            <Menu className="size-5" strokeWidth={1.8} aria-hidden="true" />
            <span>More</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
