export const TUTORIAL_TARGETS = {
  workingEventSelector: 'working-event-selector',
  overviewPrimaryMetrics: 'overview-summary',
  eventsCreateButton: 'create-event-action',
  eventBasicsName: 'event-name-field',
  eventCategorySelector: 'event-category-selector',
  eventCapabilities: 'event-capabilities-controls',
  eventPlanning: 'event-planning-workspace',
  registrationsSummary: 'registrations-workspace',
  registrationsAddButton: 'add-registration-action',
  registrationFilters: 'registration-filters-panel',
  paymentsSummary: 'payments-summary-metrics',
  ticketsReadiness: 'tickets-workspace',
  checkInSearch: 'checkin-search-field',
  operationsLedgerSummary: 'operations-workspace',
  partnersSponsors: 'partners-commitments-panel',
  messageBuilder: 'message-builder-workspace',
  reportsSummary: 'reports-workspace',
  importCenterSource: 'imports-workspace',
  settingsTourReplay: 'settings-workspace',
  systemQa: 'system-qa-workspace',
}

export const TUTORIAL_ROUTE_TARGETS = {
  dashboard: [TUTORIAL_TARGETS.workingEventSelector, TUTORIAL_TARGETS.overviewPrimaryMetrics],
  events: [
    TUTORIAL_TARGETS.eventsCreateButton,
    TUTORIAL_TARGETS.eventBasicsName,
    TUTORIAL_TARGETS.eventCategorySelector,
    TUTORIAL_TARGETS.eventCapabilities,
    TUTORIAL_TARGETS.eventPlanning,
  ],
  registrations: [
    TUTORIAL_TARGETS.registrationsSummary,
    TUTORIAL_TARGETS.registrationsAddButton,
    TUTORIAL_TARGETS.registrationFilters,
  ],
  payments: [TUTORIAL_TARGETS.paymentsSummary],
  'check-in': [TUTORIAL_TARGETS.checkInSearch],
  tickets: [TUTORIAL_TARGETS.ticketsReadiness],
  operations: [TUTORIAL_TARGETS.operationsLedgerSummary, TUTORIAL_TARGETS.partnersSponsors],
  communications: [TUTORIAL_TARGETS.messageBuilder],
  reports: [TUTORIAL_TARGETS.reportsSummary],
  imports: [TUTORIAL_TARGETS.importCenterSource],
  settings: [TUTORIAL_TARGETS.settingsTourReplay],
  'system-qa': [TUTORIAL_TARGETS.systemQa],
}

export function selectorForTutorialTarget(targetId) {
  return `[data-tour-id="${targetId}"]`
}

export function isTargetAllowedForRoute(routeId, targetId) {
  return Boolean(TUTORIAL_ROUTE_TARGETS[routeId]?.includes(targetId))
}

export function findRegisteredTarget(targetId) {
  const targets = document.querySelectorAll(selectorForTutorialTarget(targetId))
  for (const target of targets) {
    const rect = target.getBoundingClientRect()
    const style = window.getComputedStyle(target)
    if (rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none') {
      return target
    }
  }
  return null
}
