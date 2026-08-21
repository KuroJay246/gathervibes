/* global process, console */
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { chromium } from '@playwright/test'

const root = process.cwd()
const docsRoot = path.join(root, 'docs')
const manualDir = path.join(docsRoot, 'manual')
const generatedDir = path.join(docsRoot, 'generated')
const diagramsDir = path.join(docsRoot, 'diagrams')
const runbooksDir = path.join(docsRoot, 'runbooks')
const dataDictionaryDir = path.join(docsRoot, 'data-dictionary')
const permissionsDir = path.join(docsRoot, 'permissions')
const decisionsDir = path.join(docsRoot, 'decisions')
const changelogDir = path.join(docsRoot, 'changelog')
const problemRegisterDir = path.join(docsRoot, 'problem-register')
const templatesDir = path.join(docsRoot, 'templates')
const screenshotsDir = path.join(docsRoot, 'screenshots')

const generationDate = new Date().toISOString()
const currentCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const currentBranch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim()
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const appSource = await readFile(path.join(root, 'src', 'App.jsx'), 'utf8')
const shellSource = await readFile(path.join(root, 'src', 'layout', 'AppShell.jsx'), 'utf8')
const indexesJson = JSON.parse(await readFile(path.join(root, 'firestore.indexes.json'), 'utf8'))

const routes = [...appSource.matchAll(/<Route\s+path="([^"]+)"\s+element=\{([^]+?)\}\s*\/>/g)]
  .map((match) => ({ path: match[1], element: match[2].replace(/\s+/g, ' ').trim() }))
  .filter((route) => !route.path.includes('*'))

const pageTitlesMatch = shellSource.match(/const pageTitles = \{([\s\S]*?)\n\}/)
const pageTitles = pageTitlesMatch
  ? [...pageTitlesMatch[1].matchAll(/'([^']+)': \['([^']+)', '([^']+)'\]/g)].map((match) => ({
      path: match[1],
      title: match[2],
      description: match[3],
    }))
  : []

const featureMap = [
  ['Authentication and access resolution', 'src/lib/firebase.js; src/auth/AuthProvider.jsx; src/auth/ProtectedRoute.jsx; src/utils/accessRoles.js; src/config/protectedOwner.js', 'tests/auth-reliability.test.js; tests/protected-owner-authorization-matrix.test.js; tests/settings-access-management.test.js', 'High'],
  ['Events and working event', 'src/pages/EventsPage.jsx; src/services/eventService.js; src/events/ActiveEventProvider.jsx; src/utils/eventPlanning.js', 'tests/event-utils.test.js; tests/phase26-event-categories-capabilities.test.js', 'High'],
  ['Tasks and deadlines', 'src/pages/TasksPage.jsx; src/services/taskService.js; src/utils/taskWorkflow.js', 'tests/phase2-guided-event-setup-task-deadline.test.js; tests/task-workflow-rules.test.js', 'Medium'],
  ['Guests and registrations', 'src/pages/RegistrationsPage.jsx; src/services/registrationService.js; src/utils/validators.js; src/utils/registrationMetrics.js', 'tests/registration-utils.test.js; tests/registration-metrics.test.js', 'High'],
  ['Registration payments', 'src/pages/PaymentsPage.jsx; src/utils/financeUtils.js; src/utils/paymentStatus.js', 'tests/phase23b-payments-operations-boundaries.test.js; tests/payments-operations-refinement-2026-08.test.js', 'High'],
  ['Review and reconciliation', 'src/pages/PaymentReconciliationPage.jsx; src/services/reconciliationReadService.js; src/utils/paymentReconciliation.js; src/utils/reconciliationWorkbook.js', 'tests/phase23c-payment-reconciliation.test.js', 'High'],
  ['Tickets and QR', 'src/pages/TicketsPage.jsx; src/components/tickets/TicketQrCode.jsx; src/services/ticketService.js; src/utils/ticketUtils.js; src/utils/qrTicketUtils.js', 'tests/phase45-ticketing.test.js; tests/phase7-qr-checkin.test.js', 'High'],
  ['Check-in and scanner', 'src/pages/CheckInPage.jsx; src/pages/ScannerPage.jsx; src/components/checkin/QrScannerPanel.jsx; src/utils/checkInUtils.js', 'tests/phase14-camera-checkin.test.js; tests/firestore-checkin-rules.test.js; e2e/workflows.spec.js', 'High'],
  ['Imports and XLSX parsing', 'src/pages/ImportsPage.jsx; src/services/importService.js; src/utils/importUtils.js; src/utils/xlsxImport.js', 'tests/import-center.test.js; tests/import-center-workflow-upgrade.test.js', 'High'],
  ['Operations ledger and commitments', 'src/pages/OperationsPage.jsx; src/services/operationsLedgerService.js; src/components/operations/PartnerCommitmentsPanel.jsx', 'tests/phase19-operations-productivity.test.js; tests/phase23b-payments-operations-boundaries.test.js', 'High'],
  ['Run of Show', 'src/pages/RunOfShowPage.jsx; src/services/runOfShowService.js; src/utils/runOfShow.js', 'tests/run-of-show-resources-foundation.test.js; tests/run-of-show-resource-rules.test.js', 'Medium'],
  ['Equipment and supplies', 'src/pages/ResourcesPage.jsx; src/services/eventResourceService.js; src/utils/eventResources.js', 'tests/run-of-show-resources-foundation.test.js; tests/run-of-show-resource-rules.test.js', 'Medium'],
  ['Documents', 'src/pages/DocumentsPage.jsx; src/services/documentService.js; src/utils/documentRegistry.js', 'tests/document-contact-foundation.test.js; tests/document-contact-rules.test.js', 'Medium'],
  ['Contacts and organizations', 'src/pages/ContactsPage.jsx; src/services/contactService.js; src/utils/contactDirectory.js', 'tests/document-contact-foundation.test.js; tests/document-contact-rules.test.js', 'Medium'],
  ['Settings, staff, integrations', 'src/pages/SettingsPage.jsx; src/services/accessManagementService.js; src/services/staffManagementService.js; src/services/integrationSettingsService.js', 'tests/settings-access-management.test.js', 'High'],
  ['Message Builder', 'src/pages/CommunicationsPage.jsx; src/utils/communicationsUtils.js', 'tests/phase6-communications.test.js', 'Medium'],
  ['System QA', 'src/pages/QaPage.jsx; src/utils/qaHelper.js; src/utils/runtimeHealth.js', 'tests/production-qa.test.js; tests/settings-systemqa-tutorial-final-refinement.test.js', 'Medium'],
  ['Tutorial/onboarding', 'src/tutorial/*', 'tests/onboarding-flow.test.js; tests/phase26-interactive-product-tour.test.js; e2e/tutorial.spec.js', 'Medium'],
]

