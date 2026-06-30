# Gather & Savor Event Hub

For the complete implementation, Firebase, security, testing, and deployment handoff, see [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md).

Private event-operations dashboard for **Gather & Savor Vibes**. This is an admin-only workspace—not a public attendee app. Guests continue using Instagram, Linktree, Google Forms, and Google Sheets.

This private admin app intentionally uses `noindex` and does not publish `sitemap.xml` or JSON-LD structured data. Public SEO should be handled by a separate public marketing landing page later.

## Implementation status

- [x] **Phase 1**: Auth and base app shell
- [x] **Phase 2**: Event management
- [x] **Phase 2.5**: Google sign-in, email/password backup, mobile-first PWA foundation
- [x] **Phase 3**: Registrations and CSV imports
- [x] **Phase 3.1 recovery**: Google auth restored, production security confirmed, adaptive imports, price tier schema, dashboard countdown and selected-event UX (PR #3 merged to `main`)
- [x] **Phase 3.2**: Import Center cleanup with source selector
- [x] **Phase 4.5 foundation**: Ticket assignment and search-based door check-in
- [x] **Phase 5**: Production QA Hardening with private QA Center and read-only fixture verification
- [x] **Phase 11**: Communications Pro copy-only tools
- [x] **Phase 13A**: AI Draft Lab prompt builder (draft-only; no real AI API)
- [x] **Phase 14B**: CPB Payment Audit UI Cleanup / Operations Review Fixes
- [x] **Phase 15A**: Hosting Security Headers + Private Indexing
- [x] **Phase 15B**: XLSX Dependency Security Review + Roadmap/Access/Ops Update — closed, merged, and deployed
- [x] **Phase 16**: Live Browser Loading Diagnostics + Ticket/Check-In QA Hardening — closed, merged, and deployed
- [x] **Phase 17A**: Visibility, Counts, Backlog Reorganization, and Staff Access Planning — closed, merged, and deployed
- [x] **Phase 17B**: Staff / Worker Roles Foundation — closed, merged, and Hosting-deployed; Firestore rules prototype merged for review and not deployed at Phase 17B closeout
- [x] **Phase 17C-A**: Firestore Rules Review + Deployment Readiness — closed, merged, and Hosting-deployed; rules dry-run validated and not deployed at Phase 17C-A closeout
- [ ] **Phase 17C-B**: Firestore Rules Deployment Approval + Live Scanner/Staff Smoke + Scanner-Only PWA Mode — active on branch; Firestore rules deployed after B2 gates, pending organizer scanner smoke confirmation

Phase 3.2 completed the **Import Center** rename and source-specific guidance for Google Forms CSV, Google Sheets CSV, Excel/XLSX workbooks, pasted table rows, bank/payment CSVs, and custom files; it was later deployed. Phase 4.5 completed controlled ticket assignment and search-based door check-in; it was later deployed. Phase 5 adds a private `/qa` center for safe production smoke testing against CODEX_TEST only. Phase 16 focused on live browser loading diagnostics and CODEX_TEST ticket/check-in QA hardening, then closed after merge and deployment. Phase 17C-B is active to prepare explicit rules deployment approval, live scanner/staff smoke, and scanner-only PWA mode. QR camera scanning, Communications Pro, AI Draft Lab, Event Operations, and Phase 15A security headers are live. Real AI API integration, Google Sheets OAuth, Gmail/Outlook OAuth, automatic email/WhatsApp sending, Cloud Functions, Storage, public attendee/baker/school portals, payment gateway integration, public sitemap/JSON-LD for this private admin app, and native app store builds remain deferred.

## Phase 16 closed status

- Live Hosting routes `/`, `/login`, and `/dashboard` should return the private admin app shell through the SPA rewrite.
- Phase 15A headers remain intentionally narrow: frame/object/base/form protections plus noindex and camera permission for same-origin QR scanning. They do not define `script-src`, `style-src`, or `connect-src`.
- The service worker performs install/activate lifecycle only and has no fetch handler or private-data cache.
- The root app has a safe loading error fallback with organizer-friendly refresh/incognito guidance.
- QA Center includes Phase 16 manual checks for live browser loading, approved second-account login, CODEX_TEST ticket search, QR camera lookup, manual ticket-code fallback, check-in, duplicate blocking, append-only audit logs, and CPB protection.
- Phase 16 is closed, merged, and deployed.

## Clean account engineering standard

All future features must support clean/new approved account state, no selected Working Event, stale or empty localStorage, null or missing event config, null or missing currency with `BBD` fallback, null or missing ticket prefix with `GSV` fallback, null or missing `priceTiers` with `[]` fallback, and all protected routes rendering without the AppErrorBoundary fallback.

## Phase 17A closed status

Phase 17A is closed, merged, and deployed. It was a correction and planning phase for backlog visibility, registration/guest count wording, clean-account standards, and future staff access planning. It did not add staff/scanner Firestore access, broaden rules, modify CPB, create CPB registrations, delete audit logs, change QR payloads, or add dependencies.

Backlog/status visibility must appear in this order wherever roadmap content is shown:

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

Registration/guest count standard: registrations are registration records; guests are the sum of `personsAttending` across those records. If no Working Event is selected, protected routes must show a no-selected-event state rather than stale counts.

## Phase 17B closed status

Phase 17B closed the staff-role foundation and UI/access planning. The Firestore rules prototype was merged for review and remained undeployed at Phase 17B closeout. Real staff/scanner access requires Phase 17C with explicit Firestore rules deployment approval and a live staff smoke test.

The planned data model is `staffProfiles/{uid}` plus `events/{eventId}/staffAssignments/{uid}` so Firestore rules can enforce assigned-event access after approval. Roles are owner/admin, event manager, scanner/check-in-only, viewer/read-only, and operations helper. Scanner/check-in-only users should only search and check in for assigned events; they should not have Events CRUD, registration delete, import apply, finance/operations ledger edits, settings/accessControl edits, auditLog delete/update, or broad CPB access unless explicitly assigned.

Approved-admin access through `settings/accessControl.approvedEmails` remains the current live owner/admin enforcement boundary. Staff/scanner accounts must not be added to `approvedEmails`; live staff/scanner access is not active until Phase 17C reviews and deploys Firestore rules with organizer approval.

## Phase 17C-A closed status

Phase 17C-A is closed, merged, and Hosting-deployed. It reviewed, documented, and tested the merged Phase 17B staff-role rules prototype before any live rules deployment. At Phase 17C-A closeout, Firestore rules were reviewed and dry-run validated, but Firestore rules and Firestore indexes were not deployed.

Admin access remains controlled by `settings/accessControl.approvedEmails`, which is admin-level access only. Do not add staff/scanner/helper accounts to `approvedEmails`. Phase 17C-B2 deployed reviewed Firestore rules and created the CODEX_TEST scanner staff documents, but Phase 17C-B remains active until organizer scanner smoke and admin after-smoke confirmation pass.

Before any future AI/Codex phase, read `AI_AGENT_RULES.md`, `PROJECT_HANDOFF.md`, and `README.md`. Future changes must check the full app flow, related docs, tests, rules, and UI copy so stale project knowledge does not conflict with current behavior.

## Phase 17C-B active status

Phase 17C-B is active on the branch for Firestore rules deployment approval, live scanner/staff smoke, and scanner-only PWA mode. The scanner experience should use the private `/scanner` route, stay mobile-first, hide the admin shell for scanner users, look up tickets only within assigned-event access, show safe guest/ticket/check-in fields, and require one explicit Check In tap.

Phase 17C-B2 passed preflight, verified rollback readiness, verified `TEST_SCANNER_EMAIL` (`ojah13635@gmail.com`) as Firebase Auth UID `5WN4oTTesCYO14tX6HlUE6W5LM72`, confirmed it is outside `approvedEmails`, created/verified `staffProfiles/{uid}` and `events/xPfa0b3KZyLSDnAD2uGI/staffAssignments/{uid}`, and deployed Firestore rules only. Firestore indexes were not deployed. Staff/scanner/helper accounts must not be added to `approvedEmails`; approvedEmails remains admin-level access only.

Phase 17C-B3 fixed the scanner login auth gate after the scanner signed in but was blocked by the approvedEmails-only message. approvedEmails is admin-level access only. Staff/scanner users must remain outside approvedEmails and must be admitted through active staffProfiles/{uid} plus active events/{eventId}/staffAssignments/{uid}. AuthProvider/ProtectedRoute must check both paths: approved admin first, then staff profile/assignment access before showing a not-approved message. Do not solve scanner login by adding the scanner to approvedEmails.

Phase 17C-B testing must use CODEX_TEST only. CPB must not be selected, assigned, read as scanner, or used for QA. Scanner/check-in-only access remains check-in only and must not receive Undo Check-In or Check Out. Approved admins may use the existing admin-only undo/check-out path where already implemented. Native app work remains deferred; the current practical direction is a private PWA-style scanner shortcut/mode. Admin AppShell brand navigation returns approved admins to `/dashboard`; the isolated `/scanner` page does not gain admin-home logo navigation. Settings now uses category tabs with deep links such as `/settings?tab=access`.

## Phase 15B status

- `xlsx` was removed after audit because runtime XLSX import now uses the already-installed `read-excel-file/browser` parser.
- XLSX import remains active with sheet selection, row normalization, preview, mapping, and confirm-before-write safety.
- `npm audit --omit=dev` is expected to report no production vulnerabilities after `xlsx` removal.
- Staff/scanner roles must not be added to `approvedEmails`. Phase 17B uses staff profile and assigned-event rule design for future scoped access; rules deployment requires separate approval.
- Event Operations Ledger is active and separate from ticket sales. Future operations modules such as tasks, supplies, vendors/suppliers, sponsors, school tracking, baker/vendor tracking, budget/expense reporting, reimbursements, and event-day run sheets are planned but not active.
- Phase 15B is closed, merged, and deployed.

## Production and QA status

- PR #3 (`cursor/review-phase3-1-google-auth` -> `main`) is merged.
- Latest Phase 17C-B2 rules deploy targeted project `gathervibeshub` with Firestore rules only; Firestore indexes were not deployed. Phase 17C-B remains active pending organizer scanner smoke confirmation and admin after-smoke confirmation.
- `CODEX_TEST Live Verification Event` is intentionally kept as the permanent QA / smoke-test event.
- CODEX_TEST event ID: `xPfa0b3KZyLSDnAD2uGI`.
- CPB is real production data and must not be used for QA. CPB event ID: `zhaPxi31cpqLAW0cuS20`.
- The CODEX_TEST event may be used for safe app testing, but not for real guests.
- Do not delete the CODEX_TEST event unless the organizer explicitly says so.
- Do not create a new daily test event; reuse CODEX_TEST for smoke testing.
- Do not delete `auditLogs` globally. Test data should be clearly prefixed with `CODEX_TEST` or `CODEX_DAILY`.
- Daily QA runs in GitHub Actions via `.github/workflows/daily-qa.yml`.
- Daily QA is read-only by default: `npm ci`, lint, tests, build, built auth UI smoke, and live HTTP smoke checks.
- Any future write smoke test must be opt-in only with `QA_WRITE_SMOKE=true`.
- Write smoke tests, if enabled later, must use only CODEX_TEST, create/delete only their own `CODEX_DAILY` registration, and must leave audit logs append-only.
- `/qa` is the private QA Center. It shows CODEX_TEST status, CPB warnings, current Working Event status, audit log status, System Health, a manual QA checklist, and a copyable CODEX_TEST sample CSV.
- The QA Center helper does not write to Firestore. Production QA writes remain manual through the app and must use CODEX_TEST only.
- Read-only fixture verification: `npm run admin:verify-production-fixtures`.

## Phase 3 feature summary

- Registrations CRUD scoped to the active event
- CSV file upload and pasted CSV import
- Field mapping with auto-detection of common headers
- Import preview before any Firestore write
- Row validation with valid, warning, and blocked states
- Duplicate detection by email+timestamp, phone+timestamp, and source row ID
- Privacy-safe deterministic registration IDs for imports (`imp_` + SHA-256 prefix)
- Append-only registration audit logs in the same batch as mutations
- Search and payment-status filters
- Responsive mobile cards and desktop table

## Phase 3.1 Option B additions

- Production security verified: allowlist enforced, no debug bypasses
- Price tier schema: optional `priceTiers` array (Early Bird, General, Door, Tier 1–3, Complimentary)
- Backward-compatible with `ticketPrice` scalar (existing events unaffected)
- Firestore rules updated to strictly validate optional `priceTiers` list entries (max 7 tiers)
- Dashboard enhanced: live local date/time, upcoming events list, countdowns per event
- Dashboard: "Active Event" renamed to **Working Event / Selected Event** throughout
- Dashboard: explanation text clarifying selected event is workspace-only
- Dashboard: clear and change selected event controls
- Dashboard: registration metrics (total, paid, pending, complimentary) for selected event
- Dashboard: capacity progress bar
- Dashboard: price tier summary chips for selected event
- Excel/XLSX: implemented with `read-excel-file/browser`, sheet selection, and preview-before-write safety
- Google Sheets OAuth: remains deferred

## Phase 3.2 Import Center

- `/imports` is renamed **Import Center** in navigation, dashboard links, and page headings.
- Source selector supports Google Forms CSV, Google Sheets CSV, Excel/XLSX, pasted table text, bank/payment CSV, and custom files.
- Google Forms and Google Sheets remain CSV-export workflows; no Google Sheets OAuth is added.
- Pasted table/CSV text continues through the same map → preview → confirm import flow.
- CSV upload still requires headers and still previews before Firestore writes.
- Bank/payment CSV and custom file sources use the same safe mapping workflow.
- XLSX upload is active. Workbooks are read with `read-excel-file/browser`, multiple sheets show a selector, formulas are not executed, and rows still go through map -> preview -> confirm before Firestore writes.

## Phase 4.5 Ticketing and Door Check-In

- `/tickets` is live for approved admins with a selected Working Event.
- Tickets page lists selected-event registrations with name, contact, payment status, ticket status, and ticket code.
- Admins can manually assign a `GSV-XXXXXX` code, generate a readable privacy-safe code, regenerate with confirmation, and clear/unassign with confirmation.
- Ticket code uniqueness is enforced in the selected-event UI/service before writes.
- Ticket writes create append-only registration audit logs: `ticket.assign`, `ticket.unassign`, `ticket.regenerate`.
- `/check-in` is live for approved admins with a selected Working Event.
- Check-In supports fast search by name, email, phone, or ticket code, large mobile-first guest cards, payment/ticket/check-in status, and reset for the next guest.
- Check-in moves `checkedIn` from `false` to `true`, sets `checkInTime`, and writes `checkedInBy`.
- Duplicate check-in is blocked; an explicit duplicate-attempt audit can be recorded.
- Undo check-in is available for approved admins where implemented in the UI, requires confirmation, and writes `checkin.undo` in the same batch as the `checkedIn: false` update.
- QR camera lookup is active as a private-admin input method; search by ticket code remains the fallback.


## Stack

- React 19 + Vite
- JavaScript
- Tailwind CSS 4
- Firebase Authentication (Google primary, email/password backup) and Cloud Firestore
- Firebase Hosting

## Local setup

Requirements: Node.js 20.19+ or 22.12+ and a Firebase project you control.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Open the existing [`gathervibeshub` Firebase project](https://console.firebase.google.com/project/gathervibeshub/overview) (project number `9444350727`).

3. The Firebase Web App is already registered. **Authentication → Sign-in method → Google** and **Email/Password** are enabled.

4. Create trusted staff accounts under **Authentication → Users**. There is deliberately no public sign-up flow.

5. The default Cloud Firestore database already exists; deploy the included rules after any reviewed changes.

6. Copy `.env.example` to `.env.local` and add the Web App configuration values:

   ```powershell
   Copy-Item .env.example .env.local
   ```

7. In the Firestore console, create the document `settings/accessControl` with this field:

   ```text
   approvedEmails: ["owner@example.com", "trusted.staff@example.com"]
   ```

   Use an array of lowercase email strings that exactly match the Firebase Authentication accounts. The security rules prevent client applications from modifying this allowlist.

8. Start the app:

   ```bash
   npm run dev
   ```

The app shows an explicit configuration notice and disables sign-in if Firebase environment variables are missing. It does not use fallback credentials or a fake authentication mode.

## Automatic Firebase admin setup

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

6. Verify production QA fixtures without writes:
   `npm run admin:verify-production-fixtures`

7. Deploy rules/indexes:
   `npm run firebase:deploy-rules`

8. Deploy hosting:
   `npm run firebase:deploy-hosting`

If Firebase Admin SDK credentials are missing, use a service account JSON stored OUTSIDE the repository and referenced only with `GOOGLE_APPLICATION_CREDENTIALS`. For example:
- **PowerShell:** `$env:GOOGLE_APPLICATION_CREDENTIALS="C:\secure-keys\gathervibeshub-admin.json"`
- **macOS/Linux:** `export GOOGLE_APPLICATION_CREDENTIALS="/secure-keys/gathervibeshub-admin.json"`

Never paste private keys into code and never commit a service account JSON.

## Troubleshooting Google sign-in

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

## Routes

| Route | Status | Purpose |
|---|---|---|
| `/login` | Complete | Google sign-in with email/password backup |
| `/dashboard` | Complete | Workspace and active-event summary |
| `/events` | Complete | Firestore event CRUD and active-event selection |
| `/registrations` | Phase 3 | Registration CRUD for the active event |
| `/imports` | Live/private-admin | Import Center source selector, CSV/XLSX upload, pasted table rows, mapping, preview, and import |
| `/tickets` | Live/private-admin | Ticket-code assignment, generation, regeneration, and unassignment |
| `/check-in` | Live/private-admin | Search-based door check-in and duplicate prevention |
| `/qa` | Live/private-admin | Private QA Center for CODEX_TEST fixture status, sample CSV, checklist, and read-only health guidance |
| `/communications` | Live/private-admin | Communications Pro copy-only message preparation and CSV/contact packets; no automatic sending |
| `/operations` | Live/private-admin | Event Operations Ledger for private-admin operational entries separate from ticket sales |
| `/ai-writing` | Redirected/deferred | AI Draft Lab prompt-builder tools live inside Communications; no real AI API |
| `/settings` | Complete | Firebase and data-model status |

## Security rules

`firestore.rules` denies public access and permits only authenticated users whose email appears in `settings/accessControl.approvedEmails`. The allowlist document cannot be written by client code. Audit log documents are append-only from the client. Registrations are strictly schema-validated, including ticket/check-in metadata. Ticket assignment and check-in transitions are limited to approved admins; communications, AI drafts, public attendee flows, and unknown collections remain closed.

Deploy rules after reviewing the project ID and allowlist document:

```bash
npx firebase-tools login
npx firebase-tools use gathervibeshub
npx firebase-tools deploy --only firestore:rules --project gathervibeshub
```

Do not deploy the database with temporary public rules. Firebase web configuration values are identifiers, not secrets; authorization is enforced by Authentication and Firestore Security Rules.

## Build and deploy

```bash
npm run lint
npm test
npm run build
npx firebase-tools deploy --only hosting
```

`firebase.json` sends all Hosting routes to `index.html`, allowing React Router URLs to work on refresh.

The current production build is deployed at [gathervibeshub.web.app](https://gathervibeshub.web.app) from `main`.

## Mobile/PWA foundation

Phase 2.5 adds an installable mobile-web foundation named **Gather & Savor Hub** (`G&S Hub`). It includes a manifest, branded app icons, Apple touch icon metadata, standalone display mode, iPhone safe-area spacing, mobile navigation, and larger touch targets. The service worker performs lifecycle setup only: it has no fetch handler and does not cache Firestore or other private admin data.

This remains a private web application. It is not a public attendee app and is not a native App Store or Play Store application.

## Project structure

```text
src/
  auth/              Firebase session context and route guard
  components/
    events/          Event form and confirmation dialogs
    imports/         CSV field mapping, preview, and summary
    registrations/   Registration form, cards, and delete dialog
    ui/              Shared loading, error, and empty states
  events/            Active-event context with local persistence
  layout/            Responsive protected admin shell
  lib/               Firebase initialization
  pages/             Login, dashboard, events, registrations, imports, tickets, check-in, settings
  services/          Firestore event, registration, import, ticket/check-in, and audit operations
  utils/             Event, registration, import, ticket, and date utilities
tests/
  event-utils.test.js
  phase25-foundation.test.js
  registration-utils.test.js
  csv-parser.test.js
```

## Phase 1 acceptance checklist

- [x] React + Vite project
- [x] Tailwind theme and responsive luxury admin layout
- [x] All planned top-level routes registered
- [x] Firebase initialization via environment variables
- [x] Google login with mobile redirect support and clear loading/error states
- [x] Email/password login retained as backup
- [x] Protected routes with return-to-requested-page behavior
- [x] No public Firestore access in the rules draft
- [x] Approved-admin email allowlist
- [x] Firebase Hosting SPA configuration
- [x] No Cloud Functions, Storage usage, or later-phase fake behavior

## Phase 2 acceptance checklist

- [x] Create and edit events with validated fields
- [x] Delete events only after explicit confirmation
- [x] Real-time Firestore event list
- [x] Active-event selection persisted in local storage
- [x] Loading, error, empty, and success states
- [x] Atomic audit entries for event create, update, and delete
- [x] Responsive table and mobile event cards
- [x] No registrations, tickets, imports, or AI behavior added

Event mutations and their audit records use a single Firestore batch. A failed audit write therefore prevents the associated event mutation from committing.

## Phase 2.5 acceptance checklist

- [x] Google provider integration with full-page redirect handling
- [x] Firestore allowlist verification before protected routes receive a user
- [x] Email/password backup preserved
- [x] PWA manifest and branded 192/512 PNG icons
- [x] Apple touch icon and standalone mobile metadata
- [x] Safe-area support and mobile bottom navigation
- [x] No offline Firestore writes, push notifications, or private-data caching

## Phase 3 acceptance checklist

- [x] Registrations CRUD scoped to the active event
- [x] CSV upload and pasted CSV import
- [x] Field mapping with preview before Firestore writes
- [x] Duplicate detection (email+timestamp, phone+timestamp, sourceRowId)
- [x] Privacy-safe deterministic import registration IDs
- [x] Append-only registration audit logs in the same batch as mutations
- [x] Search and payment-status filters
- [x] Loading, error, empty, saving, and success states
- [x] Responsive mobile cards and desktop table
- [x] Firestore rules for registrations with check-in fields locked
- [x] Tickets, check-in, communications, and AI remained phase-boundary only during Phase 3
- [x] Google Sheets OAuth remains deferred
- [x] No Cloud Functions, Storage, public registration, or attendee accounts

## Phase 3.1 Option B acceptance checklist

- [x] Production security verified — allowlist enforced, no debug bypasses
- [x] Price tier schema in validators, EventFormModal, eventService, Firestore rules
- [x] Named tiers: Early Bird, General, Door, Tier 1, Tier 2, Tier 3, Complimentary
- [x] Backward-compatible with ticketPrice scalar
- [x] Tier price ≥ 0, tier name required, tier status validated
- [x] Max 7 tiers and tier fields enforced client-side and in Firestore rules
- [x] Dashboard: live local date/time clock
- [x] Dashboard: upcoming events list from Firestore with countdown badges
- [x] Dashboard: Working Event / Selected Event rename and explanation
- [x] Dashboard: clear selected event button
- [x] Dashboard: change selected event from upcoming list
- [x] Dashboard: registration metrics for selected event
- [x] Dashboard: capacity progress bar
- [x] Dashboard: price tier summary chips
- [x] Excel/XLSX: implemented with sheet selection and preview-first import
- [x] 52/52 tests passing
- [x] Lint: 0 errors
- [x] Build: clean

## Phase 3.2 / Phase 4.5 acceptance checklist

- [x] Import page renamed Import Center
- [x] Import source selector exists with helper text for all requested source types
- [x] CSV upload and pasted import still use mapping, preview, and confirmation
- [x] XLSX upload implemented with maintained parser dependency
- [x] Google Sheets OAuth remains deferred
- [x] `/tickets` route is live
- [x] Ticket assignment, generation, regeneration, and unassignment implemented
- [x] Ticket code search implemented
- [x] `/check-in` route is live
- [x] Check-in false → true implemented
- [x] Duplicate check-in blocked
- [x] Ticket/check-in mutations write registration audit logs
- [x] Firestore rules updated for ticket/check-in metadata and audit actions
- [x] Service worker safety unchanged
- [x] Tests: 65/65 passing
- [x] Lint: 0 errors
- [x] Build: clean
- [x] Firestore rules dry-run compile passed for `gathervibeshub`
- [x] Historical deployment approval completed; `/imports`, `/tickets`, and `/check-in` are now live private-admin routes

Registration and import mutations share one Firestore batch with their audit records. Import chunking respects the 500-write limit (249 rows per chunk: registration + audit log per row).

## Verification

```bash
npm run lint
npm test
npm run build
```

Tests cover event validation, PWA/service worker safety, registration validation, payment status normalization, ticket status validation, ticket code generation and validation, ticket transitions, check-in duplicate blocking, check-in warnings, Import Center source definitions, CSV parsing (quoted commas, newlines, escaped quotes), XLSX row normalization, field mapping, duplicate detection helpers, stable registration ID generation, runtime health helpers, admin search helpers, and missing email/phone blocking for import.
