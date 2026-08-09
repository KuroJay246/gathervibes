import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  Building2,
  Boxes,
  FileInput,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  ReceiptText,
  ScrollText,
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
import { ProductFooter } from '../components/ProductFooter'
import { mobilePrimaryNavigationForAccess } from '../utils/navigation'
import { TutorialProvider } from '../tutorial/TutorialProvider'
import { isTestEvent } from '../utils/eventPlanning'
import { pageGuidance } from '../utils/pageGuidance'

const navGroups = [
  {
    label: 'Plan',
    items: [
      { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { to: '/events', label: 'Events', icon: CalendarDays },
      { to: '/tasks', label: 'Tasks & Deadlines', icon: ClipboardList },
      { to: '/contacts', label: 'Contacts & Organizations', icon: Building2 },
      { to: '/documents', label: 'Documents', icon: FileText },
    ],
  },
  {
    label: 'Guests & Attendance',
    items: [
      { to: '/registrations', label: 'Guests & Registrations', icon: UsersRound },
      { to: '/tickets', label: 'Tickets', icon: TicketCheck },
      { to: '/check-in', label: 'Check-In', icon: ClipboardCheck },
    ],
  },
  {
    label: 'Event Day',
    items: [
      { to: '/run-of-show', label: 'Run of Show', icon: ScrollText },
      { to: '/resources', label: 'Equipment & Supplies', icon: Boxes },
    ],
  },
  {
    label: 'Money & Follow-Up',
    items: [
      { to: '/payments', label: 'Registration Payments', icon: CreditCard },
      { to: '/operations', label: 'Operations & Commitments', icon: ReceiptText },
      { to: '/event-review', label: 'Reports', icon: ClipboardCheck },
      { to: '/payments/reconciliation', label: 'Reconciliation Preview', icon: ReceiptText },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/imports', label: 'Import Center & Response Inbox', icon: FileInput },
      { to: '/communications', label: 'Message Builder', icon: MessageSquareText },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings', label: 'Settings', icon: Settings },
      { to: '/qa', label: 'System QA', icon: ShieldCheck },
    ],
  },
]

const mobileMoreGroups = [
  {
    label: 'Plan',
    items: [
      { to: '/events', label: 'Events', icon: CalendarDays },
      { to: '/tasks', label: 'Tasks & Deadlines', icon: ClipboardList },
      { to: '/contacts', label: 'Contacts & Organizations', icon: Building2 },
      { to: '/documents', label: 'Documents', icon: FileText },
    ],
  },
  {
    label: 'Event Day',
    items: [
      { to: '/run-of-show', label: 'Run of Show', icon: ScrollText },
      { to: '/resources', label: 'Equipment & Supplies', icon: Boxes },
    ],
  },
  {
    label: 'Money & Follow-Up',
    items: [
      { to: '/payments', label: 'Registration Payments', icon: CreditCard },
      { to: '/operations', label: 'Operations & Commitments', icon: ReceiptText },
      { to: '/event-review', label: 'Reports', icon: ClipboardCheck },
      { to: '/payments/reconciliation', label: 'Reconciliation Preview', icon: ReceiptText },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/imports', label: 'Import Center', icon: FileInput },
      { to: '/communications', label: 'Message Builder', icon: MessageSquareText },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings', label: 'Settings', icon: Settings },
      { to: '/qa', label: 'System QA', icon: ShieldCheck },
    ],
  },
]

const pageTitles = {
  '/dashboard': ['Overview', 'Current event status, priorities, and next actions'],
  '/events': ['Events', 'Plan and organize every gathering'],
  '/tasks': ['Tasks & Deadlines', 'Event-scoped work, blockers, and follow-up dates'],
  '/registrations': ['Guests & Registrations', 'Manage registration records and guest counts'],
  '/payments': ['Registration Payments', 'Review registration charges, payments, balances, and follow-up'],
  '/payments/reconciliation': ['Reconciliation Preview', 'Read-only payment workbook comparison'],
  '/tickets': ['Tickets', 'Assign ticket codes and prepare QR access'],
  '/check-in': ['Check-In', 'Track event-day attendance'],
  '/operations': ['Operations', 'Track event-level money and obligations'],
  '/run-of-show': ['Run of Show', 'Event-day sequence, supplier arrivals, dependencies, and Now/Next'],
  '/resources': ['Equipment & Supplies', 'Equipment, supplies, packing, pickup, and return tracking'],
  '/documents': ['Documents', 'Event document references, links, and evidence'],
  '/contacts': ['Contacts & Organizations', 'Reusable people, businesses, and event relationships'],
  '/event-review': ['Reports', 'Read-only follow-up, payments, operations, and summary'],
  '/imports': ['Import Center', 'Bring in CSV exports and pasted table rows safely'],
  '/qa': ['System QA', 'System health, data checks, and safe test guidance'],
  '/communications': ['Message Builder', 'Create, personalize, and copy event messages'],
  '/settings': ['Settings', 'Practical workspace and event defaults'],
}

const mobileIconMap = {
  LayoutDashboard,
  UsersRound,
  TicketCheck,
  ClipboardCheck,
}

function SidebarContent({ onNavigate, mobile = false, groups = navGroups, collapsed = false, onToggleCollapsed }) {
  const { user, signOut, currentRoleLabel, access } = useAuth()
  const { activeEvent } = useActiveEvent()
  const adminUser = isApprovedAdmin(access)
  const settingsAllowed = canUseSettings(access)
  const demoEventSelected = activeEvent && isTestEvent(activeEvent)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`flex items-center ${collapsed ? 'justify-center px-3' : 'justify-between px-6'} pb-6 pt-6`}>
        <Link to="/dashboard" onClick={onNavigate} className="block focus:outline-none focus:ring-2 focus:ring-[#F5E6C8]/60" aria-label="Go to Overview">
          <BrandMark light compact={collapsed} />
        </Link>
        {!mobile && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`${collapsed ? 'absolute right-[-0.9rem] top-7' : ''} hidden rounded-full border border-white/15 bg-white/10 p-2 text-white/70 transition hover:bg-white/15 hover:text-white lg:inline-flex`}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        )}
      </div>

      <div data-tour-id="working-event-selector" className={`${collapsed ? 'mx-3 p-2.5' : 'mx-4 p-3.5'} max-w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06]`}>
        <p className={`${collapsed ? 'sr-only' : 'mb-2'} text-[9px] font-bold uppercase tracking-[0.24em] text-[#D7B8BD]`}>Working Event</p>
        <Link to={adminUser ? '/events' : '/check-in'} onClick={onNavigate} className="flex w-full min-w-0 items-center justify-between gap-3 text-left">
          <span className="min-w-0 flex-1 overflow-hidden">
            <span className={`${collapsed ? 'sr-only' : 'block'} max-w-full truncate text-sm font-medium text-white`}>{activeEvent?.eventName || 'No event selected'}</span>
            <span className={`${collapsed ? 'sr-only' : 'mt-0.5 block'} max-w-full truncate text-[11px] text-white/70`}>
              {activeEvent ? `${formatEventDate(activeEvent.eventDate)} · ${activeEvent.status || 'status not set'}` : adminUser ? 'Choose one from Events' : 'Assigned event required'}
            </span>
            {demoEventSelected && !collapsed && (
              <span className="mt-2 inline-flex rounded-full bg-[#FFF4DF] px-2 py-1 text-[8px] font-bold uppercase tracking-[0.16em] text-[#7A5818]">
                Training event · safe to practice
              </span>
            )}
            {collapsed && <CalendarDays className="mx-auto size-5 text-white/80" aria-hidden="true" />}
          </span>
          {!collapsed && <ChevronDown className="size-4 shrink-0 text-white/65" aria-hidden="true" />}
        </Link>
      </div>

      <nav className="mt-5 min-h-0 flex-1 overflow-y-auto px-3 pb-4" aria-label="Main navigation">
        {groups.map((group) => (
          <div className="mb-5" key={group.label}>
            <p className={`${collapsed ? 'sr-only' : 'mb-2 px-3'} text-[9px] font-bold uppercase tracking-[0.22em] text-white/65`}>{group.label}</p>
            <div className="space-y-1">
              {group.items.reduce((links, { to, label, icon: Icon }) => {
                if (!canViewRoute(access, to)) return links
                links.push(
                  <NavLink
                    key={to}
                    to={to}
                    onClick={onNavigate}
                    title={collapsed ? label : undefined}
                    aria-label={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      `group flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} rounded-xl py-2.5 text-[13px] transition ${
                        isActive
                          ? 'bg-[#7F3E49] text-white shadow-[0_8px_24px_rgba(127,62,73,0.24)]'
                          : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                      }`
                    }
                  >
                    <Icon className="size-[17px] shrink-0" strokeWidth={1.8} aria-hidden="true" />
                    <span className={collapsed ? 'sr-only' : 'flex-1'}>{label}</span>
                  </NavLink>,
                )
                return links
              }, [])}
            </div>
          </div>
        ))}
      </nav>

      <div className={`shrink-0 border-t border-white/10 p-3 ${mobile ? 'pb-[max(1rem,env(safe-area-inset-bottom))]' : ''}`}>
        {settingsAllowed && <p className={`${collapsed ? 'sr-only' : 'mb-2 px-3'} text-[9px] font-bold uppercase tracking-[0.22em] text-white/65`}>Account</p>}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} rounded-xl bg-black/10 p-2.5`}>
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#F7DDE6] text-xs font-bold uppercase text-[#2B1723]">
            {user?.email?.slice(0, 1) || 'A'}
          </div>
          <div className={collapsed ? 'sr-only' : 'min-w-0 flex-1'}>
            <p className="truncate text-xs font-medium text-white">{currentRoleLabel || 'Admin'}</p>
            <p className="truncate text-[10px] text-white/70">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className={`${collapsed ? 'sr-only' : ''} rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white`}
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const location = useLocation()
  const { currentRoleLabel, access } = useAuth()
  const { activeEvent } = useActiveEvent()
  const [title, subtitle] = pageTitles[location.pathname] || ['Event Hub', 'Gather & Savor Vibes']
  const guidance = pageGuidance[location.pathname]
  const adminUser = isApprovedAdmin(access)
  const demoEventSelected = activeEvent && isTestEvent(activeEvent)

  return (
    <TutorialProvider>
    <div className="gsv-app-shell">
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden bg-[#2B1723] transition-[width] duration-200 lg:block"
        style={{ width: sidebarCollapsed ? '84px' : '258px' }}
      >
        <SidebarContent collapsed={sidebarCollapsed} onToggleCollapsed={() => setSidebarCollapsed((value) => !value)} />
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

      <div className="min-w-0 transition-[padding] duration-200 lg:pl-[var(--shell-sidebar-width)]" style={{ '--shell-sidebar-width': sidebarCollapsed ? '84px' : '258px' }}>
        <header className="app-safe-top sticky top-0 z-20 border-b border-[#EEDDD3] bg-[#FFF8F2]/90 px-4 py-3.5 backdrop-blur-xl sm:px-7 sm:py-4 lg:px-10">
          <div className="gsv-page-container flex items-center gap-4">
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

        <main className="px-3 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 sm:px-7 sm:pt-7 lg:px-10 lg:py-9">
          <div className="gsv-page-container">
            <div data-tour-id="working-event-selector" className="mb-5 rounded-2xl border border-[#EEDDD3] bg-white px-4 py-3 shadow-[0_6px_18px_rgba(84,53,67,0.04)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#8A3F4B]">Everything here is scoped to</p>
                  <p className="mt-1 truncate text-sm font-bold text-[#2B1723]">{activeEvent?.eventName || 'No selected Working Event'}</p>
                  <p className="mt-0.5 text-xs text-[#5F493F]">
                    {activeEvent ? `${formatEventDate(activeEvent.eventDate)} · ${activeEvent.status || 'status not set'}` : 'Choose an event before using event-scoped pages.'}
                  </p>
                  {demoEventSelected && (
                    <p className="mt-2 inline-flex rounded-full bg-[#FFF4DF] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#7A5818]">
                      Training event · safe to practice with example data
                    </p>
                  )}
                </div>
                <Link to="/events" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#E7D6CC] px-4 text-xs font-bold text-[#6B564C] hover:bg-[#FFF8F2]">
                  Change event
                </Link>
              </div>
            </div>
            {guidance && (
              <section data-tour-id="page-purpose" className="mb-5 rounded-2xl border border-[#EEDDD3] bg-[#FFFCFA] px-4 py-3 shadow-[0_6px_18px_rgba(84,53,67,0.03)]">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#8A3F4B]">{guidance.label}</p>
                    <h2 className="sr-only">How to use this page</h2>
                    <p className="mt-1 text-sm leading-6 text-[#4F3B33]">{guidance.purpose}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 md:max-w-xl">
                    <p className="rounded-xl bg-white px-3 py-2 text-xs font-semibold leading-5 text-[#2B1723] ring-1 ring-[#E7D6CC]">
                      <span className="block text-[9px] uppercase tracking-[0.16em] text-[#8A3F4B]">Primary action</span>
                      {guidance.primaryAction}
                    </p>
                    <p className="rounded-xl bg-white px-3 py-2 text-xs font-semibold leading-5 text-[#6B564C] ring-1 ring-[#E7D6CC]">
                      <span className="block text-[9px] uppercase tracking-[0.16em] text-[#8A3F4B]">Automatic boundary</span>
                      {guidance.boundary}
                    </p>
                  </div>
                </div>
              </section>
            )}
            <Outlet />
            <ProductFooter />
          </div>
        </main>

        <nav className="mobile-tab-bar lg:hidden" aria-label="Mobile navigation">
          {mobilePrimaryNavigationForAccess(access).map(({ to, label, icon }) => {
            const Icon = mobileIconMap[icon]
            return (
            <NavLink key={to} to={to} className={({ isActive }) => `mobile-tab-item ${isActive ? 'mobile-tab-item-active' : ''}`}>
              <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
            )
          })}
          <button type="button" onClick={() => setMenuOpen(true)} className="mobile-tab-item" aria-label="Open all navigation">
            <Menu className="size-5" strokeWidth={1.8} aria-hidden="true" />
            <span>More</span>
          </button>
        </nav>
      </div>
    </div>
    </TutorialProvider>
  )
}