const collections = [
  ['settings/accessControl', 'Authoritative approved organizer source plus metadata records.', 'src/auth/AuthProvider.jsx; src/services/accessManagementService.js; src/pages/SettingsPage.jsx', 'firestore.rules match /settings/accessControl', 'Protected Owner only for mutations; approved admins read.'],
  ['settings/accessControl/history/{historyId}', 'Append-only history for organizer access changes.', 'src/services/accessManagementService.js', 'firestore.rules match /settings/accessControl/history/{historyId}', 'Protected Owner create; approved admins read.'],
  ['settings/integrations', 'Supported integration status settings surfaced in Settings.', 'src/services/integrationSettingsService.js', 'firestore.rules match /settings/integrations', 'Protected Owner create/update; approved admins read.'],
  ['events/{eventId}', 'Event records, planning data, capability configuration, and working-event source.', 'src/services/eventService.js; src/events/ActiveEventProvider.jsx', 'firestore.rules match /events/{eventId}', 'Approved admins manage; assigned staff can read assigned events.'],
  ['events/{eventId}/staffAssignments/{uid}', 'Event-scoped staff assignment records.', 'src/services/staffManagementService.js; src/auth/AuthProvider.jsx', 'firestore.rules match /events/{eventId}/staffAssignments/{uid}', 'Approved admins manage; assigned user can read own active assignment.'],
  ['events/{eventId}/tasks/{taskId}', 'Event-scoped tasks and deadlines.', 'src/services/taskService.js', 'firestore.rules match /events/{eventId}/tasks/{taskId}', 'Approved admins and assigned event managers manage; viewers can read.'],
  ['registrations/{registrationId}', 'Guest registration, ticket, payment, and check-in status records.', 'src/services/registrationService.js; src/services/ticketService.js', 'firestore.rules match /registrations/{registrationId}', 'Approved admins manage; assigned scanners can perform narrow check-in updates.'],
  ['auditLogs/{logId}', 'Append-only audit evidence for business mutations.', 'src/services/auditService.js; service write batches', 'firestore.rules match /auditLogs/{logId}', 'Create only when matching a permitted target mutation; never update/delete.'],
  ['operationsLedger/{ledgerEntryId}', 'Event-level Operations ledger, commitments, partners, in-kind support.', 'src/services/operationsLedgerService.js', 'firestore.rules match /operationsLedger/{ledgerEntryId}', 'Approved admins create/update; no delete.'],
  ['events/{eventId}/documents/{documentId}', 'Event document references and external links. No Firebase Storage upload.', 'src/services/documentService.js', 'firestore.rules match /events/{eventId}/documents/{documentId}', 'Approved admins and event managers create/update; admins delete.'],
  ['events/{eventId}/runOfShow/{itemId}', 'Event-day schedule sequence, dependencies, arrivals, status.', 'src/services/runOfShowService.js', 'firestore.rules match /events/{eventId}/runOfShow/{itemId}', 'Approved admins manage; assigned event staff can read through task read gate.'],
  ['events/{eventId}/resources/{resourceId}', 'Equipment, supplies, packing, pickup, return, quantity tracking.', 'src/services/eventResourceService.js', 'firestore.rules match /events/{eventId}/resources/{resourceId}', 'Approved admins manage; assigned event staff can read through task read gate.'],
  ['contacts/{contactId}', 'Reusable contact directory.', 'src/services/contactService.js', 'firestore.rules match /contacts/{contactId}', 'Approved admins create/update/read; delete false.'],
  ['organizations/{organizationId}', 'Reusable organization directory.', 'src/services/contactService.js', 'firestore.rules match /organizations/{organizationId}', 'Approved admins create/update/read; delete false.'],
  ['events/{eventId}/contactLinks/{linkId}', 'Event relationship links to contacts/organizations.', 'src/services/contactService.js', 'firestore.rules match /events/{eventId}/contactLinks/{linkId}', 'Approved admins and event managers create/update; admins delete.'],
  ['accessRequests/{requestId}', 'Signed-in user access request workflow.', 'src/services/accessRequestContract.js', 'firestore.rules match /accessRequests/{requestId}', 'Signed-in create; approved admins review; no delete.'],
  ['staffProfiles/{uid}', 'Global staff profile records.', 'src/services/staffManagementService.js; src/auth/AuthProvider.jsx', 'firestore.rules match /staffProfiles/{uid}', 'Approved admins manage; staff can read own active profile.'],
]

const permissionRows = [
  ['Open organizer shell', 'Yes', 'Yes', 'Limited by assigned route', 'No, scanner uses /scanner', 'No'],
  ['Manage Settings organizer access', 'Yes, immutable owner cannot be removed', 'No owner-only controls', 'No', 'No', 'No'],
  ['Create/update events', 'Yes', 'Yes', 'No', 'No', 'No'],
  ['Read assigned event', 'Yes', 'Yes', 'Yes if assignment active', 'Yes for scanner route', 'No'],
  ['Create/update registrations', 'Yes', 'Yes', 'No', 'No except scanner check-in fields', 'No'],
  ['Assign tickets', 'Yes', 'Yes', 'No', 'No', 'No'],
  ['Complete check-in', 'Yes', 'Yes', 'No unless scanner assignment', 'Yes for assigned event', 'No'],
  ['Use Operations ledger', 'Yes', 'Yes', 'operations-helper read only', 'No', 'No'],
  ['Use Import Center', 'Yes', 'Yes', 'No', 'No', 'No'],
  ['Read documents/tasks as assigned staff', 'Yes', 'Yes', 'event-manager/viewer where allowed', 'No', 'No'],
  ['Create audit logs', 'Only with matching mutation', 'Only with matching mutation', 'Only where rules allow matching mutation', 'Only check-in audit path', 'No'],
]

