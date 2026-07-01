# Gather & Savor Event Hub — Complete Implementation Handoff

Last updated: July 1, 2026 (Phase 17D-A closed as an approved planning-only blueprint and is merge-ready; Phase 17C-B closed with Firestore rules deployed in B2, Hosting-deployed, organizer scanner smoke passed, and admin after-smoke passed; Phase 17C-A closed, merged, and Hosting-deployed; Phase 17B closed, merged, and Hosting-deployed; Phase 17A closed, merged, and deployed; Phase 16 closed, merged, and deployed; Phase 15B closed, merged, and deployed)

## 1. Project overview

**Project:** Gather & Savor Event Hub  
**Brand:** Gather & Savor Vibes  
**Initial event:** Cake Picnic Barbados  
**Purpose:** A private event-operations dashboard for the organizer and trusted staff.

This is not a public attendee application. Guests continue using Instagram, Linktree, Google Forms, and Google Sheets. The dashboard is for internal event administration only. It is a private web admin app, not a native Android or iOS application.

The repository currently contains:

- Phase 1: application foundation, authentication, protected routing, theme, responsive admin layout, Firebase initialization, Hosting configuration, and Firestore rules.
- Phase 2: complete Events CRUD, active-event selection, event validation, operational states, and append-only audit logging.
- Phase 2.5: Google sign-in with email/password backup plus a mobile-first installable PWA foundation.
- Phase 3: registrations CRUD, CSV upload/paste import, field mapping, import preview, duplicate detection, stable privacy-safe import IDs, and registration audit logging (Cursor-reviewed).
- Phase 3.1 recovery: Google auth restored, production security verified, price tier schema, enhanced dashboard with live countdowns, registration metrics, selected-event UX. PR #3 (`cursor/review-phase3-1-google-auth` -> `main`) has been merged and redeployed to Firebase project `gathervibeshub`.
- Phase 3.2: Import Center cleanup with source selector, CSV/pasted table import, and Excel/XLSX workbook import.
- Phase 4.5 foundation: ticket assignment plus search-based door check-in for approved admins.
- Phase 5: Production QA Hardening with a private QA Center, CODEX_TEST helper data, and read-only fixture verification.
- Phase 11: Communications Pro copy-only message preparation and CSV/contact packets.
- Phase 13A: AI Draft Lab prompt builder only; no real AI API or sending.
- Phase 14B: CPB Payment Audit UI Cleanup / Operations Review Fixes, dry-run first, no CPB apply.
- Phase 15A: Hosting Security Headers + Private Indexing, deployed live.
- Phase 15B: XLSX dependency security review plus roadmap/access/Event Operations status cleanup — closed, merged, and deployed.
- Phase 16: Live Browser Loading Diagnostics + Ticket/Check-In QA Hardening — closed, merged, and deployed.
- Phase 17A: Visibility, Counts, Backlog Reorganization, and Staff Access Planning — closed, merged, and deployed.
- Phase 17B: Staff / Worker Roles Foundation — closed, merged, and Hosting-deployed; Firestore rules prototype was merged for review and not deployed at Phase 17B closeout.
- Phase 17C-A: Firestore Rules Review + Deployment Readiness — closed, merged, and Hosting-deployed; Firestore rules were dry-run validated and not deployed at Phase 17C-A closeout.
- Phase 17C-B: Firestore Rules Deployment Approval + Live Scanner/Staff Smoke + Scanner-Only PWA Mode — closed, merged-ready, Firestore rules deployed in B2, Hosting-deployed, organizer scanner smoke passed, admin after-smoke passed.
- Phase 17D-A: Access & Roles Planning + Scanner Day-of Polish Blueprint — closed, merged-ready, planning-only blueprint approved; no new live permissions or workflow changes.

Phase 15B removes the vulnerable SheetJS `xlsx` package from production dependencies and keeps XLSX import on the already-installed `read-excel-file/browser` parser. Staff/scanner accounts must not be added to approvedEmails; Phase 17B introduced a prototype `staffProfiles/{uid}` and `events/{eventId}/staffAssignments/{uid}` rules-backed model for future scoped staff access.

Phase 16 investigated live browser loading differences across devices, kept the Phase 15A security headers intact, added a safe root loading error fallback, expanded QA Center guidance for CODEX_TEST ticket/check-in retesting, and hardened clean-account/null-config route loading. It did not add public portals, automatic sending, real AI API calls, Cloud Functions, Storage, or Firestore rule changes.

Permanent clean-account engineering standard: all future features must support clean/new approved account state, no selected Working Event, stale or empty localStorage, null or missing event config, null or missing currency with `BBD` fallback, null or missing ticket prefix with `GSV` fallback, null or missing `priceTiers` with `[]` fallback, and all protected routes rendering without the AppErrorBoundary fallback.

Phase 17A was not a rules or access-broadening phase. It reorganized backlog visibility, audited registration/guest count wording, preserved clean-account behavior, and prepared a Phase 17B staff/worker access plan without implementing Firestore role rules.

