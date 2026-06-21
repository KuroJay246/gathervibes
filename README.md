# Gather & Savor Event Hub

For the complete implementation, Firebase, security, testing, and deployment handoff, see [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md).

Private event-operations dashboard for **Gather & Savor Vibes**. This is an admin-only workspace—not a public attendee app. Guests continue using Instagram, Linktree, Google Forms, and Google Sheets.

## Implementation status

- [x] **Phase 1**: Auth and base app shell
- [x] **Phase 2**: Event management
- [x] **Phase 2.5**: Google sign-in, email/password backup, mobile-first PWA foundation
- [x] **Phase 3**: Registrations and CSV imports (Cursor-reviewed on branch `cursor/review-phase3-local`)
- [x] **Phase 3.1 Option B**: Production security confirmed, adaptive imports, price tier schema, dashboard countdown and selected-event UX (branch `antigravity/continue-phase3-1-option-b`)
- [ ] **Phase 4**: Ticket assignment
- [ ] **Phase 5**: Door check-in
- [ ] **Phase 6**: Communications
- [ ] **Phase 7**: AI writing assistant

Phase 3.1 adds price tiers, an enhanced dashboard with live countdowns and registration metrics, and renames "Active Event" to "Working Event / Selected Event". Tickets, door check-in, communications, AI writing, Google Sheets OAuth, Cloud Functions, Storage, and public attendee flows remain unimplemented.

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
- Firestore rules updated to allow optional `priceTiers` list (max 7 tiers)
- Dashboard enhanced: live local date/time, upcoming events list, countdowns per event
- Dashboard: "Active Event" renamed to **Working Event / Selected Event** throughout
- Dashboard: explanation text clarifying selected event is workspace-only
- Dashboard: clear and change selected event controls
- Dashboard: registration metrics (total, paid, pending, complimentary) for selected event
- Dashboard: capacity progress bar
- Dashboard: price tier summary chips for selected event
- Excel/XLSX: deferred (no `xlsx` dependency added)
- Google Sheets OAuth: remains deferred


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

6. Deploy rules/indexes:
   `npm run firebase:deploy-rules`

7. Deploy hosting:
   `npm run firebase:deploy-hosting`

If Application Default Credentials are missing, you can run `gcloud auth application-default login` if available, or use a service account JSON stored OUTSIDE the repository and referenced only with `GOOGLE_APPLICATION_CREDENTIALS`. For example:
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
| `/imports` | Phase 3 | CSV upload/paste, mapping, preview, and import |
| `/tickets` | Phase 4 boundary | Future ticket-code management |
| `/check-in` | Phase 5 boundary | Future event-day check-in |
| `/communications` | Phase 6 boundary | Future guest filtering and message drafts |
| `/ai-writing` | Phase 7 boundary | Future editable AI writing drafts |
| `/settings` | Complete | Firebase and data-model status |

## Security rules

`firestore.rules` denies public access and permits only authenticated users whose email appears in `settings/accessControl.approvedEmails`. The allowlist document cannot be written by client code. Audit log documents are append-only from the client. Registrations are strictly schema-validated; `checkedIn` and `checkInTime` are locked for Phase 3.

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

The current production build is deployed at [gathervibeshub.web.app](https://gathervibeshub.web.app). Phase 3 code is reviewed locally but not merged or deployed until explicitly approved.

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
  pages/             Login, dashboard, events, registrations, imports, settings
  services/          Firestore event, registration, import, and audit operations
  utils/             Event and registration validation, date formatting
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

- [x] Google provider integration with popup cancellation/blocked handling
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
- [x] Tickets, check-in, communications, and AI remain phase-boundary only
- [x] Google Sheets OAuth remains deferred
- [x] No Cloud Functions, Storage, public registration, or attendee accounts

## Phase 3.1 Option B acceptance checklist

- [x] Production security verified — allowlist enforced, no debug bypasses
- [x] Price tier schema in validators, EventFormModal, eventService, Firestore rules
- [x] Named tiers: Early Bird, General, Door, Tier 1, Tier 2, Tier 3, Complimentary
- [x] Backward-compatible with ticketPrice scalar
- [x] Tier price ≥ 0, tier name required, tier status validated
- [x] Max 7 tiers enforced client-side and in Firestore rules
- [x] Dashboard: live local date/time clock
- [x] Dashboard: upcoming events list from Firestore with countdown badges
- [x] Dashboard: Working Event / Selected Event rename and explanation
- [x] Dashboard: clear selected event button
- [x] Dashboard: change selected event from upcoming list
- [x] Dashboard: registration metrics for selected event
- [x] Dashboard: capacity progress bar
- [x] Dashboard: price tier summary chips
- [x] Excel/XLSX: deferred (no dependency added)
- [x] 51/51 tests passing
- [x] Lint: 0 errors
- [x] Build: clean

Registration and import mutations share one Firestore batch with their audit records. Import chunking respects the 500-write limit (249 rows per chunk: registration + audit log per row).

## Verification

```bash
npm run lint
npm test
npm run build
```

Tests cover event validation, PWA/service worker safety, registration validation, payment status normalization, ticket status validation, CSV parsing (quoted commas, newlines, escaped quotes), field mapping, duplicate detection helpers, stable registration ID generation, and missing email/phone blocking for CSV import.