const diagrams = {
  'high-level-architecture.mmd': `flowchart TD
  User[Owner, organizer, staff, scanner] --> Browser[Browser / PWA shell]
  Browser --> React[React 19 + Vite app]
  React --> RouteGate[ProtectedRoute and canViewRoute]
  RouteGate --> Auth[Firebase Authentication]
  Auth --> Access[Access resolver: settings/accessControl + staff profile + assignment]
  Access --> FirestoreRules[Firestore Security Rules]
  FirestoreRules --> Firestore[(Cloud Firestore)]
  React --> Hosting[Firebase Hosting static assets]
  React --> QA[Local emulator tests and Playwright QA]`,
  'auth-sequence.mmd': `sequenceDiagram
  participant B as Browser
  participant A as AuthProvider
  participant F as Firebase Auth
  participant D as Firestore
  participant R as ProtectedRoute
  B->>A: App opens
  A->>F: setPersistence + onAuthStateChanged
  F-->>A: current user or null
  A->>D: read settings/accessControl
  A->>D: fallback read staffProfiles and assignments
  A->>A: resolve access level and default route
  A-->>R: user, loading, isAuthorized, access
  R-->>B: render page or redirect`,
  'permission-flow.mmd': `flowchart TD
  Start[Request route or Firestore operation] --> Signed{Signed in?}
  Signed -- No --> Login[Redirect/login denied]
  Signed -- Yes --> Owner{Protected Owner UID?}
  Owner -- Yes --> Admin[Admin-level frontend access]
  Owner -- No --> Allowlist{Active approved organizer?}
  Allowlist -- Yes --> Admin
  Allowlist -- No --> Staff{Active staff profile + event assignment?}
  Staff -- No --> Deny[Deny access]
  Staff -- Yes --> Role{Assignment role}
  Role --> Scanner[Scanner: assigned event check-in only]
  Role --> Manager[Event manager/viewer: narrow event reads/tasks/docs]
  Role --> Ops[Operations helper: operations visibility only]
  Admin --> Rules[Firestore validates fields, audits, and event scope]`,
  'route-map.mmd': `flowchart LR
  Login[/login/] --> Protected[ProtectedRoute]
  Protected --> Shell[AppShell]
  Shell --> Home[/dashboard/]
  Shell --> Plan[/events /tasks /contacts /documents /run-of-show /resources/]
  Shell --> Guests[/registrations /payments /tickets /check-in/]
  Shell --> Ops[/operations /event-review /payments/reconciliation /imports /communications/]
  Shell --> Admin[/settings /qa/]
  Protected --> Scanner[/scanner assigned-event gate/]`,
  'import-flow.mmd': `flowchart TD
  Source[CSV, XLSX, pasted table] --> Parse[Parser and source type]
  Parse --> Mapping[Header mapping and sheet confirmation]
  Mapping --> Preview[Preview rows: valid, warning, needs review, blocked]
  Preview --> Duplicate[Duplicate and ticket code checks]
  Duplicate --> Confirm[Explicit final confirmation]
  Confirm --> Batch[Chunked Firestore writes + audit logs]
  Batch --> Review[Registration records and follow-up]`,
  'qr-checkin-flow.mmd': `flowchart TD
  Ticket[Ticket code] --> Payload[GSV:TICKET:{ticketCode}]
  Payload --> QR[QRCode rendering]
  QR --> Scanner[Camera or manual scanner panel]
  Scanner --> Parse[qrTicketUtils parses safe ticket code]
  Parse --> Lookup[Lookup registration in selected/assigned event]
  Lookup --> Confirm[Operator explicitly checks in]
  Confirm --> Firestore[Minimal checkedIn fields + audit log]
  Firestore --> Feedback[Success, duplicate, or permission feedback]`,
  'deployment-flow.mmd': `flowchart TD
  Change[Code or docs change] --> Lint[npm run lint]
  Lint --> Tests[npm test]
  Tests --> Build[npm run build]
  Build --> QA[npm run product:qa]
  QA --> Decision{Runtime deployment needed?}
  Decision -- Docs only --> NoDeploy[No Firebase deploy]
  Decision -- Hosting changed --> Hosting[npm run firebase:deploy-hosting]
  Decision -- Rules changed --> Rules[npm run firebase:deploy-rules]
  Hosting --> Verify[Hard refresh production + console/network check]
  Rules --> Verify`,
}

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell).replace(/\n/g, '<br>')).join(' | ')} |`),
  ].join('\n')
}

function commandRows() {
  return Object.entries(packageJson.scripts).map(([name, command]) => [
    `npm run ${name}`,
    command.includes('deploy') ? 'PRODUCTION-IMPACTING COMMAND where noted' : 'Local validation/development command',
    command,
    command.includes('deploy') ? 'Only after explicit approval and validation' : 'During development, QA, or documentation validation',
    'Exit code 0; command-specific pass message',
  ])
}

function routeRows() {
  return pageTitles.map(({ path: routePath, title, description }) => {
    const route = routes.find((candidate) => candidate.path === routePath.slice(1) || candidate.path === routePath)
    return [routePath, title, description, route?.element || 'Declared in App.jsx', route?.element?.includes('AssignedEventGate') ? 'Authenticated + assigned Working Event gate' : 'Authenticated route gate', 'src/App.jsx; src/layout/AppShell.jsx']
  })
}

function featureRows() {
  return featureMap.map(([feature, files, tests, risk]) => [feature, files, tests, risk])
}

function collectionRows() {
  return collections.map(([collection, purpose, code, rules, security]) => [collection, purpose, code, rules, security])
}

function adr(number, title, context, decision, consequences, refs) {
  return `# ADR-${String(number).padStart(3, '0')}: ${title}

Status: Accepted
Date: 2026-08-21
Superseded by: None

## Context

${context}

## Decision

${decision}

## Alternatives

- Keep the behavior undocumented: rejected because this app has production data and complex Firestore authorization.
- Replace the system during documentation: rejected because Phase 3 is documentation-only.

## Consequences

${consequences}

## Affected Systems

Gathetr source code, tests, Firebase configuration, Firestore Rules, and owner/developer documentation.

## References

${refs}
`
}

function runbook(title, symptom, causes, files, commands, repairs, keywords) {
  return `# ${title}

## Symptoms

${symptom}

## Likely Causes

${causes}

## Severity

High when it blocks owner, organizer, staff, scanner, payment, ticket, or check-in work. Medium when isolated to local development.

## First Checks

1. Confirm branch and clean tree: \`git status --short --branch\`.
2. Confirm Firebase project target before any production command.
3. Read browser Console and Network errors before changing code.
4. Reproduce on CODEX_DEMO or local emulator data. Do not use CPB for synthetic writes.

## Files To Inspect

${files}

## Commands To Run

${commands}

## Diagnostic Steps

1. Capture the exact route, account, Working Event, and visible error.
2. Compare frontend route/access behavior with Firestore rule behavior.
3. Check tests that cover the affected feature.
4. If the issue involves production, collect read-only evidence first.

## Repair Options

${repairs}

## Verification

Run the narrow test first, then \`npm run lint\`, \`npm test\`, \`npm run build\`, and \`npm run product:qa\` where safe.

## Rollback

Use Git to revert only the bad commit or restore the previous Firebase Hosting/Rules version. Do not use \`git reset --hard\` over owner work.

## Search Keywords

${keywords}
`
}

const files = new Map()
function add(filePath, content) {
  files.set(path.join(docsRoot, filePath), content.trimEnd() + '\n')
}

add('README.md', `# Gathetr Technical Documentation

This documentation system is for the Gather & Savor Event Hub codebase at \`C:\\Users\\Jaylan\\Documents\\gathetr\`.

Open first:

1. \`docs/manual/00-cover-and-document-control.md\`
2. \`docs/manual/01-quick-start-and-emergency-reference.md\`
3. \`docs/manual/14-troubleshooting-and-repairs.md\`

The editable Markdown source files are authoritative. The PDF in \`docs/generated/\` is a generated snapshot for reading and sharing.

## Organization

- \`docs/manual/\`: owner/developer service manual volumes.
- \`docs/runbooks/\`: symptom-based repair procedures.
- \`docs/data-dictionary/\`: Firestore collection and field reference.
- \`docs/permissions/\`: role and rule matrices.
- \`docs/decisions/\`: architecture decision records.
- \`docs/problem-register/\`: known problems, root causes, and repair status.
- \`docs/templates/\`: future change, repair, release, and incident templates.
- \`docs/diagrams/\`: Mermaid diagram source.
- \`docs/generated/\`: generated PDF and combined manual snapshot. Do not edit generated files by hand.

## Regenerate

Run:

\`\`\`powershell
npm run docs:generate
npm run docs:validate
\`\`\`

## Update Rule

After meaningful development work, report:

- Documentation reviewed: YES/NO
- Documentation changed: YES/NO
- Documentation files changed
- Reason no documentation update was required
`)