Phase 17B closed the staff-role foundation and UI/access planning. It keeps approved-admin access unchanged and merged prototype Firestore rules for staff profiles and assigned-event staff assignments for review only. Those Firestore rules remained undeployed at Phase 17B closeout; real staff/scanner access requires Phase 17C with explicit Firestore rules deployment approval and a live staff smoke test.

Phase 17C-A reviewed, hardened, documented, and tested the merged Phase 17B Firestore rules prototype without deploying it. At Phase 17C-A closeout, Firestore rules were reviewed and dry-run validated while Firestore rules and Firestore indexes remained undeployed. Admin access remains controlled by `settings/accessControl.approvedEmails`, which is admin-level access only. Staff/scanner/helper accounts must not be added to `approvedEmails`. Phase 17C-B became the required live rollout step and later closed after organizer scanner smoke and admin after-smoke confirmation passed.

Before any future AI/Codex phase, read `AI_AGENT_RULES.md`, `PROJECT_HANDOFF.md`, and `README.md`. Future changes must check the full app flow, related docs, tests, rules, and UI copy so stale project knowledge does not conflict with current behavior.

Phase 17C-B is closed, merged-ready, Firestore-rules-deployed in B2, and Hosting-deployed. The delivered scanner surface is the private `/scanner` route: mobile-first, no AppShell admin navigation for scanner users, assigned-event-only lookup, safe guest/ticket/check-in fields, one explicit Check In tap, scanner shortcuts, and admin logo-to-dashboard navigation. Phase 17C-B2 passed preflight, verified rollback readiness, verified `TEST_SCANNER_EMAIL` (`ojah13635@gmail.com`) as Firebase Auth UID `5WN4oTTesCYO14tX6HlUE6W5LM72`, confirmed the scanner Auth user exists and is not in `approvedEmails`, created/verified `staffProfiles/{uid}` and `events/xPfa0b3KZyLSDnAD2uGI/staffAssignments/{uid}`, confirmed no CPB assignment exists, and deployed Firestore rules only. Firestore indexes were not deployed. CODEX_TEST is the only allowed test event for scanner smoke; CPB must not be selected, assigned, read as scanner, or used for QA. Native app work remains deferred.

Phase 17C-B3 fixed the scanner login auth gate after the scanner signed in but was blocked by the approvedEmails-only message. approvedEmails is admin-level access only. Staff/scanner users must remain outside approvedEmails and must be admitted through active staffProfiles/{uid} plus active events/{eventId}/staffAssignments/{uid}. AuthProvider/ProtectedRoute must check both paths: approved admin first, then staff profile/assignment access before showing a not-approved message. Do not solve scanner login by adding the scanner to approvedEmails.

Scanner/check-in-only access remains check-in only. Do not give the normal scanner role Undo Check-In or Check Out. Approved admins may keep using the existing admin-only undo/check-out path where already implemented. A future lead-scanner undo permission may be planned later, but it is not implemented now.

Phase 17C-B1b keeps scanner isolated while improving approved-admin navigation. The main admin AppShell brand mark links back to `/dashboard`; `/scanner` does not expose that admin-home brand behavior. Settings is organized into tabbed categories with query links such as `/settings?tab=access`, preserving approvedEmails warnings, TEST_SCANNER_EMAIL blocker status, CODEX_TEST/CPB guidance, deferred integrations, private indexing/security guidance, and the future Access & Roles plan without implementing an approval workflow or rules-rewrite UI.

Organizer-provided closeout PASS is recorded for Phase 17C-B. Scanner login works, no approvedEmails error appears, scanner lands on `/scanner`, no admin nav is shown, only CODEX_TEST is available, CPB is not visible or accessed, check-in works, duplicate check-in blocks, and the normal scanner role has no Undo Check-In button. Approved admin login works, Dashboard/Settings/QA/Registrations/Tickets/Check-In/Scanner open, CODEX_TEST reflects the scanner check-in, CPB is not selected, and no error screen appears. `AI_AGENT_RULES.md` is required reading for future AI/Codex phases.

Phase 17D-A is closed, merge-ready, and approved as a planning-only blueprint. Its deliverable is `PHASE_17D_PLAN.md`: a blueprint for Access & Roles Management Center planning, Settings approval-flow planning, scanner day-of polish, sound/haptic feedback planning, scanner success/error UI planning, event-day helper ergonomics, and lead-scanner role planning only. Organizer review is recorded as PASS. It does not implement live approval or revoke workflows, does not change Firestore rules, does not create staff users or assignments, and does not change current permissions.

Phase 17D-A preserved the live safety boundary exactly: no permissions were broadened, `approvedEmails` remains admin-level access only, staff/scanner access remains `staffProfiles/{uid}` plus `events/{eventId}/staffAssignments/{uid}`, scanner remains assigned-event-only and no-undo, admin undo remains admin-only where already implemented, CPB remains protected production data, CODEX_TEST remains QA/smoke only, QR payload remains `GSV:TICKET:{ticketCode}`, Firestore rules were not deployed in 17D-A, Firestore indexes were not deployed, `xlsx` remains absent, and `read-excel-file` remains active.

