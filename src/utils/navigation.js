import { canViewRoute } from './accessRoles.js'

export const MOBILE_PRIMARY_NAV_ITEMS = [
  { to: '/dashboard', label: 'Home', icon: 'LayoutDashboard' },
  { to: '/registrations', label: 'Guests', icon: 'UsersRound' },
  { to: '/tickets', label: 'Tickets', icon: 'TicketCheck' },
  { to: '/check-in', label: 'Check-In', icon: 'ClipboardCheck' },
]

export function mobilePrimaryNavigationForAccess(access) {
  const seen = new Set()
  return MOBILE_PRIMARY_NAV_ITEMS.filter((item) => {
    if (seen.has(item.to) || !canViewRoute(access, item.to)) return false
    seen.add(item.to)
    return true
  })
}