add('manual/00-cover-and-document-control.md', `# Gathetr Owner's Technical Operations, Development, Maintenance and Repair Manual

Displayed title: Gathetr Technical Manual

Document version: 2026-08-21 Phase 3
Generated: ${generationDate}
Application commit documented: ${currentCommit}
Documentation branch at generation: ${currentBranch}
Repository: https://github.com/KuroJay246/gathervibes.git
Firebase project: gathervibeshub
Production URL: https://gathervibeshub.web.app

## Document Control

This manual covers the code and configuration present at the recorded commit only. It does not claim to describe later commits unless regenerated.

Source documents in \`docs/\` are authoritative. The PDF is a generated readable snapshot.

## Protected Boundaries

- Do not expose \`.env.local\`, cookies, tokens, service account JSON, or private Firebase keys.
- Do not use CPB for synthetic QA or fake data.
- QR payload format must remain \`GSV:TICKET:{ticketCode}\` unless explicitly approved and migrated.
- Firestore Rules, Auth, Hosting, Functions, and production data require explicit validation and approval before deployment.
- This Phase 3 documentation generation requires no Firebase deployment and makes no runtime behavior change.
`)

add('manual/01-quick-start-and-emergency-reference.md', `# Quick Start and Emergency Reference

## Immediate Symptom Table

${table(['Symptom', 'First check', 'Next manual section'], [
  ['Blank page', 'Browser Console and Network; check stale chunk or Firebase config', 'Troubleshooting: blank page or dynamic import failure'],
  ['Permission denied', 'Signed-in account, `settings/accessControl`, staff assignment, Firestore rule line', 'Permissions and Security; Permission runbooks'],
  ['Login fails', 'Firebase Auth provider, authorized domain, popup/redirect state', 'Firebase Authentication; Login failure runbook'],
  ['Scanner fails', 'Camera permission, HTTPS, QR payload, assigned event, ticket code lookup', 'Imports/Exports/QR; Scanner runbook'],
  ['Build fails', 'Terminal error and changed files', 'Build Deployment and Recovery'],
  ['Production fails', 'Hosting deployment, asset cache, Firebase project, Console', 'Emergency recovery runbooks'],
])}

## Safe First Commands

\`\`\`powershell
git status --short --branch
git rev-list --left-right --count main...origin/main
npm run lint
npm test
npm run build
\`\`\`

Do not run deployment commands while diagnosing unless the fix is known, tested, and approved.
`)

add('manual/02-application-overview.md', `# Application Overview

Gathetr is a private React/Firebase event operations application for planning, guest management, registration payments, tickets, check-in, operations, run of show, resources, documents, contacts, reports, imports, message preparation, Settings, and System QA.

The active synthetic training event is \`CODEX_DEMO - Full System Walkthrough\`. CPB is real historical production data and must not receive synthetic writes.

## Main User Groups

- Protected Owner: UID-protected permanent owner access.
- Approved Organizer: active approved email in \`settings/accessControl\`.
- Staff roles: active \`staffProfiles/{uid}\` plus active event assignment.
- Scanner: assigned-event check-in-only route and narrow Firestore update path.

## Stack

${table(['Layer', 'Actual technology'], [
  ['Frontend', `React ${packageJson.dependencies.react}, Vite ${packageJson.devDependencies.vite}, React Router ${packageJson.dependencies['react-router']}`],
  ['Styling', `Tailwind CSS ${packageJson.devDependencies.tailwindcss} through @tailwindcss/vite`],
  ['Backend services', `Firebase client SDK ${packageJson.dependencies.firebase}`],
  ['Database', 'Cloud Firestore with local emulator tests'],
  ['Authentication', 'Firebase Authentication with Google and email/password'],
  ['Hosting', 'Firebase Hosting classic static SPA rewrites to index.html'],
  ['QR', `qrcode ${packageJson.dependencies.qrcode}; scanner uses html5-qrcode ${packageJson.dependencies['html5-qrcode']}`],
  ['Excel parsing', `read-excel-file ${packageJson.dependencies['read-excel-file']}; xlsx package intentionally absent`],
])}
`)

add('manual/03-system-architecture.md', `# System Architecture

## High-Level Flow

\`\`\`mermaid
${diagrams['high-level-architecture.mmd']}
\`\`\`

## Important Boundaries

- Frontend route checks improve user experience but do not replace Firestore Rules.
- Firestore Rules are the backend security boundary.
- Audit logs are append-only evidence and are coupled to business mutations.
- Message Builder is copy-only; it does not send email.
- Documents are references/links and metadata only; no Firebase Storage upload is active.
`)

add('manual/04-project-file-map.md', `# Project File Map

## Feature Ownership Map

${table(['Feature', 'Main files', 'Related tests', 'Risk'], featureRows())}

## Root Configuration

${table(['Path', 'Purpose', 'Risk'], [
  ['package.json', 'Scripts and dependencies for development, QA, E2E, Firebase deploy helpers, docs generation.', 'High'],
  ['firebase.json', 'Auth provider notes, emulator ports, Firestore file references, Hosting headers and rewrites.', 'High'],
  ['firestore.rules', 'Backend authorization and schema validation.', 'Critical'],
  ['firestore.indexes.json', 'Firestore composite index configuration.', 'High'],
  ['vite.config.js', 'Vite/React/Tailwind build configuration.', 'Medium'],
  ['playwright.config.js', 'E2E browser test configuration and emulator env.', 'Medium'],
  ['AI_AGENT_RULES.md', 'Permanent coding assistant governance.', 'High'],
])}
`)

add('manual/05-frontend-react-and-tailwind.md', `# Frontend React and Tailwind

Entry point: \`src/main.jsx\`
Top-level app: \`src/App.jsx\`
Authenticated shell: \`src/layout/AppShell.jsx\`
Global styles: \`src/styles.css\`

## React Patterns

- Lazy-loaded route pages are declared in \`src/App.jsx\`.
- \`ProtectedRoute\` blocks unauthenticated or unauthorized users.
- \`AppShell\` owns desktop sidebar, mobile drawer, mobile tab bar, page titles, Admin Search, page guidance, and TutorialProvider wrapping.
- Firebase writes are kept in service modules under \`src/services/\`.
- Shared validation and display helpers live in \`src/utils/\`.

## Tailwind Usage

Tailwind is used directly through class names and the Vite Tailwind plugin. The app uses compact cards, dense grids, responsive \`sm\`, \`md\`, \`lg\`, \`xl\` breakpoints, and semantic color usage tied to the Gather & Savor visual system.

Troubleshooting:

- Element not visible: check responsive utility prefixes and route/access gating.
- Mobile overflow: inspect fixed widths, tables, and long event names.
- Dynamic class not applying: avoid constructing class strings that Tailwind cannot see statically.
- Form accessibility issue: inspect associated label, id, name, and focus behavior.
`)