No live approval/revoke workflow exists yet, and no live lead-scanner permission exists yet. The next recommended subphase is Phase 17D-B scanner day-of polish only. Phase 17D-C Access & Roles read-only/admin UI foundation remains later.

Backlog/status visibility order:

1. Closed / shipped phases
2. Current active phase
3. Next recommended phase
4. High-priority operational backlog
5. Access / staff / worker permissions backlog
6. Event Operations backlog
7. QA / reliability backlog
8. Deferred integrations
9. Public portals / native app / future long-term ideas
10. Explicitly not implemented / out of scope

Registration/guest count standard: registrations are registration records; guests are the sum of `personsAttending` across those records. One registration can represent more than one guest. If no Working Event is selected, routes must show a no-selected-event state instead of stale counts.

Phase 17B staff access model: roles include owner/admin, event manager, scanner/check-in-only, viewer/read-only, and operations helper. Scanner/check-in-only must be restricted to assigned event lookup/check-in and must not have Events CRUD, registration delete, import apply, finance/operations ledger edits, settings/accessControl edits, auditLog delete/update, or broad CPB access unless explicitly assigned. The current `settings/accessControl` approved-admin allowlist remains the live owner/admin enforcement boundary and staff/scanner accounts must not be added to `approvedEmails`. Prototype staff collections are `staffProfiles/{uid}` and `events/{eventId}/staffAssignments/{uid}`; role restrictions must be enforced by Firestore rules, not only UI navigation. Live staff/scanner access is not active until Phase 17C reviews and deploys Firestore rules with organizer approval.

## Production QA fixture

`CODEX_TEST Live Verification Event` is intentionally kept as the permanent QA / smoke-test event.

Rules:

- This event may be used for safe app testing.
- Event ID: `xPfa0b3KZyLSDnAD2uGI`.
- Do not use it for real guests.
- Do not delete it unless the organizer explicitly says so.
- Do not create a new daily test event; reuse the existing CODEX_TEST event.
- CPB is real production data and must not be used for QA. CPB event ID: `zhaPxi31cpqLAW0cuS20`.
- Do not delete `auditLogs` globally.
- Prefix test data clearly with `CODEX_TEST` or `CODEX_DAILY`.
- Any future write smoke test must be opt-in only with `QA_WRITE_SMOKE=true`.
- Because audit logs are append-only, write smoke tests will create audit log records. That is expected and should be documented before enabling them.

## Phase 5 Production QA Hardening

- `/qa` is a private approved-admin route for safe production smoke-test guidance.
- QA Center shows CODEX_TEST status, CODEX_TEST event ID, CPB production-data warning, current Working Event status, audit log read status, System Health, and a safe QA checklist.
- QA Center generates a `CODEX_TEST_YYYYMMDD_HHMM` prefix and copyable sample CSV for Import Center testing.
- The helper never writes Firestore data automatically. Registration, import, ticket, and check-in smoke tests remain manual through the app and must use CODEX_TEST only.
- Read-only fixture verification command: `npm run admin:verify-production-fixtures`.
- The verification script requires Firebase project `gathervibeshub`, verifies exactly one CODEX_TEST event, verifies CPB is unchanged, verifies auditLogs exist, and performs no writes or deletes.
- Audit logs are append-only. Do not delete auditLogs globally.

## Daily QA

GitHub Actions workflow: `.github/workflows/daily-qa.yml`

The scheduled daily workflow is read-only by default:

- `npm ci`
- `npm run lint`
- `npm test`
- `npm run build`
- Built auth UI smoke check for Google and email/password entry points
- Live HTTP smoke check for `https://gathervibeshub.web.app/` and `/login`

The workflow does not require service account secrets and does not automate Google OAuth login. Optional Firestore health checks may be added later only if repository secrets are configured safely. Do not commit service account JSON files, private keys, `.pem`, `.key`, or `.env.local`.

## 2. Technology stack

- React 19
- Vite 7
- JavaScript and JSX
- Tailwind CSS 4
- Firebase Authentication
- Cloud Firestore
- Firebase Hosting
- Web app manifest and deliberately no-cache service worker lifecycle
- React Router
- Lucide React icons
- ESLint
- Node.js built-in test runner

Important dependency versions are recorded in `package.json` and locked in `package-lock.json`.

## 3. Current implementation status

### Phase 1 — Complete

- React and Vite application setup
- Tailwind CSS integration through the Vite plugin
- Branded cream, blush, rose-gold, champagne, and deep-plum theme
- Responsive private admin shell
- Desktop sidebar and mobile navigation drawer
- Login page with email and password fields
- Google Authentication as the primary sign-in option
- Email/password Authentication retained as backup
- Authentication loading state
- Friendly authentication error messages
- Protected routes
- Return-to-requested-page behavior after authentication
- Firebase configuration through environment variables
- Explicit missing-Firebase configuration state
- Firebase Hosting single-page-application rewrites
- Hardened Firestore Security Rules
- Approved-admin email allowlist
- Append-only audit log rules
- Branded SVG favicon
- Settings/status page
- Routed phase-boundary pages for features not yet implemented

