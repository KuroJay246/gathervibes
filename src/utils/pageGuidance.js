export const pageGuidance = {
  '/dashboard': {
    label: 'Organizer overview',
    purpose: 'Start here to understand the selected event, attention items, guest totals, registration money, and next actions.',
    boundary: 'Overview summarizes work; use the linked pages to make changes.',
  },
  '/events': {
    label: 'Event setup',
    purpose: 'Create, select, and update events. Completed real events remain editable by approved organizers.',
    boundary: 'Test events are hidden until Show Test Events is enabled.',
  },
  '/tasks': {
    label: 'Task management',
    purpose: 'Track event-scoped tasks, owners, blockers, waiting items, and follow-up dates.',
    boundary: 'Completing a task does not automatically update resources, documents, money, or attendance.',
  },
  '/registrations': {
    label: 'Guest records',
    purpose: 'Manage registration records, guest counts, contact details, payment fields, and ticket readiness.',
    boundary: 'A registration may represent more than one guest; Operations remains a separate event-level ledger.',
  },
  '/payments': {
    label: 'Registration finance',
    purpose: 'Review registration charges, recorded payments, balances, evidence, and follow-up states.',
    boundary: 'Registration payments are not merged into Operations Ledger totals automatically.',
  },
  '/payments/reconciliation': {
    label: 'Payment comparison',
    purpose: 'Compare workbook payment evidence against the selected Working Event before any approved correction workflow.',
    boundary: 'This preview does not write records by itself.',
  },
  '/tickets': {
    label: 'Ticket preparation',
    purpose: 'Assign ticket codes, review ticket status, and prepare QR access for the selected event.',
    boundary: 'QR payload remains GSV:TICKET:{ticketCode}.',
  },
  '/check-in': {
    label: 'Event-day attendance',
    purpose: 'Check in assigned tickets and review attendance for the selected event.',
    boundary: 'Guest totals are derived from personsAttending; normal scanner undo and check-out stay disabled.',
  },
  '/operations': {
    label: 'Event-level money',
    purpose: 'Track sponsor income, vendor payments, supplier costs, reimbursements, refunds, and adjustments.',
    boundary: 'Do not enter every registration payment here; those belong in Registration Payments.',
  },
  '/run-of-show': {
    label: 'Event-day sequence',
    purpose: 'Plan timing, arrivals, responsibilities, dependencies, and Now/Next event-day status.',
    boundary: 'This is an internal operations schedule, not a public guest agenda.',
  },
  '/resources': {
    label: 'Equipment and supplies',
    purpose: 'Track what must be confirmed, packed, brought on site, collected, and returned.',
    boundary: 'Resource updates do not change Operations, registration payments, or task status automatically.',
  },
  '/documents': {
    label: 'Document references',
    purpose: 'Track event document links, evidence references, required paperwork, due dates, and status.',
    boundary: 'This records references only; it does not upload private files.',
  },
  '/contacts': {
    label: 'People and organizations',
    purpose: 'Manage reusable contacts, organizations, and event relationships for planning coordination.',
    boundary: 'Linking a person or organization does not grant app access.',
  },
  '/communications': {
    label: 'Copy-only message builder',
    purpose: 'Create, personalize, preview, and copy event messages for use outside the app.',
    boundary: 'Messages are not sent automatically and no live AI or delivery tracking is enabled.',
  },
  '/event-review': {
    label: 'Reports',
    purpose: 'Review read-only follow-up, registration payments, Operations summary, and event summary.',
    boundary: 'Reports explain current data; they do not create, reconcile, save, or delete records.',
  },
  '/imports': {
    label: 'Preview-first import',
    purpose: 'Import CSV, pasted tables, and supported workbooks only after mapping and preview review.',
    boundary: 'Use CODEX_DEMO for synthetic import rehearsal before touching a real event.',
  },
  '/settings': {
    label: 'Workspace settings',
    purpose: 'Review practical app defaults and configuration that already exists.',
    boundary: 'Technical diagnostics and release checks belong in System QA.',
  },
  '/qa': {
    label: 'System QA',
    purpose: 'Check diagnostics, protected-owner access, fixture identity, and production-safety guardrails.',
    boundary: 'Use CODEX_DEMO for synthetic QA; do not use real events for test writes.',
  },
}