add('manual/06-routing-and-navigation.md', `# Routing and Navigation

Routes are declared in \`src/App.jsx\`; page titles and navigation groups are in \`src/layout/AppShell.jsx\`.

## Route Map

${table(['Route', 'Title', 'Purpose', 'Component/Gate', 'Access', 'Source'], routeRows())}

\`\`\`mermaid
${diagrams['route-map.mmd']}
\`\`\`

Public route: \`/login\`.

Redirect aliases: \`/security -> /settings\`, \`/reconciliation -> /payments/reconciliation\`, \`/reports -> /event-review\`.
`)

add('manual/07-firebase-authentication.md', `# Firebase Authentication

Firebase initialization is in \`src/lib/firebase.js\`. Authentication lifecycle is in \`src/auth/AuthProvider.jsx\`.

## Auth Sequence

\`\`\`mermaid
${diagrams['auth-sequence.mmd']}
\`\`\`

Definitions:

- Authentication state: Firebase's current determination of whether a user is signed in.
- Authorization state: Gathetr's determination that the signed-in user has owner, approved organizer, or assigned staff access.

## Flow

1. App initializes Firebase from Vite environment variables.
2. Auth persistence is set to browser local persistence.
3. Firebase reports the current user through \`onAuthStateChanged\`.
4. Gathetr reads \`settings/accessControl\` for approved organizer access.
5. If organizer access is not found, it reads \`staffProfiles/{uid}\` and active assignment docs for supported event IDs.
6. \`getUserAccessLevel\` builds the access object used by route gates and labels.
7. Firestore Rules still enforce every backend read/write.
`)

add('manual/08-firestore-data-model.md', `# Firestore Data Model

This dictionary is based on current services, Firestore Rules, and tests. It does not include real production personal data.

## Collections and Subcollections

${table(['Collection path', 'Purpose', 'Code that uses it', 'Rules reference', 'Security note'], collectionRows())}

## Indexes

${table(['Collection group', 'Fields', 'Purpose'], indexesJson.indexes.map((idx) => [
  idx.collectionGroup,
  idx.fields.map((field) => `${field.fieldPath} ${field.order || field.arrayConfig}`).join(', '),
  'Supports scoped Firestore query ordering used by the app.',
]))}

## Schema Truth Rule

Do not infer schema from one example record. Cross-check service writes, page reads, utils, Firestore Rules validators, and tests.
`)

add('manual/09-permissions-and-security-rules.md', `# Permissions and Security Rules

Permission architecture has two layers:

1. Frontend access checks in \`src/utils/accessRoles.js\` and \`ProtectedRoute\`.
2. Firestore Rules in \`firestore.rules\`.

\`\`\`mermaid
${diagrams['permission-flow.mmd']}
\`\`\`

## Permission Matrix

${table(['Action', 'Protected Owner', 'Approved Organizer/Admin', 'Assigned Staff', 'Scanner', 'Unapproved'], permissionRows)}

## Firestore Rules Reference

Important helper functions include \`isSignedIn\`, \`isProtectedOwner\`, \`isApprovedAdmin\`, \`activeStaffProfile\`, \`activeStaffAssignment\`, \`isAssignedScanner\`, \`canReadTask\`, and \`canManageTask\`.

Rules distinguish \`resource.data\` from \`request.resource.data\`, and create/read/update/delete paths are intentionally different. Query rules are not filters: if a query can return forbidden documents, Firestore denies the whole query.
`)

add('manual/10-events-guests-tickets-and-checkin.md', `# Events, Guests, Tickets, and Check-In

## Event Management

Events are managed by \`EventsPage\` and \`eventService\`. The Working Event context determines which event-scoped pages load data.

## Guest Registrations

Registrations include guest identity, persons attending, payment state, ticket status, historical attendance evidence, and scanner-confirmed check-in fields. Registration mutations must stay atomic with audit evidence.

## Tickets and QR

QR payload is exactly:

\`\`\`text
GSV:TICKET:{ticketCode}
\`\`\`

Do not put private guest data into QR payloads.

## Check-In Flow

\`\`\`mermaid
${diagrams['qr-checkin-flow.mmd']}
\`\`\`
`)

add('manual/11-imports-exports-and-qr-systems.md', `# Imports, Exports, and QR Systems

## Import Flow

\`\`\`mermaid
${diagrams['import-flow.mmd']}
\`\`\`

Supported sources: CSV, XLSX through \`read-excel-file\`, and pasted table rows. The app uses preview-first validation, explicit sheet confirmation, duplicate detection, ticket-code collision checks, and chunked writes with audits.

Exports are client-side generated files from \`src/utils/exportUtils.js\` and related finance/reconciliation helpers. Audit log and access-control collections are not included in ordinary organizer exports.
`)

add('manual/12-testing-and-quality-assurance.md', `# Testing and Quality Assurance

## Command Reference

${table(['Command', 'Purpose', 'Actual script', 'When to run', 'Expected result'], commandRows())}

## Testing Layers

- Unit and source contract tests: \`tests/*.test.js\`.
- Firestore Rules tests: rules-specific test files run against emulators.
- E2E smoke: \`e2e/navigation.spec.js\`.
- Accessibility and responsive E2E: \`e2e/accessibility.spec.js\`, \`e2e/responsive.spec.js\`.
- Product QA wrapper: \`npm run product:qa\`.
- React Doctor: \`npm run doctor:json\` or \`npm run doctor:changed\`.

## Date-Sensitive Test Policy

Phase 2 found \`tests/document-contact-foundation.test.js\` used \`2026-08-20\` as an expiring-soon fixture. On 2026-08-21 that fixture became expired for helpers using the current clock. It was updated to \`2026-08-30\` to preserve the intended behavior.

Future date-sensitive tests should either inject an explicit clock into every helper under test or choose dates far enough away to avoid silent expiry.
`)

add('manual/13-build-deployment-and-recovery.md', `# Build, Deployment, and Recovery

## Local Build

\`\`\`powershell
npm ci
npm run lint
npm test
npm run build
npm run product:qa
\`\`\`

## Firebase Project

Default project in \`.firebaserc\`: \`gathervibeshub\`.

Hosting public folder: \`dist\`.

Security headers and SPA rewrite are configured in \`firebase.json\`.

## Production-Impacting Commands

${table(['Command', 'Impact', 'Prerequisites'], [
  ['npm run firebase:deploy-hosting', 'PRODUCTION-IMPACTING COMMAND: deploys Hosting assets from dist.', 'Build passed; production visual check plan ready.'],
  ['npm run firebase:deploy-rules', 'PRODUCTION-IMPACTING COMMAND: deploys Firestore Rules and indexes.', 'Rules tests passed; authorization impact reviewed.'],
  ['npm run firebase:deploy-all', 'PRODUCTION-IMPACTING COMMAND: deploys Hosting, Rules, and indexes.', 'Use only when all targets intentionally changed.'],
])}

## Deployment Flow

\`\`\`mermaid
${diagrams['deployment-flow.mmd']}
\`\`\`

No production deployment is performed by documentation generation.
`)