### Phase 2 — Complete

- Events page connected to Cloud Firestore
- Real-time event list using a Firestore snapshot subscription
- Create, edit, and delete events with explicit confirmation
- Event form validation
- Loading, error, empty, and success states
- Responsive desktop event table and mobile event cards
- Event summary counts
- Active-event selection with local persistence
- Atomic event and audit-log writes using Firestore batches
- Audit entries for event create, update, and delete

### Phase 2.5 — Complete

- Google full-page redirect flow for sign-up and login
- Firestore allowlist verification before protected routes receive a user
- Email/password backup preserved through the same allowlist verification
- Installable manifest: Gather & Savor Hub / G&S Hub
- Branded app icons and Apple touch icon metadata
- iPhone safe-area spacing and mobile bottom navigation
- Lifecycle-only service worker with no fetch interception or private-data caching

### Phase 3 — Complete (Cursor-reviewed)

- Registrations CRUD scoped to the active event via `useActiveEvent()`
- Manual registration create, edit, and delete with confirmation
- Search and payment-status filters
- CSV file upload and pasted CSV import
- CSV parser supporting quoted commas, quoted newlines, and escaped quotes
- Field mapping with header auto-detection
- Import preview before any Firestore write
- Row validation with valid, warning, and blocked states
- Duplicate detection by event-scoped email+timestamp, phone+timestamp, and sourceRowId
- Privacy-safe deterministic import IDs (`imp_` + SHA-256 prefix; no raw email/phone in document IDs)
- Import chunking at 249 rows per batch (registration + audit log per row)
- Append-only registration audit logs in the same batch as mutations
- Firestore rules for registrations with strict schema validation
- `checkedIn` locked to `false` and `checkInTime` locked to `null` in Phase 3
- Responsive mobile registration cards and desktop table
- Composite Firestore index on `registrations` (`eventId`, `createdAt`)

### Phase 3.1 recovery — Complete (PR #3 merged to `main`)

- Production security verified: `AuthProvider.jsx` enforces Firestore allowlist check; no debug bypasses present
- Price tier schema added to `validators.js`, `EventFormModal.jsx`, `eventService.js`, and `firestore.rules`
- Named tiers supported: Early Bird, General, Door, Tier 1, Tier 2, Tier 3, Complimentary
- Tier fields: `name` (required string), `price` (number ≥ 0), `status` (active | sold-out | hidden)
- Backward-compatible: existing events with only `ticketPrice` scalar continue to work
- Firestore rules updated: `priceTiers` optional list with strict per-tier validation (max 7) added to `isValidEvent`
- Dashboard rewritten: live local date/time clock, upcoming events from Firestore
- Dashboard: countdown badge on each upcoming event (updates every 30s)
- Dashboard: "Active Event" renamed to **Working Event / Selected Event** throughout
- Dashboard: explanation text — selected event is workspace-only, does not change event status
- Dashboard: clear selected event button (X on card header)
- Dashboard: select a different event directly from the upcoming events list
- Dashboard: registration metrics for selected event (total, paid, pending, complimentary)
- Dashboard: capacity progress bar with color thresholds (green → amber → red)
- Dashboard: price tier summary chips with sold-out and hidden visual states
- Excel/XLSX: implemented with `read-excel-file/browser`, sheet selection, and preview-before-write safety
- Google Sheets OAuth: remains deferred
- 52/52 tests pass; 0 lint errors; build clean

### Phase 3.2 Import Center — Completed and later deployed

- `/imports` renamed **Import Center** in navigation, dashboard entry points, and page heading
- Source selector added for Google Forms CSV, Google Sheets CSV, Excel/XLSX, pasted table text, bank/payment CSV, and custom files
- Source-specific helper text added for each requested source type
- Google Forms and Google Sheets remain export-to-CSV workflows
- Pasted table text and CSV upload still reuse the existing parse, map, preview, and confirm-import flow
- Header detection improved for payment references and notes
- XLSX upload is active. Workbooks are parsed with `read-excel-file/browser`, multiple sheets show a selector, formulas are not executed, and rows still go through map -> preview -> confirm before Firestore writes
- Google Sheets OAuth remains deferred

### Phase 4.5 Ticketing + Door Check-In foundation — Completed and later deployed

- `/tickets` route is live for approved admins
- Tickets page requires a selected Working Event
- Registrations list shows name, email, phone, payment status, ticket status, and ticket code
- Admins can assign manual `GSV-XXXXXX` codes
- Admins can generate readable privacy-safe codes
- Regeneration and clear/unassign require confirmation
- Filters: all, no ticket, assigned, paid, pending, complimentary
- Search covers name, email, phone, and ticket code
- Mobile cards and desktop table implemented
- Ticket actions write audit logs: `ticket.assign`, `ticket.unassign`, `ticket.regenerate`
- `/check-in` route is live for approved admins
- Check-In page requires a selected Working Event
- Large mobile-first search supports name, email, phone, and ticket code
- Guest card shows payment, ticket, and check-in status
- Check-in moves `checkedIn` false -> true and sets `checkInTime` / `checkedInBy`
- Duplicate check-in is blocked and can record `checkin.duplicate-attempt`
- QR camera lookup is active as a private-admin input method; manual ticket-code search remains the fallback
- No public attendee access, no real AI API, no OAuth, no automatic sending, no Cloud Functions

