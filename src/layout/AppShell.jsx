import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  FileInput,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  UsersRound,
  X,
} from 'lucide-react'
import { BrandMark } from '../components/BrandMark'
import { AdminSearch } from '../components/AdminSearch'
import { useAuth } from '../auth/useAuth'
import { useActiveEvent } from '../events/useActiveEvent'
import { formatEventDate } from '../utils/dateUtils'
import { canUseSettings, canViewRoute, isApprovedAdmin } from '../utils/accessRoles'

const navGroups = [
  {
    label: 'Daily workspace',
    items: [
      { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { to: '/events', label: 'Events', icon: CalendarDays },
      { to: '/registrations', label: 'Guests & Registrations', icon: UsersRound },
      { to: '/payments', label: 'Payments', icon: CreditCard },
      { to: '/tickets', label: 'Tickets', icon: TicketCheck },
      { to: '/check-in', label: 'Check-In', icon: ClipboardCheck },
      { to: '/operations', label: 'Operations', icon: ReceiptText },
      { to: '/communications', label: 'Message Builder', icon: MessageSquareText },
      { to: '/event-review', label: 'Reports', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/imports', label: 'Import Center', icon: FileInput },
      { to: '/settings', label: 'Settings', icon: Settings },
      { to: '/qa', label: 'System QA', icon: ShieldCheck },
    ],
  },
]

const mobileMoreGroups = [
  {
    label: 'More workspace',
    items: [
      { to: '/events', label: 'Events', icon: CalendarDays },
      { to: '/payments', label: 'Payments', icon: CreditCard },
      { to: '/operations', label: 'Operations', icon: ReceiptText },
      { to: '/communications', label: 'Message Builder', icon: MessageSquareText },
      { to: '/event-review', label: 'Reports', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/imports', label: 'Import Center', icon: FileInput },
      { to: '/settings', label: 'Settings', icon: Settings },
      { to: '/qa', label: 'System QA', icon: ShieldCheck },
    ],
  },
]

const pageTitles = {
  '/dashboard': ['Overview', 'Current event status, priorities, and next actions'],
  '/events': ['Events', 'Plan and organize every gathering'],
  '/registrations': ['Guests & Registrations', 'Manage registration records and guest counts'],
  '/payments': ['Payments', 'Review registration charges, payments, balances, and follow-up'],
  '/payments/reconciliation': ['Reconciliation Preview', 'Read-only CPB payment audit comparison'],
  '/tickets': ['Tickets', 'Assign ticket codes and prepare QR access'],
  '/check-in': ['Check-In', 'Track event-day attendance'],
  '/operations': ['Operations', 'Track event-level money and obligations'],
  '/event-review': ['Reports', 'Read-only follow-up, payments, operations, and summary'],
  '/imports': ['Import Center', 'Bring in CSV exports and pasted table rows safely'],
  '/qa': ['System QA', 'System health, data checks, and safe test guidance'],
  '/communications': ['Message Builder', 'Create, personalize, and copy event messages'],
  '/settings': ['Settings', 'Practical workspace and event defaults'],
}

function SidebarContent({ onNavigate, mobile = false, groups = navGroups }) {
  const { user, signOut, currentRoleLabel, access } = useAuth()
  const { activeEvent } = useActiveEvent()
  const adminUser = isApprovedAdmin(access)
  const settingsAllowed = canUseSettings(access)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Link to="/dashboard" onClick={onNavigate} className="block px-6 pb-7 pt-6 focus:outline-none focus:ring-2 focus:ring-[#F5E6C8]/60" aria-label="Go to Overview">
        <BrandMark light />
      </Link>

      <div className="mx-4 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-3.5">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.24em] text-[#D7B8BD]">Working Event</p>
        <Link to={adminUser ? '/events' : '/check-in'} onClick={onNavigate} className="flex w-full min-w-0 items-center justify-between gap-3 text-left">
          <span className="min-w-0 flex-1 overflow-hidden">
            <span className="block max-w-full truncate text-sm font-medium text-white">{activeEvent?.eventName || 'No event selected'}</span>
            <span className="mt-0.5 block max-w-full truncate text-[11px] text-white/70">
              {activeEvent ? `${formatEventDate(activeEvent.eventDate)} · ${activeEvent.status || 'status not set'}` : adminUser ? 'Choose one from Events' : 'Assigned event required'}
            </span>
          </span>
          <ChevronDown className="size-4 shrink-0 text-white/65" aria-hidden="true" />
        </Link>
      </div>

      <nav className="mt-5 min-h-0 flex-1 overflow-y-auto px-3 pb-4" aria-label="Main navigation">
        {groups.map((group) => (
          <div className="mb-5" key={group.label}>
            <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.22em] text-white/65">{group.label}</p>
            <div className="space-y-1">
              {group.items.reduce((links, { to, label, icon: Icon }) => {
                if (!canViewRoute(access, to)) return links
                links.push(
                  <NavLink
                    key={to}
                    to={to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition ${
                        isActive
                          ? 'bg-[#7F3E49] text-white shadow-[0_8px_24px_rgba(127,62,73,0.24)]'
                          : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                      }`
                    }
                  >
                    <Icon className="size-[17px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                    <span className="flex-1">{label}</span>
                  </NavLink>,
                )
                return links
              }, [])}
            </div>
          </div>
        ))}
      </nav>

      <div className={`shrink-0 border-t border-white/10 p-3 ${mobile ? 'pb-[max(1rem,env(safe-area-inset-bottom))]' : ''}`}>
        {settingsAllowed && <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.22em] text-white/65">Account</p>}
        <div className="flex items-center gap-3 rounded-xl bg-black/10 p-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#F7DDE6] text-xs font-bold uppercase text-[#2B1723]">
            {user?.email?.slice(0, 1) || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">{currentRoleLabel || 'Admin'}</p>
            <p className="truncate text-[10px] text-white/70">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
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
  const { currentRoleLabel, access } = useAuth()
  const { activeEvent } = useActiveEvent()
  const [title, subtitle] = pageTitles[location.pathname] || ['Event Hub', 'Gather & Savor Vibes']
  const adminUser = isApprovedAdmin(access)

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
          <aside className="relative h-[100dvh] w-[min(20rem,calc(100vw-2rem))] overflow-hidden bg-[#2B1723] shadow-2xl">
            <button
              className="absolute right-3 top-3 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              type="button"
            >
              <X className="size-5" />
            </button>
            <SidebarContent onNavigate={() => setMenuOpen(false)} mobile groups={mobileMoreGroups} />
          </aside>
        </div>
      )}

      <div className="min-w-0 lg:pl-[258px]">
        <header className="app-safe-top sticky top-0 z-20 border-b border-[#EEDDD3] bg-[#FFF8F2]/90 px-4 py-3.5 backdrop-blur-xl sm:px-7 sm:py-4 lg:px-10">
          <div className="mx-auto flex max-w-[1480px] items-center gap-4">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="rounded-xl border border-[#E7D6CC] bg-white p-2.5 text-[#2B1723] lg:hidden"
              aria-label="Open navigation"
              aria-expanded={menuOpen}
            >
              <Menu className="size-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-serif text-xl sm:text-2xl">{title}</h1>
              <p className="mt-0.5 hidden text-xs text-[#5F493F] sm:block">{subtitle}</p>
            </div>
            {adminUser && <AdminSearch />}
            <div className="hidden items-center gap-2 rounded-full border border-[#E7D6CC] bg-white py-1.5 pl-2 pr-3 sm:flex">
              <span className="grid size-7 place-items-center rounded-full bg-[#F7DDE6]">
                <Sparkles className="size-3.5 text-[#8A3F4B]" aria-hidden="true" />
              </span>
              <span className="text-[11px] font-semibold text-[#6B564C]">{currentRoleLabel || 'Private admin'}</span>
            </div>
          </div>
        </header>

        <main className="px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 sm:px-7 sm:pt-7 lg:px-10 lg:py-9">
          <div className="mx-auto max-w-[1480px] min-w-0 overflow-x-clip">
            <div className="mb-5 rounded-2xl border border-[#EEDDD3] bg-white px-4 py-3 shadow-[0_6px_18px_rgba(84,53,67,0.04)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#8A3F4B]">Everything here is scoped to</p>
                  <p className="mt-1 truncate text-sm font-bold text-[#2B1723]">{activeEvent?.eventName || 'No selected Working Event'}</p>
                  <p className="mt-0.5 text-xs text-[#5F493F]">
                    {activeEvent ? `${formatEventDate(activeEvent.eventDate)} · ${activeEvent.status || 'status not set'}` : 'Choose an event before using event-scoped pages.'}
                  </p>
                </div>
                <Link to="/events" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#E7D6CC] px-4 text-xs font-bold text-[#6B564C] hover:bg-[#FFF8F2]">
                  Change event
                </Link>
              </div>
            </div>
            <Outlet />
          </div>
        </main>

        <nav className="mobile-tab-bar lg:hidden" aria-label="Mobile navigation">
          {canViewRoute(access, '/dashboard') && (
            <NavLink to="/dashboard" className={({ isActive }) => `mobile-tab-item ${isActive ? 'mobile-tab-item-active' : ''}`}>
              <LayoutDashboard className="size-5" strokeWidth={1.8} aria-hidden="true" />
              <span>Overview</span>
            </NavLink>
          )}
          {canViewRoute(access, '/check-in') && !canViewRoute(access, '/dashboard') && (
            <NavLink to="/check-in" className={({ isActive }) => `mobile-tab-item ${isActive ? 'mobile-tab-item-active' : ''}`}>
              <ClipboardCheck className="size-5" strokeWidth={1.8} aria-hidden="true" />
              <span>Check-In</span>
            </NavLink>
          )}
          {canViewRoute(access, '/registrations') && (
            <NavLink to="/registrations" className={({ isActive }) => `mobile-tab-item ${isActive ? 'mobile-tab-item-active' : ''}`}>
              <UsersRound className="size-5" strokeWidth={1.8} aria-hidden="true" />
              <span>Guests</span>
            </NavLink>
          )}
          {canViewRoute(access, '/tickets') && (
            <NavLink to="/tickets" className={({ isActive }) => `mobile-tab-item ${isActive ? 'mobile-tab-item-active' : ''}`}>
              <TicketCheck className="size-5" strokeWidth={1.8} aria-hidden="true" />
              <span>Tickets</span>
            </NavLink>
          )}
          {canViewRoute(access, '/check-in') && (
            <NavLink to="/check-in" className={({ isActive }) => `mobile-tab-item ${isActive ? 'mobile-tab-item-active' : ''}`}>
              <ClipboardCheck className="size-5" strokeWidth={1.8} aria-hidden="true" />
              <span>Check-In</span>
            </NavLink>
          )}
          <button type="button" onClick={() => setMenuOpen(true)} className="mobile-tab-item" aria-label="Open all navigation">
            <Menu className="size-5" strokeWidth={1.8} aria-hidden="true" />
            <span>More</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