add('manual/14-troubleshooting-and-repairs.md', `# Troubleshooting and Repairs

Use the runbooks in \`docs/runbooks/\` for step-by-step procedures.

Priority problems:

- Blank page or stale deployment chunk.
- Login or auth persistence failure.
- Missing or insufficient permissions.
- Owner account denied.
- Staff assignment missing.
- Scanner cannot check in.
- Firestore permits data that frontend hides or frontend shows data Firestore denies.
- Build, dependency, emulator, or deployment failure.
- QR scanner failure during an event.
`)

add('manual/15-legacy-systems-and-technical-debt.md', `# Legacy Systems and Technical Debt

## Current Register

${table(['Item', 'Classification', 'Notes'], [
  ['Archived migration evidence', 'archive only / future review required', 'Located at C:\\Users\\Jaylan\\Documents\\Archived Projects\\gsv-codex-demo-migration-evidence-2026-08-21. Contains CPB/CODEX_DEMO evidence and old repo snapshots.'],
  ['Legacy repository archive', 'archive only', 'Located at C:\\Users\\Jaylan\\Documents\\Archived Projects\\gathervibes-legacy-repository-archive-2026-08-21.'],
  ['21 node_modules in historical archive snapshots', 'future review required', 'Generated dependencies likely reclaimable, but recursive deletion was blocked in Phase 2.'],
  ['Historical branches', 'future review required', 'Branches were not deleted in Phase 2. Review merge status before any cleanup.'],
  ['Active copilot worktree', 'current / unknown future work', 'Retained at C:\\Users\\Jaylan\\Documents\\gathetr.worktrees\\copilot-personalized-welcome-tour-implementation.'],
  ['React Doctor warnings', 'technical debt', 'doctor:json reports warnings, but doctor:changed found no issues for Phase 2 changed file.'],
  ['Legacy role aliases', 'legacy but required', 'accessRoles retains aliases such as checkInStaff for compatibility.'],
])}
`)

add('manual/16-change-management.md', `# Change Management

No meaningful coding task is complete until documentation impact has been reviewed.

Every handoff must report:

- Documentation reviewed: YES/NO
- Documentation changed: YES/NO
- Documentation files changed
- Reason no documentation update was required

Use templates in \`docs/templates/\` for change records, incidents, repair runbooks, release checklists, and manual update checklists.
`)

add('manual/17-reference-and-glossary.md', `# Reference and Glossary

## Glossary

- Approved Organizer: an active email in \`settings/accessControl\`.
- Protected Owner: the permanent UID-protected owner account, independent of mutable allowlists.
- Working Event: selected event context used by event-scoped pages.
- CODEX_DEMO: synthetic training event safe for reversible QA.
- CPB: real completed event; not a synthetic QA target.
- Audit log: append-only evidence document required for many business writes.
- Query rules are not filters: Firestore denies a query if it could return unauthorized documents.

## Search Keywords

\`\`\`text
Firebase missing or insufficient permissions resource.data request.resource.data
Firestore query rules are not filters
React Firebase auth state loading before Firestore query
Vite dynamic import Failed to fetch dynamically imported module
Firebase Hosting stale service worker chunk cache
Playwright Firebase emulator auth firestore port taken 9099 8080
html5-qrcode camera permission HTTPS mobile browser
GSV:TICKET QR payload ticketCode privacy
read-excel-file browser XLSX import mapping
React Doctor no-loading-flag-reset-outside-finally
\`\`\`
`)

add('manual/18-future-app-development-reference.md', `# Future App Development Reference

Lessons from Gathetr that apply to future React/Firebase apps:

- Design the permission model before building pages.
- Keep frontend route gates and backend Rules aligned but separate.
- Use one authoritative source for access control and display it in Settings.
- Avoid synthetic QA against real event data.
- Keep QR payloads privacy-safe and stable.
- Add emulator-backed rule tests before deploying Rules.
- Document every schema, role, status, and workflow change at the time it changes.
- Keep generated PDFs as snapshots, not the source of truth.
`)

add('data-dictionary/FIRESTORE_DATA_DICTIONARY.md', files.get(path.join(docsRoot, 'manual/08-firestore-data-model.md')).replace('# Firestore Data Model', '# Firestore Data Dictionary'))

add('permissions/PERMISSION_MATRIX.md', files.get(path.join(docsRoot, 'manual/09-permissions-and-security-rules.md')).replace('# Permissions and Security Rules', '# Permission Matrix and Security Rules'))

add('runbooks/PERMISSION_FAILURE_RUNBOOKS.md', runbook(
  'Permission Failure Runbooks',
  'A signed-in user sees an access denied page, Firestore reports missing or insufficient permissions, owner controls disappear, staff cannot access an assigned event, or scanner check-in fails.',
  '- Access record inactive, removed, or not normalized.\n- Staff profile missing or inactive.\n- Event assignment missing, inactive, wrong UID, or wrong eventId.\n- Frontend route gate and Firestore rule differ.\n- Query is too broad for rules.',
  '- src/auth/AuthProvider.jsx\n- src/utils/accessRoles.js\n- firestore.rules\n- src/services/accessManagementService.js\n- src/services/staffManagementService.js\n- src/components/AssignedEventGate.jsx',
  '- npm test -- tests/settings-access-management.test.js\n- npm test -- tests/protected-owner-authorization-matrix.test.js\n- npm run product:qa',
  '- Normalize access metadata without weakening rules.\n- Add or restore active staff assignment only for the correct event.\n- Fix frontend display if it claims access that rules deny.\n- Fix Firestore Rules only with emulator tests.',
  'Firebase missing or insufficient permissions approvedEmails staffProfiles staffAssignments Protected Owner UID'
))

add('runbooks/AUTH_AND_LOGIN_RUNBOOK.md', runbook(
  'Authentication and Login Runbook',
  'Login loops, popup failure, redirect failure, stale return path, account signs in but remains unauthorized, or Firebase Auth persistence fails.',
  '- Unauthorized Firebase Auth domain.\n- Popup blocked or cancelled.\n- Redirect state stale.\n- Auth persistence failure.\n- User authenticated but not approved in Gathetr access model.',
  '- src/auth/AuthProvider.jsx\n- src/auth/authFlow.js\n- src/lib/firebase.js\n- firebase.json\n- .firebaserc',
  '- npm test -- tests/auth-reliability.test.js\n- npm run product:qa',
  '- Keep popup/redirect fallback behavior intact.\n- Verify Firebase authorized domains.\n- Repair access data through Settings/Protected Owner path, not hardcoded frontend lists.',
  'Firebase Auth popup redirect auth/persistence-failed authorized domain onAuthStateChanged'
))