### Phase 5 Production QA Hardening — Complete

- `/qa` private QA Center route added for approved admins
- CODEX_TEST fixture status and CPB warning displayed
- Current Working Event indicates whether CODEX_TEST is selected
- Copyable CODEX_TEST sample CSV and safe test prefix helper added
- Manual QA checklist added for registration CRUD, CSV/XLSX import, ticket actions, check-in, duplicate block, and audit log verification
- Read-only production fixture verification script added
- No automatic write smoke tests added

## 4. Features intentionally not implemented

The following remain phase-gated or deferred:

- Firestore-enforced staff roles and scanner/check-in-only rules
- Mother/Event Manager simplified view
- Real AI API integration
- Automatic email sending
- Automatic WhatsApp sending
- Gmail/Outlook OAuth
- Google Sheets OAuth (deferred; use CSV export first)
- Public attendee portal
- Public baker portal
- Public school portal
- Public sitemap / JSON-LD for this private admin app
- Payment gateway integration
- Firebase Cloud Functions
- Firebase Storage
- Native Android/iOS apps, Capacitor, React Native, or Flutter
- Push notifications and Firebase Cloud Messaging
- Offline Firestore writes
- Service worker caching of private admin data

Communications Pro is active as copy-only tooling. AI Draft Lab is active as a prompt builder only; no real AI API key or sending is enabled. `/tickets`, `/check-in`, `/communications`, `/operations`, and `/qa` are live private-admin routes.

## 5. Application routes

| Route | Status | Purpose |
|---|---|---|
| `/login` | Complete | Google sign-in with email/password backup |
| `/dashboard` | Complete | Secure workspace and selected-event context |
| `/events` | Complete | Firestore event CRUD and active-event selection |
| `/registrations` | Phase 3 complete | Registration CRUD for the active event |
| `/imports` | Live/private-admin | Import Center source selector, CSV/XLSX upload, pasted table rows, mapping, preview, and import |
| `/tickets` | Live/private-admin | Ticket-code assignment, generation, regeneration, and unassignment |
| `/check-in` | Live/private-admin | Search-based door check-in and duplicate prevention |
| `/qa` | Live/private-admin | Private QA Center for CODEX_TEST status, CPB warning, sample CSV, checklist, and fixture verification guidance |
| `/communications` | Live/private-admin | Communications Pro copy-only message preparation and CSV/contact packets; no automatic sending |
| `/operations` | Live/private-admin | Event Operations Ledger for private-admin operational entries separate from ticket sales |
| `/ai-writing` | Redirected/deferred | AI Draft Lab prompt-builder tools live inside Communications; no real AI API |
| `/settings` | Complete | Firebase and data-model status |

Every route other than `/login` is protected by Firebase Authentication.

## 6. Firebase configuration

Firebase credentials are not committed to the repository. The application reads environment variables from `.env.local` (see `.env.example`).

Do not commit `.env.local`, service account keys, or admin SDK JSON private keys.

## 7. Firebase project and Console setup

- Firebase project ID: `gathervibeshub`
- Firebase project number: `9444350727`
- Production Hosting: `https://gathervibeshub.web.app`
- Google and Email/Password Authentication: enabled

Before live CRUD testing:

1. Confirm the organizer/trusted administrator Firebase Authentication user.
2. Create `settings/accessControl` with `approvedEmails` (lowercase strings matching Auth users).
3. Deploy reviewed Firestore rules and the registrations composite index when approved.

### Automatic Firebase admin setup

Preferred method:

1. Login to Firebase CLI:
   `npx firebase-tools login`

2. Set project:
   `npx firebase-tools use gathervibeshub`

3. Set admin emails locally:
   - **PowerShell:** `$env:ADMIN_EMAILS="your-lowercase-google-email@gmail.com"`
   - **Command Prompt:** `set ADMIN_EMAILS=your-lowercase-google-email@gmail.com`
   - **macOS/Linux:** `export ADMIN_EMAILS="your-lowercase-google-email@gmail.com"`

4. Run:
   `npm run admin:ensure-access`

5. Verify:
   `npm run admin:verify-firebase`

6. Deploy rules/indexes:
   `npm run firebase:deploy-rules`

7. Deploy hosting:
   `npm run firebase:deploy-hosting`

If Firebase Admin SDK credentials are missing, use a service account JSON stored OUTSIDE the repository and referenced only with `GOOGLE_APPLICATION_CREDENTIALS`. For example:
- **PowerShell:** `$env:GOOGLE_APPLICATION_CREDENTIALS="C:\secure-keys\gathervibeshub-admin.json"`
- **macOS/Linux:** `export GOOGLE_APPLICATION_CREDENTIALS="/secure-keys/gathervibeshub-admin.json"`

