export const TUTORIAL_TARGETS = {
  workingEventSelector: 'working-event-selector',
  overviewPrimaryMetrics: 'overview-summary',
  eventsCreateButton: 'create-event-action',
  eventBasicsName: 'event-name-field',
  eventCategorySelector: 'event-category-selector',
  eventCapabilities: 'event-capabilities-controls',
  eventPlanning: 'event-planning-workspace',
  tasksWorkspace: 'tasks-workspace',
  registrationsSummary: 'registrations-workspace',
  registrationsWorkspaceTabs: 'registrations-workspace-tabs',
  registrationsAddButton: 'add-registration-action',
  registrationFilters: 'registration-filters-panel',
  paymentsSummary: 'payments-summary-metrics',
  ticketsReadiness: 'tickets-workspace',
  ticketsWorkspaceTabs: 'tickets-workspace-tabs',
  checkInSearch: 'checkin-search-field',
  checkInWorkspaceTabs: 'checkin-workspace-tabs',
  operationsLedgerSummary: 'operations-workspace',
  partnersSponsors: 'partners-commitments-panel',
  runOfShowWorkspace: 'run-of-show-workspace',
  resourcesWorkspace: 'resources-workspace',
  eventReadinessSummary: 'event-readiness-summary',
  reconciliationWorkspace: 'reconciliation-workspace',
  messageBuilder: 'message-builder-workspace',
  reportsSummary: 'reports-workspace',
  importCenterSource: 'imports-workspace',
  responseInboxWorkspace: 'response-inbox-workspace',
  importTemplatesWorkspace: 'import-templates-workspace',
  documentsWorkspace: 'documents-workspace',
  contactsWorkspace: 'contacts-workspace',
  organizationsWorkspace: 'organizations-workspace',
  eventRelationshipsWorkspace: 'event-relationships-workspace',
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
  tasks: [TUTORIAL_TARGETS.tasksWorkspace],
  registrations: [
    TUTORIAL_TARGETS.registrationsSummary,
    TUTORIAL_TARGETS.registrationsWorkspaceTabs,
    TUTORIAL_TARGETS.registrationsAddButton,
    TUTORIAL_TARGETS.registrationFilters,
  ],
  payments: [TUTORIAL_TARGETS.paymentsSummary],
  'check-in': [TUTORIAL_TARGETS.checkInWorkspaceTabs, TUTORIAL_TARGETS.checkInSearch],
  tickets: [TUTORIAL_TARGETS.ticketsReadiness, TUTORIAL_TARGETS.ticketsWorkspaceTabs],
  operations: [TUTORIAL_TARGETS.operationsLedgerSummary, TUTORIAL_TARGETS.partnersSponsors],
  'run-of-show': [TUTORIAL_TARGETS.runOfShowWorkspace],
  resources: [TUTORIAL_TARGETS.resourcesWorkspace],
  dashboardReadiness: [TUTORIAL_TARGETS.eventReadinessSummary],
  reconciliation: [TUTORIAL_TARGETS.reconciliationWorkspace],
  communications: [TUTORIAL_TARGETS.messageBuilder],
  reports: [TUTORIAL_TARGETS.reportsSummary],
  imports: [TUTORIAL_TARGETS.importCenterSource, TUTORIAL_TARGETS.responseInboxWorkspace, TUTORIAL_TARGETS.importTemplatesWorkspace],
  documents: [TUTORIAL_TARGETS.documentsWorkspace],
  contacts: [TUTORIAL_TARGETS.contactsWorkspace, TUTORIAL_TARGETS.organizationsWorkspace, TUTORIAL_TARGETS.eventRelationshipsWorkspace],
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