add('runbooks/SCANNER_AND_QR_RUNBOOK.md', runbook(
  'Scanner and QR Runbook',
  'Camera fails, QR does not scan, scan finds no guest, scanner user denied, duplicate check-in blocked, or event-day operator cannot complete check-in.',
  '- Browser camera permission or HTTPS problem.\n- QR payload is not GSV:TICKET:{ticketCode}.\n- Scanner lacks active staff assignment.\n- Registration belongs to another event.\n- Firestore rules reject non-minimal check-in update.',
  '- src/components/checkin/QrScannerPanel.jsx\n- src/pages/ScannerPage.jsx\n- src/pages/CheckInPage.jsx\n- src/utils/qrTicketUtils.js\n- src/utils/checkInUtils.js\n- firestore.rules',
  '- npm test -- tests/phase14-camera-checkin.test.js\n- npm test -- tests/phase7-qr-checkin.test.js\n- npm run e2e:smoke',
  '- Do not change QR format casually.\n- Repair assignment/event scope first.\n- Keep scanner write payload minimal and audit-coupled.',
  'html5-qrcode camera permission GSV:TICKET ticketCode scanner staffAssignments check-in permission denied'
))

add('runbooks/BUILD_DEPLOYMENT_RECOVERY_RUNBOOK.md', runbook(
  'Build, Deployment, and Recovery Runbook',
  'Build fails locally, production blank page, stale dynamically imported module, wrong Firebase project, emulator port taken, or deployment regression.',
  '- Dependency mismatch.\n- Stale browser cache after Hosting deploy.\n- Wrong Firebase project selected.\n- Emulator ports 8080/9099 already in use.\n- Firestore Rules deployed without matching tests.',
  '- package.json\n- firebase.json\n- .firebaserc\n- vite.config.js\n- playwright.config.js\n- src/components/AppErrorBoundary.jsx\n- src/utils/appErrorDiagnostics.js',
  '- npm run lint\n- npm test\n- npm run build\n- npm run product:qa\n- npm run e2e:smoke',
  '- For stale chunks, hard reload and use Reload Latest Version in app error page.\n- Stop port conflicts before emulator QA.\n- Roll back Hosting or Rules separately depending on changed target.',
  'Vite build dynamic import stale chunk Firebase Hosting rollback emulator port taken 8080 9099'
))

add('problem-register/PROBLEM_AND_REPAIR_REGISTER.md', `# Problem and Repair Register

${table(['Problem ID', 'Symptom', 'Root cause', 'Date first seen', 'Date last seen', 'Occurrences', 'Affected feature', 'Affected files', 'Repair', 'Regression test', 'Runbook', 'Status'], [
  ['GSV-PROB-001', 'Document helper test expected one expired document but current date made two expired.', 'Date-sensitive fixture used 2026-08-20 and summary helper used current clock.', '2026-08-21', '2026-08-21', '1 known', 'Documents/tests', 'tests/document-contact-foundation.test.js', 'Changed fixture to 2026-08-30 to preserve expiring-soon intent.', 'npm test', 'Build/deployment recovery; testing manual', 'Resolved'],
  ['GSV-PROB-002', 'product:qa emulator startup failed because ports were taken.', 'Concurrent emulator-backed smoke run used auth/firestore ports.', '2026-08-21', '2026-08-21', '1 known', 'QA runner', 'package.json; scripts/product/runProductCommand.mjs; playwright.config.js', 'Reran product:qa serially after smoke completed.', 'npm run product:qa', 'Build/deployment recovery', 'Operational workaround'],
  ['GSV-PROB-003', 'Generated dependency cleanup inside archive could not run.', 'Runtime command policy blocked recursive delete before execution.', '2026-08-21', '2026-08-21', '1 known', 'Development environment cleanup', 'Archived migration evidence', 'Preserved material and documented reclaimable follow-up.', 'N/A', 'Legacy systems', 'Future review required'],
  ['GSV-PROB-004', 'Permission denied while UI appears available.', 'Potential drift between frontend access roles and Firestore Rules.', 'Unknown', 'Unknown', 'Unknown', 'Permissions', 'src/utils/accessRoles.js; firestore.rules', 'Compare route gate, user access source, target document fields, and rule tests.', 'npm run product:qa', 'Permission Failure Runbooks', 'Monitored'],
])}
`)

add('changelog/DOCUMENTATION_CHANGELOG.md', `# Documentation Changelog

## 2026-08-21

- Created Phase 3 technical manual source structure.
- Added Firestore data dictionary, permission matrix, runbooks, ADRs, problem register, templates, diagrams, and PDF generation.
- Added permanent documentation update policy to AI agent governance.
`)

const templates = {
  'CHANGE_RECORD_TEMPLATE.md': '# Change Record Template\n\n- Date:\n- Branch:\n- Commit:\n- What changed:\n- Why:\n- Files affected:\n- Data/schema changes:\n- Permission changes:\n- Tests:\n- Documentation reviewed: YES/NO\n- Documentation changed: YES/NO\n- Follow-up:\n',
  'INCIDENT_TEMPLATE.md': '# Incident Template\n\n- Date/time:\n- Reporter:\n- Symptom:\n- Severity:\n- Production affected: YES/NO\n- Firebase target:\n- Evidence:\n- Root cause:\n- Repair:\n- Verification:\n- Rollback:\n- Documentation updates:\n',
  'REPAIR_RUNBOOK_TEMPLATE.md': '# Repair Runbook Template\n\n## Problem\n\n## Symptoms\n\n## Likely causes\n\n## Severity\n\n## First checks\n\n## Files to inspect\n\n## Commands to run\n\n## Diagnostic steps\n\n## Repair options\n\n## Verification\n\n## Rollback\n\n## Search keywords\n',
  'RELEASE_CHECKLIST.md': '# Release Checklist\n\n- [ ] Branch clean and synced\n- [ ] Documentation impact reviewed\n- [ ] Lint passed\n- [ ] Tests passed\n- [ ] Build passed\n- [ ] Product QA passed\n- [ ] E2E smoke passed\n- [ ] Firebase target changes identified\n- [ ] Production-impacting deploy approved\n- [ ] Post-deploy hard refresh checked\n- [ ] Console/network checked\n- [ ] Rollback path known\n',
  'MANUAL_UPDATE_CHECKLIST.md': '# Manual Update Checklist\n\n- [ ] Route map current\n- [ ] File map current\n- [ ] Data dictionary current\n- [ ] Permission matrix current\n- [ ] Runbooks updated\n- [ ] Problem register updated\n- [ ] ADR added if architectural decision changed\n- [ ] Screenshots reviewed if UI changed\n- [ ] PDF regenerated\n- [ ] docs:validate passed\n',
}
for (const [fileName, content] of Object.entries(templates)) add(`templates/${fileName}`, content)

add('screenshots/SCREENSHOT_CATALOG.md', `# Screenshot Catalog

Screenshots should use CODEX_DEMO or local emulator data and avoid secrets or personal data.

Current Phase 3 PDF uses diagrams and written references as the durable source. During Phase 2, 42 local viewport screenshots were generated under ignored \`test-results\` to verify desktop/tablet/mobile route rendering. Future UI changes should capture updated screenshots into this folder only after confirming they expose no private data.
`)