Never paste private keys into code and never commit a service account JSON.

### Troubleshooting Google sign-in

If you experience issues with Google sign-in (e.g., "This account is not approved"), verify the following in the Firebase Console:

**Firebase Authentication:**
- Google provider is enabled.
- Email/password provider remains enabled.
- The Google email used for login exists as an Authentication user after the first sign-in attempt.

**Firebase Authentication authorized domains:**
- `localhost`
- `gathervibeshub.firebaseapp.com`
- `gathervibeshub.web.app`

**Firestore:**
- Collection: `settings`
- Document: `accessControl`
- Field: `approvedEmails`
- Type: `array`
- Value: The **exact lowercase** Google email used to sign in.

## 8. Approved-admin allowlist

```text
Collection: settings
Document: accessControl
Field: approvedEmails
Type: array
Value: ["owner@example.com", "trusted.staff@example.com"]
```

Client code cannot create, update, or delete `settings/accessControl`.

## 9. Firestore Security Rules behavior

The rules in `firestore.rules` implement:

- Default deny for all unmatched paths
- Approved-admin access via `settings/accessControl.approvedEmails`
- Client writes to `settings/accessControl` denied
- Strict event schema validation and CRUD for approved admins
- Strict registration schema validation and CRUD for approved admins
- Registration create requires `checkedIn == false` and `checkInTime == null`
- Registration update keeps identity/source/create fields immutable
- Ticket assignment updates are constrained to ticket metadata fields
- Check-in updates are constrained to `checkedIn` false -> true, `checkInTime == request.time`, and approved admin `checkedInBy`
- Append-only `auditLogs` for matching event, registration, ticket, and check-in mutations
- `tickets`, `checkIn`, `communications`, and `aiDrafts` collections denied; ticket/check-in state lives on registration documents
- Other `settings/*` documents denied

Deploy rules only after explicit approval following this review.

## 10. Firestore event data model

Collection: `events`

```text
eventId       string         Firestore document ID duplicated as a field
eventName     string         Required
eventDate     Timestamp      Required
location      string         Required
eventType     string         Required enum
status        string         Required enum
capacity      number         Required integer > 0
ticketPrice   number         Required, zero or greater (backward-compat scalar)
priceTiers    list<map>|null Optional — Phase 3.1
                               { name: string, price: number>=0, status: active|sold-out|hidden }
                               Max 7 tiers. Named tiers, numeric price, and active/sold-out/hidden status are enforced by rules.
notes         string         Optional internal notes
createdAt     Timestamp      Immutable after create
updatedAt     Timestamp      Required on every update
```

Existing events without `priceTiers` continue to work unchanged.

## 11. Registrations collection data model

Collection: `registrations`

```text
registrationId     string       Document ID duplicated as a field; immutable after create
eventId            string       Required; immutable after create
fullName           string       Required, 1..250 characters
email              string|null  Normalized lowercase when present
phone              string|null
groupName          string|null
personsAttending   number       Integer 1..100
paymentStatus      string       paid | pending | complimentary | door-list | unknown
paymentReference   string|null
ticketStatus       string       no-ticket-assigned | partially-assigned | assigned
ticketCode         string|null  Readable private admin ticket code, e.g. GSV-ABC234
ticketAssignedAt   Timestamp|null
ticketAssignedBy   string|null  Admin email or UID fallback
notes              string       Internal notes, max 10000 characters
checkedIn          boolean      Door check-in state
checkInTime        Timestamp|null  Set on check-in
checkedInBy        string|null  Admin email or UID fallback
source             string       manual | csv-import
sourceRowId        string|null  Import row identifier (e.g. row-1)
timestamp          Timestamp|null  Original form submission time when known
createdAt          Timestamp    Immutable after create
updatedAt          Timestamp    Required on every update
```

Manual creates use Firestore-generated document IDs. CSV imports use deterministic privacy-safe IDs (`imp_<16-char hash>`).

Ticket and check-in fields are backward-compatible. New manual registrations and imports write the fields immediately; editing older registrations normalizes missing ticket/check-in metadata to null/default values without changing assigned tickets or check-in state.

## 12. Import workflow

```text
Google Form / Google Sheet / payment export → CSV, XLSX workbook, or pasted table → Admin loads into Import Center
  → Map columns to registration fields
  → Preview rows (valid / warning / blocked)
  → Confirm import
  → Chunked Firestore batch writes (registration + audit log per row)
```

Rules:

- Preview never writes to Firestore
- Rows missing both email and phone are blocked
- Duplicates blocked by email+timestamp, phone+timestamp, or sourceRowId within the event
- Google Sheets OAuth is not implemented; CSV export remains the supported path
- XLSX upload is implemented with a maintained parser dependency, sheet selector, and tests. Formulas are not executed.

## 13. Ticket and check-in workflow

