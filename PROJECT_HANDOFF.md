# Gather & Savor Event Hub — Complete Implementation Handoff

Last updated: June 21, 2026 (Phase 3.1 Option B — branch antigravity/continue-phase3-1-option-b)

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
- Phase 3.1 Option B: production security verified, price tier schema, enhanced dashboard with live countdowns, registration metrics, selected-event UX (branch `antigravity/continue-phase3-1-option-b`).

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

- Google provider popup flow on desktop
- Google full-page redirect flow on mobile
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

### Phase 3.1 Option B — Complete (branch `antigravity/continue-phase3-1-option-b`)

- Production security verified: `AuthProvider.jsx` enforces Firestore allowlist check; no debug bypasses present
- Price tier schema added to `validators.js`, `EventFormModal.jsx`, `eventService.js`, and `firestore.rules`
- Named tiers supported: Early Bird, General, Door, Tier 1, Tier 2, Tier 3, Complimentary
- Tier fields: `name` (required string), `price` (number ≥ 0), `status` (active | sold-out | hidden)
- Backward-compatible: existing events with only `ticketPrice` scalar continue to work
- Firestore rules updated: `priceTiers` optional list (max 7) added to `isValidEvent`
- Dashboard rewritten: live local date/time clock, upcoming events from Firestore
- Dashboard: countdown badge on each upcoming event (updates every 30s)
- Dashboard: "Active Event" renamed to **Working Event / Selected Event** throughout
- Dashboard: explanation text — selected event is workspace-only, does not change event status
- Dashboard: clear selected event button (X on card header)
- Dashboard: select a different event directly from the upcoming events list
- Dashboard: registration metrics for selected event (total, paid, pending, complimentary)
- Dashboard: capacity progress bar with color thresholds (green → amber → red)
- Dashboard: price tier summary chips with sold-out and hidden visual states
- Excel/XLSX: deferred — no `xlsx` dependency added
- Google Sheets OAuth: remains deferred
- 51/51 tests pass; 0 lint errors; build clean

## 4. Features intentionally not implemented

The following remain phase-gated or deferred:

- Ticket assignment and ticket-code generation (Phase 4)
- Door check-in and QR scanning (Phase 5)
- Communications and bulk email sending (Phase 6)
- AI writing drafts (Phase 7)
- Google Sheets OAuth (deferred; use CSV export first)
- Payment processing
- Public registration forms
- Attendee accounts
- Firebase Cloud Functions
- Firebase Storage
- Native Android/iOS apps, Capacitor, React Native, or Flutter
- Push notifications and Firebase Cloud Messaging
- Offline Firestore writes
- Service worker caching of private admin data

The `/tickets`, `/check-in`, `/communications`, and `/ai-writing` routes show clear future-phase messages and do not save or load backend data.

## 5. Application routes

| Route | Status | Purpose |
|---|---|---|
| `/login` | Complete | Google sign-in with email/password backup |
| `/dashboard` | Complete | Secure workspace and selected-event context |
| `/events` | Complete | Firestore event CRUD and active-event selection |
| `/registrations` | Phase 3 complete | Registration CRUD for the active event |
| `/imports` | Phase 3 complete | CSV upload/paste, mapping, preview, and import |
| `/tickets` | Phase 4 boundary | Future ticket-code management |
| `/check-in` | Phase 5 boundary | Future event-day check-in |
| `/communications` | Phase 6 boundary | Future guest filtering and message drafts |
| `/ai-writing` | Phase 7 boundary | Future editable AI writing drafts |
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
- Registration update keeps `checkedIn`, `checkInTime`, `registrationId`, `eventId`, `source`, `sourceRowId`, `timestamp`, and `createdAt` immutable
- Append-only `auditLogs` for matching event and registration mutations
- `tickets`, `checkIn`, `communications`, and `aiDrafts` collections denied
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
                               Max 7 tiers. Named: Early Bird, General, Door, Tier 1-3, Complimentary.
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
notes              string       Internal notes, max 10000 characters
checkedIn          boolean      Must be false in Phase 3; cannot change yet
checkInTime        Timestamp|null  Must be null in Phase 3; cannot change yet
source             string       manual | csv-import
sourceRowId        string|null  Import row identifier (e.g. row-1)
timestamp          Timestamp|null  Original form submission time when known
createdAt          Timestamp    Immutable after create
updatedAt          Timestamp    Required on every update
```

Manual creates use Firestore-generated document IDs. CSV imports use deterministic privacy-safe IDs (`imp_<16-char hash>`).

## 12. Import workflow

```text
Google Form → Google Sheet → Export CSV → Admin uploads or pastes CSV
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

## 13. Audit log data model

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
Registration actions: `registration.create`, `registration.update`, `registration.delete`, `registration.import`