for (const [fileName, source] of Object.entries(diagrams)) add(`diagrams/${fileName}`, source)

const adrs = [
  adr(1, 'React and Vite frontend', 'Gathetr is a browser-delivered event operations SPA with many organizer routes and local/emulator testing needs.', 'Use React 19, React Router, Vite, and Firebase client SDK as the frontend architecture.', 'Fast local development, static Firebase Hosting deployment, route-level lazy loading, and browser-based QA.', 'package.json; src/App.jsx; vite.config.js'),
  adr(2, 'Firebase backend and Firestore Rules', 'The app needs private authenticated data, event-scoped reads/writes, and append-only audit evidence.', 'Use Firebase Auth, Cloud Firestore, Firestore Rules, and Firebase Hosting.', 'Security must be kept in Rules and tested with emulators before production deploys.', 'src/lib/firebase.js; firestore.rules; firebase.json'),
  adr(3, 'Protected Owner and approved organizer model', 'Settings access must not be able to lock out the owner while approved organizers remain manageable.', 'Protected Owner access is UID-based; organizer access is sourced from settings/accessControl.', 'Owner remains recoverable; Settings must display the same authoritative source used by auth.', 'src/config/protectedOwner.js; src/utils/accessRoles.js; src/auth/AuthProvider.jsx'),
  adr(4, 'Privacy-safe QR ticket payload', 'Tickets need QR scanning without embedding private guest information.', 'QR payload is GSV:TICKET:{ticketCode}.', 'Stable lookup format; no private data in QR; migration required for any future payload change.', 'src/utils/qrTicketUtils.js; src/components/tickets/TicketQrCode.jsx'),
  adr(5, 'Preview-first import architecture', 'Imports can create many records and must avoid accidental writes.', 'Parse and preview CSV/XLSX/pasted rows before explicit final confirmation and chunked writes.', 'Safer import workflow; more validation code; easier troubleshooting.', 'src/pages/ImportsPage.jsx; src/utils/importUtils.js; src/services/importService.js'),
  adr(6, 'Documentation as source plus generated PDF', 'Future maintainers need searchable offline documentation without relying on chat history.', 'Keep Markdown source in docs and generate a PDF snapshot.', 'Docs can be reviewed in Git and shared as PDF; generated artifacts must be rebuilt after meaningful changes.', 'docs/README.md; scripts/docs/generateTechnicalManual.mjs'),
]
adrs.forEach((content, index) => add(`decisions/ADR-${String(index + 1).padStart(3, '0')}.md`, content))
add('decisions/ADR_TEMPLATE.md', adr('XXX', 'Title', 'Describe the condition that required a decision.', 'Describe the decision.', 'Describe tradeoffs and maintenance cost.', 'List files, docs, tests, and links.'))

add('generated/MANUAL_SOURCE_COMBINED.md', Array.from(files.entries())
  .filter(([filePath]) => filePath.includes(`${path.sep}manual${path.sep}`))
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([filePath, content]) => `<!-- Source: ${path.relative(root, filePath)} -->\n\n${content}`)
  .join('\n\n---\n\n'))

async function writeAll() {
  await Promise.all([
    manualDir,
    generatedDir,
    diagramsDir,
    runbooksDir,
    dataDictionaryDir,
    permissionsDir,
    decisionsDir,
    changelogDir,
    problemRegisterDir,
    templatesDir,
    screenshotsDir,
  ].map((dir) => mkdir(dir, { recursive: true })))
  for (const [filePath, content] of files) {
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, content, 'utf8')
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]))
}

function markdownToHtml(md) {
  const lines = md.split('\n')
  const html = []
  let inCode = false
  let code = []
  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`)
        code = []
        inCode = false
      } else {
        inCode = true
      }
      continue
    }
    if (inCode) {
      code.push(line)
      continue
    }
    if (line.startsWith('# ')) html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`)
    else if (line.startsWith('## ')) html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`)
    else if (line.startsWith('### ')) html.push(`<h3>${escapeHtml(line.slice(4))}</h3>`)
    else if (line.startsWith('| ')) html.push(`<p class="table-line">${escapeHtml(line)}</p>`)
    else if (line.startsWith('- ')) html.push(`<p class="bullet">${escapeHtml(line)}</p>`)
    else if (!line.trim()) html.push('')
    else html.push(`<p>${escapeHtml(line)}</p>`)
  }
  return html.join('\n')
}

async function buildPdf() {
  const combined = files.get(path.join(docsRoot, 'generated/MANUAL_SOURCE_COMBINED.md'))
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Gathetr Technical Manual</title>
<style>
@page { margin: 0.65in 0.55in; }
body { font-family: Arial, Helvetica, sans-serif; color: #24151c; line-height: 1.42; font-size: 10.5pt; }
h1 { break-before: page; font-size: 22pt; color: #2b1723; margin: 0 0 12px; }
h1:first-child { break-before: auto; }
h2 { font-size: 15pt; color: #6f3340; margin: 18px 0 8px; border-bottom: 1px solid #ead8cf; padding-bottom: 3px; }
h3 { font-size: 12pt; color: #4d2b35; margin: 14px 0 6px; }
p { margin: 5px 0; }
.bullet { padding-left: 14px; text-indent: -10px; }
pre { background: #fff8f2; border: 1px solid #ead8cf; border-radius: 6px; padding: 8px; white-space: pre-wrap; font-family: Consolas, monospace; font-size: 8pt; }
.table-line { font-family: Consolas, monospace; font-size: 7.3pt; white-space: pre-wrap; background: #fffdf9; margin: 1px 0; }
</style>
</head>
<body>${markdownToHtml(combined)}</body>
</html>`
  const htmlPath = path.join(generatedDir, 'Gathetr_Technical_Operations_Maintenance_and_Repair_Manual.html')
  const pdfPath = path.join(generatedDir, 'Gathetr_Technical_Operations_Maintenance_and_Repair_Manual.pdf')
  await writeFile(htmlPath, html, 'utf8')
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'load' })
  await page.pdf({
    path: pdfPath,
    format: 'Letter',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-size:8px;color:#6b564c;width:100%;padding:0 40px;">Gathetr Technical Manual</div>',
    footerTemplate: '<div style="font-size:8px;color:#6b564c;width:100%;padding:0 40px;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
    margin: { top: '0.75in', right: '0.55in', bottom: '0.75in', left: '0.55in' },
  })
  await browser.close()
  const ownerDir = 'C:\\Users\\Jaylan\\Documents\\Development Documentation\\gathetr-phase-3-technical-manual-2026-08-21'
  await mkdir(ownerDir, { recursive: true })
  await copyFile(pdfPath, path.join(ownerDir, 'Gathetr_Technical_Operations_Maintenance_and_Repair_Manual.pdf'))
}

await writeAll()
await buildPdf()
console.log(`Generated Gathetr technical manual documentation for commit ${currentCommit}`)
