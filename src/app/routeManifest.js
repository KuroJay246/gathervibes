const route = (path, feature, section, options = {}) => Object.freeze({
  path,
  feature,
  section,
  requiresAuth: true,
  requiresWorkingEvent: false,
  allowedCapabilities: [],
  mobileAvailability: 'secondary',
  desktopAvailability: 'active',
  readModel: null,
  mutationService: null,
  privilegedMutation: false,
  realtime: false,
  qaCoverage: [],
  productionStatus: 'deployed',
  ...options,
})

export const EVENT_HUB_ROUTE_MANIFEST = Object.freeze([
  route('/dashboard', 'Event Overview', 'home', { navLabel: 'Overview', pageTitle: 'Event Overview', helpContext: 'Current event status, priorities, and next actions', readModel: 'buildDashboardOverviewModel', realtime: true, mobileAvailability: 'primary', qaCoverage: ['product-qa', 'e2e'] }),
  route('/events', 'Events', 'plan', { pageTitle: 'Events', helpContext: 'Plan and organize every gathering', allowedCapabilities: ['event.manage'], mobileAvailability: 'primary', mutationService: 'eventService', privilegedMutation: true, qaCoverage: ['product-qa', 'e2e'] }),
  route('/tasks', 'Tasks & Deadlines', 'plan', { pageTitle: 'Tasks & Deadlines', helpContext: 'Event-scoped work, blockers, and follow-up dates', requiresWorkingEvent: true, mutationService: 'taskService', realtime: true, qaCoverage: ['task-workflow'] }),
  route('/contacts', 'Contacts & Organizations', 'plan', { pageTitle: 'Contacts & Organizations', helpContext: 'Reusable people, businesses, and event relationships', mutationService: 'contactService', qaCoverage: ['document-contact-rules'] }),
  route('/documents', 'Documents', 'plan', { pageTitle: 'Documents', helpContext: 'Event document references, links, and evidence', requiresWorkingEvent: true, mutationService: 'documentService', realtime: true, qaCoverage: ['document-contact-rules'] }),
  route('/run-of-show', 'Run of Show', 'plan', { pageTitle: 'Run of Show', helpContext: 'Event-day sequence, supplier arrivals, dependencies, and Now/Next', requiresWorkingEvent: true, mutationService: 'eventResourceService', realtime: true, qaCoverage: ['run-of-show-resource-rules'] }),
  route('/resources', 'Equipment & Supplies', 'plan', { pageTitle: 'Equipment & Supplies', helpContext: 'Equipment, supplies, packing, pickup, and return tracking', requiresWorkingEvent: true, mutationService: 'eventResourceService', realtime: true, qaCoverage: ['run-of-show-resource-rules'] }),
  route('/registrations', 'Guests & Registrations', 'guests', { pageTitle: 'Guests & Registrations', helpContext: 'Manage registration records and guest counts', requiresWorkingEvent: true, readModel: 'buildRegistrationListModel', mutationService: 'registrationService', realtime: true, mobileAvailability: 'primary', qaCoverage: ['registration-utils', 'product-qa'] }),
  route('/payments', 'Registration Payments', 'guests', { pageTitle: 'Registration Payments', helpContext: 'Review registration charges, payments, balances, and follow-up', requiresWorkingEvent: true, readModel: 'buildPaymentReconciliationModel', mutationService: 'registrationService', realtime: true, mobileAvailability: 'secondary', qaCoverage: ['finance', 'product-qa'] }),
  route('/tickets', 'Tickets', 'guests', { pageTitle: 'Tickets', helpContext: 'Assign ticket codes and prepare QR access', requiresWorkingEvent: true, readModel: 'buildTicketLookupModel', mutationService: 'ticketService', realtime: true, mobileAvailability: 'primary', qaCoverage: ['ticketing', 'qr-checkin'] }),
  route('/check-in', 'Check-In', 'guests', { pageTitle: 'Check-In', helpContext: 'Track event-day attendance', requiresWorkingEvent: true, readModel: 'buildCheckInQueueModel', mutationService: 'checkInService', realtime: true, mobileAvailability: 'primary', qaCoverage: ['firestore-checkin-rules', 'android-e2e'] }),
  route('/operations', 'Operations', 'operations', { pageTitle: 'Operations', helpContext: 'Track event-level money and obligations', requiresWorkingEvent: true, readModel: 'buildOperationsSummaryModel', mutationService: 'operationsService', realtime: true, mobileAvailability: 'secondary', qaCoverage: ['phase83-phase9-finance'] }),
  route('/event-review', 'Reports', 'operations', { pageTitle: 'Reports', helpContext: 'Read-only follow-up, payments, operations, and summary', requiresWorkingEvent: true, readModel: 'buildEventReviewModel', realtime: true, mobileAvailability: 'secondary', qaCoverage: ['event-review'] }),
  route('/payments/reconciliation', 'Review & Reconcile Records', 'operations', { pageTitle: 'Review & Reconcile Records', helpContext: 'Read-only workbook comparison before any correction', requiresWorkingEvent: true, readModel: 'buildPaymentReconciliationModel', mobileAvailability: 'secondary', qaCoverage: ['payment-reconciliation'] }),
  route('/imports', 'Import Center', 'operations', { pageTitle: 'Import Center', helpContext: 'Bring in CSV exports and pasted table rows safely', requiresWorkingEvent: true, readModel: 'buildImportPreviewModel', mutationService: 'importService', privilegedMutation: true, mobileAvailability: 'secondary', qaCoverage: ['import-center', 'phase81-import-center'] }),
  route('/communications', 'Message Builder', 'operations', { pageTitle: 'Message Builder', helpContext: 'Create, personalize, and copy event messages', requiresWorkingEvent: true, mutationService: 'messageBuilder', mobileAvailability: 'secondary', qaCoverage: ['phase6-communications'] }),
  route('/qa', 'System QA', 'administration', { pageTitle: 'System QA', helpContext: 'System health, data checks, and safe test guidance', mobileAvailability: 'secondary', allowedCapabilities: ['system.qa'], qaCoverage: ['production-qa'] }),
  route('/settings', 'Settings', 'administration', { pageTitle: 'Settings', helpContext: 'Practical workspace and event defaults', allowedCapabilities: ['settings.manage'], mutationService: 'settingsService', mobileAvailability: 'secondary', qaCoverage: ['settings-systemqa'] }),
])

export const EVENT_HUB_ROUTE_BY_PATH = Object.freeze(Object.fromEntries(EVENT_HUB_ROUTE_MANIFEST.map((item) => [item.path, item])))

export function getEventHubRouteMetadata(pathname) {
  return EVENT_HUB_ROUTE_BY_PATH[pathname] || null
}

export function getEventHubPageTitles() {
  return Object.fromEntries(EVENT_HUB_ROUTE_MANIFEST.map(({ path, pageTitle, helpContext }) => [path, [pageTitle, helpContext]]))
}