```text
Tickets:
Selected Event → Tickets → assign/generate/regenerate/clear code
  → Firestore batch updates registration ticket fields
  → Append-only registration audit log

Check-In:
Selected Event → Check-In → search name/email/phone/ticket code
  → Review payment/ticket/check-in state
  → Check in guest once
  → Append-only registration audit log
```

Rules:

- Ticket code format is privacy-safe and readable in the app: `GSV-XXXXXX`
- Raw email and phone are never embedded in generated ticket codes
- Ticket code must not change unless explicitly regenerated
- Clear/unassign requires confirmation in the UI
- Check-in can be completed once; duplicate check-in is blocked
- Undo check-in is available for approved admins where implemented in the UI
- Undo check-in requires confirmation and writes `checkin.undo` in the same batch as the `checkedIn: false` update
- QR camera lookup is active as a private-admin input method; manual ticket-code search remains the fallback

## 14. Audit log data model

Collection: `auditLogs` (append-only)

Shared fields:

```text
logId          string       Audit document ID
eventId        string       Related event ID
action         string       See actions below
targetType     string       event | registration
targetId       string       Target document ID
performedBy    string       Admin email or UID fallback
timestamp      Timestamp    Server timestamp
details        map          Action-specific metadata
```

Event actions: `event.create`, `event.update`, `event.delete`  
Registration actions: `registration.create`, `registration.update`, `registration.delete`, `registration.import`, `ticket.assign`, `ticket.unassign`, `ticket.regenerate`, `checkin.complete`, `checkin.undo`, `checkin.duplicate-attempt`

Registration audit examples include `fullName` and, for imports, `sourceRowId`. Event audits include `eventName`.

All mutations commit the target document and audit log in one Firestore batch. Clients cannot update or delete audit logs.

## 15. Active-event behavior

Local storage key: `gather-savor-active-event`

Registrations, Import Center, Tickets, and Check-In require a selected Working Event from Events or the dashboard. Without a selected event, those pages show an empty state directing the organizer to choose an event.

## 16. Folder structure

```text
gather-savor-event-hub/
  firestore.rules
  firestore.indexes.json
  README.md
  PROJECT_HANDOFF.md
  src/
    App.jsx
    auth/
    components/
      events/
      imports/
      registrations/
      ui/
    events/
    layout/
    lib/
    pages/
      RegistrationsPage.jsx
      ImportsPage.jsx
      TicketsPage.jsx
      CheckInPage.jsx
    services/
      eventService.js
      registrationService.js
      importService.js
      ticketService.js
      auditService.js
    utils/
      importSources.js
      ticketUtils.js
  tests/
    event-utils.test.js
    import-center.test.js
    phase45-ticketing.test.js
    phase25-foundation.test.js
    registration-utils.test.js
    csv-parser.test.js
```

## 17. Important source files

| File | Responsibility |
|---|---|
| `src/lib/firebase.js` | Initializes Firebase Auth and Firestore |
| `src/auth/AuthProvider.jsx` | Tracks Firebase Authentication session |
| `src/auth/ProtectedRoute.jsx` | Blocks private routes for signed-out users |
| `src/App.jsx` | Registers implemented and future-phase routes |
| `src/layout/AppShell.jsx` | Responsive admin layout and navigation |
| `src/pages/RegistrationsPage.jsx` | Registration list, filters, CRUD coordination |
| `src/pages/ImportsPage.jsx` | Import Center wizard |
| `src/pages/TicketsPage.jsx` | Ticket assignment, generation, regeneration, and unassignment |
| `src/pages/CheckInPage.jsx` | Search-based door check-in and duplicate prevention |
| `src/services/registrationService.js` | Firestore registration subscription and batch mutations |
| `src/services/importService.js` | CSV parsing, mapping, validation, duplicate detection, chunked import |
| `src/services/ticketService.js` | Ticket/check-in mutations and audit batches |
| `src/services/auditService.js` | Creates append-only audit records |
| `src/services/eventService.js` | Firestore event subscription and batch mutations |
| `src/events/ActiveEventProvider.jsx` | Persists active-event context locally |
| `src/utils/validators.js` | Event and registration form validation |
| `src/utils/importSources.js` | Import Center source definitions |
| `src/utils/ticketUtils.js` | Ticket code, transition, check-in, and search helpers |
| `firestore.rules` | Approved-admin authorization and schema enforcement |

## 18. Local commands

```powershell
npm install
npm run dev
npm run lint
npm test
npm run build
```

## 19. Firebase deployment commands

Deploy only when explicitly approved:

```powershell
npx firebase-tools deploy --only firestore:rules --project gathervibeshub
npx firebase-tools deploy --only firestore:indexes --project gathervibeshub
npm run build
npx firebase-tools deploy --only hosting --project gathervibeshub
```

## 20. Verification completed

### Phase 3 (Cursor review)

- ESLint
- Node unit tests (events, PWA, registrations, CSV import)
- Production Vite build
- No committed secrets (`.env.local`, service account keys excluded by `.gitignore`)
- Phase 4+ routes remained boundary-only at that time
- Firestore rules reviewed for default-deny, allowlist protection, registration schema, and the then-locked check-in fields

