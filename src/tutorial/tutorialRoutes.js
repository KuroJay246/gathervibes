export const TUTORIAL_ROUTE_DEFINITIONS = {
  dashboard: { routeId: 'dashboard', pathname: '/dashboard', label: 'Overview' },
  events: { routeId: 'events', pathname: '/events', label: 'Events' },
  registrations: { routeId: 'registrations', pathname: '/registrations', label: 'Guests & Registrations' },
  payments: { routeId: 'payments', pathname: '/payments', label: 'Payments' },
  tickets: { routeId: 'tickets', pathname: '/tickets', label: 'Tickets' },
  checkIn: { routeId: 'check-in', pathname: '/check-in', label: 'Check-In' },
  operations: { routeId: 'operations', pathname: '/operations', label: 'Operations' },
  communications: { routeId: 'communications', pathname: '/communications', label: 'Message Builder' },
  reports: { routeId: 'reports', pathname: '/event-review', label: 'Reports' },
  imports: { routeId: 'imports', pathname: '/imports', label: 'Import Center' },
  settings: { routeId: 'settings', pathname: '/settings', label: 'Settings' },
  systemQa: { routeId: 'system-qa', pathname: '/qa', label: 'System QA' },
}

export const TUTORIAL_PATH_TO_ROUTE_ID = Object.values(TUTORIAL_ROUTE_DEFINITIONS).reduce((map, route) => {
  map[route.pathname] = route.routeId
  return map
}, {})

export function routeForPathname(pathname) {
  return TUTORIAL_PATH_TO_ROUTE_ID[pathname] || null
}

export function routeDefinitionForId(routeId) {
  return Object.values(TUTORIAL_ROUTE_DEFINITIONS).find((route) => route.routeId === routeId) || null
}