Registration audit examples include `fullName` and, for imports, `sourceRowId`. Event audits include `eventName`.

All mutations commit the target document and audit log in one Firestore batch. Clients cannot update or delete audit logs.

## 14. Active-event behavior

Local storage key: `gather-savor-active-event`

Registrations and imports require an active event selected from Events or the dashboard. Without an active event, those pages show an empty state directing the organizer to choose an event.

## 15. Folder structure

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
    services/
      eventService.js
      registrationService.js
      importService.js
      auditService.js
    utils/
  tests/
    event-utils.test.js
    phase25-foundation.test.js
    registration-utils.test.js
    csv-parser.test.js
```

## 16. Important source files

| File | Responsibility |
|---|---|
| `src/lib/firebase.js` | Initializes Firebase Auth and Firestore |
| `src/auth/AuthProvider.jsx` | Tracks Firebase Authentication session |
| `src/auth/ProtectedRoute.jsx` | Blocks private routes for signed-out users |
| `src/App.jsx` | Registers implemented and future-phase routes |
| `src/layout/AppShell.jsx` | Responsive admin layout and navigation |
| `src/pages/RegistrationsPage.jsx` | Registration list, filters, CRUD coordination |
| `src/pages/ImportsPage.jsx` | CSV import wizard |
| `src/services/registrationService.js` | Firestore registration subscription and batch mutations |
| `src/services/importService.js` | CSV parsing, mapping, validation, duplicate detection, chunked import |
| `src/services/auditService.js` | Creates append-only audit records |
| `src/services/eventService.js` | Firestore event subscription and batch mutations |
| `src/events/ActiveEventProvider.jsx` | Persists active-event context locally |
| `src/utils/validators.js` | Event and registration form validation |
| `firestore.rules` | Approved-admin authorization and schema enforcement |

## 17. Local commands

```powershell
npm install
npm run dev
npm run lint
npm test
npm run build
```

## 18. Firebase deployment commands

Deploy only when explicitly approved:

```powershell
npx firebase-tools deploy --only firestore:rules --project gathervibeshub
npx firebase-tools deploy --only firestore:indexes --project gathervibeshub
npm run build
npx firebase-tools deploy --only hosting --project gathervibeshub
```

## 19. Verification completed

### Phase 3 (Cursor review)

- ESLint
- Node unit tests (events, PWA, registrations, CSV import)
- Production Vite build
- No committed secrets (`.env.local`, service account keys excluded by `.gitignore`)
- Phase 4+ routes remain boundary-only
- Firestore rules reviewed for default-deny, allowlist protection, registration schema, and check-in lock

### Phase 3.1 Option B (Antigravity)

- ESLint: 0 errors
- 51/51 unit tests passing (24 Phase 3 + 27 new Phase 3.1)
- Production Vite build: clean
- No debug bypasses in `AuthProvider.jsx` or `firestore.rules`
- Price tier schema verified in validators, form, service, and rules
- Dashboard enhancements verified: clock, countdowns, selected-event UX, metrics, capacity bar
- Excel/XLSX confirmed deferred (not added)
- No new dependencies added
- No merge to main; no deployment; branch: `antigravity/continue-phase3-1-option-b`

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

## 20. Remaining live testing limitations

Live Firebase testing still requires:

- An approved email in `settings/accessControl.approvedEmails`
- Deployment of Phase 3 Firestore rules and the registrations composite index when approved

After deployment, verify:

1. Approved admin login succeeds
2. Active event selection enables registrations and imports
3. Manual registration CRUD writes both `registrations` and `auditLogs` documents
4. CSV import preview does not write until confirmed
5. Import creates deterministic IDs and blocks duplicates
6. Check-in fields cannot be mutated from the client
7. Phase 4+ routes remain non-functional placeholders

## 21. Design decisions

### CSV before Google Sheets OAuth

Direct Google Sheets OAuth was deferred. CSV export from Google Forms or Sheets is the supported import path until OAuth is evaluated separately.

### Privacy-safe import IDs

Import registration IDs hash event-scoped keys with SHA-256 so document IDs do not expose raw emails or phone numbers.

### Check-in deferred to Phase 5

Registration records include `checkedIn` and `checkInTime` fields for future door check-in, but Phase 3 rules and UI do not allow check-in mutations.

### Atomic audit logging

Registration and import writes always include an audit log entry in the same batch, matching the Phase 2 event pattern.

## 22. Recommended next phase

**Phase 4 — Ticket Assignment only**, after Phase 3 is verified live with the real Firebase project:

- Assign externally created ticket codes to registrations
- Track ticket status transitions
- Do not add door check-in, communications, or AI until their respective phases

Do not merge to `main` or deploy Hosting/rules until the organizer approves this review branch.