### Phase 3.1 Option B (Antigravity)

- ESLint: 0 errors
- 52/52 unit tests passing
- Production Vite build: clean
- No debug bypasses in `AuthProvider.jsx` or `firestore.rules`
- Price tier schema verified in validators, form, service, and rules
- Dashboard enhancements verified: clock, countdowns, selected-event UX, metrics, capacity bar
- Excel/XLSX implemented with `read-excel-file/browser`
- New dependency added: `read-excel-file/browser`
- PR #3 merged to `main`; `main` redeployed to Firebase project `gathervibeshub`

Unit tests now cover:

- Event validation (including price tier schema)
- Price tier names, statuses, bounds, and per-field errors
- Countdown utility (past, future, formatting)
- Upcoming event filtering and sorting
- Adaptive CSV header detection (blank rows, various header names)
- PWA manifest and no-cache service worker safety
- Registration validation and ticket status validation
- Payment status normalization
- CSV parser (quoted commas, newlines, escaped quotes)
- Field mapping, duplicate detection, stable registration ID generation
- Missing email and phone blocked for CSV import
- Import Center source definitions and XLSX row normalization
- Admin search helpers
- Runtime health helpers
- Ticket code generation, validation, uniqueness checks, and privacy safety
- Ticket status transitions
- Check-in false -> true helper and duplicate blocking
- Check-in warning states for pending payment and missing ticket code
- Ticket/check-in audit action coverage
- Firestore rules text coverage for ticket/check-in fields and closed future collections

### Phase 3.2 / Phase 4.5 historical local verification before deployment

- ESLint: 0 errors
- Unit tests: 65/65 passing
- Production Vite build: clean
- Firestore rules dry-run compile: passed for project `gathervibeshub`
- Deployment at that historical checkpoint: not run yet; explicit approval was required before the later live deployment.
- No service account JSON, private key, `.pem`, `.key`, or `.env.local` staged
- Service worker still has no fetch handler and does not cache private admin data

## 21. Organizer live retest checklist

Live Firebase retesting should use:

- An approved email in `settings/accessControl.approvedEmails`
- CODEX_TEST as the safe QA event

Current live/private-admin status is deployed. For organizer retest, verify:

1. Approved admin login succeeds
2. Working Event selection enables registrations, Import Center, Tickets, and Check-In
3. Manual registration CRUD writes both `registrations` and `auditLogs` documents
4. Import Center preview does not write until confirmed
5. Import creates deterministic IDs and blocks duplicates
6. Ticket assignment/generation/unassignment writes audit logs
7. Check-in writes audit logs and blocks duplicate check-in
8. QR camera lookup is active and private-admin-only
9. Communications Pro and AI Draft Lab prompt builder are active without sending or real AI API

## 22. Design decisions

### CSV before Google Sheets OAuth

Direct Google Sheets OAuth was deferred. CSV export from Google Forms or Sheets is the supported import path until OAuth is evaluated separately.

### Privacy-safe import IDs

Import registration IDs hash event-scoped keys with SHA-256 so document IDs do not expose raw emails or phone numbers.

### XLSX import

XLSX upload is active in Import Center. The app uses `read-excel-file/browser` to read workbook values in the browser, presents a sheet selector when multiple worksheets are present, and then reuses the same column mapping, preview, validation, and confirm-import flow as CSV. The vulnerable SheetJS `xlsx` package was removed in Phase 15B. Formulas are not executed.

### Search before QR scanning

Door check-in is implemented with fast search by name, email, phone, ticket code, and private-admin QR camera lookup. QR payload remains `GSV:TICKET:{ticketCode}` only.

### Atomic audit logging

Registration, import, ticket, and check-in writes include an audit log entry in the same batch, matching the Phase 2 event pattern. Duplicate check-in attempts can be recorded as append-only audit logs without reversing check-in state.

## 23. Recommended next phase

Phase 17D-A is closed after organizer blueprint approval. Its closeout preserved the clean-account engineering standard:

- Keep staff/scanner accounts out of `approvedEmails`
- Keep automatic sending and real AI API deferred
- Plan Access & Roles management UI without broadening access by default
- Improve scanner day-of polish, sound/haptic feedback, success/error UI, and event-day helper ergonomics
- Limit any lead-scanner work to planning unless explicit approval is given

Recommended next subphase after 17D-A closeout:

- Phase 17D-B: scanner day-of polish implementation only
- Phase 17D-C: Access & Roles read-only/admin UI foundation only later

Phase boundaries remain:

- Phase 4.5: Ticket Assignment + search-based Door Check-In foundation
- Phase 11: Communications Pro copy-only tools
- Phase 13A: AI Draft Lab prompt builder, draft-only

Google Sheets OAuth, Gmail/Outlook OAuth, automatic sending, real AI API integration, public portals, payment gateways, native app builds, Cloud Functions, and Storage remain deferred.
