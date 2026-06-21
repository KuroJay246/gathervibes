# Gather & Savor Event Hub — Complete Implementation Handoff

Last updated: June 21, 2026

## 1. Project overview

**Project:** Gather & Savor Event Hub  
**Brand:** Gather & Savor Vibes  
**Initial event:** Cake Picnic Barbados  
**Purpose:** A private event-operations dashboard for the organizer and trusted staff.

This is not a public attendee application. Guests continue using Instagram, Linktree, Google Forms, and Google Sheets. The dashboard is for internal event administration only.

The repository currently contains:

- Phase 1: application foundation, authentication, protected routing, theme, responsive admin layout, Firebase initialization, Hosting configuration, and Firestore rules.
- Phase 2: complete Events CRUD, active-event selection, event validation, operational states, and append-only audit logging.
- Phase 2.5: Google sign-in with email/password backup plus a mobile-first installable PWA foundation.

The project intentionally stops after Phase 2.5.

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
- Hardened, deployed Firestore Security Rules
- Approved-admin email allowlist
- Append-only audit log rules
- Branded SVG favicon
- Settings/status page
- Routed phase-boundary pages for features not yet implemented

### Phase 2 — Complete

- Events page connected to Cloud Firestore
- Real-time event list using a Firestore snapshot subscription
- Create event
- Edit event
- Delete event with explicit confirmation
- Event form validation
- Loading state
- Firestore error state with retry
- Empty state
- Success notifications
- Responsive desktop event table
- Responsive mobile event cards
- Event summary counts:
  - Total events
  - Upcoming or active events
  - Combined planned capacity
- Active-event selection
- Active-event persistence in browser local storage
- Active event displayed in the sidebar
- Active event displayed on the dashboard
- Automatic clearing of a locally selected event if it no longer exists in Firestore
- Atomic event and audit-log writes using Firestore batches
- Audit entries for:
  - Event creation
  - Event updates
  - Event deletion

### Phase 2.5 — Complete

- Google provider popup flow on desktop
- Google full-page redirect flow on mobile
- Friendly popup-cancelled, popup-blocked, unauthorized-domain, and unapproved-account errors
- Firestore allowlist verification before a Firebase user is exposed to protected routes
- Email/password backup preserved through the same allowlist verification
- Installable manifest: `Gather & Savor Hub` / `G&S Hub`
- Branded 180, 192, and 512 pixel app icons
- Apple touch icon and standalone display metadata
- iPhone safe-area spacing
- Mobile bottom navigation and larger touch targets
- Mobile-first login and event-card refinements
- Lifecycle-only service worker with no fetch interception or private-data caching

## 4. Features intentionally not implemented

The following features remain phase-gated and do not contain fake backend behavior:

- Registrations CRUD
- Google Forms or CSV imports
- Google Sheets OAuth
- Ticket assignment
- Ticket-code tracking
- Event-day check-in
- Communication filters
- Bulk email sending
- AI writing drafts
- Payment processing
- Public registration forms
- Attendee accounts
- QR scanning
- Automatic Instagram posting
- Firebase Cloud Functions
- Firebase Storage

The corresponding navigation routes show a clear future-phase message instead of pretending to load or save data.

## 5. Application routes

| Route | Status | Purpose |
|---|---|---|
| `/login` | Complete | Google sign-in with email/password backup |
| `/dashboard` | Complete | Secure workspace and selected-event context |
| `/events` | Complete | Firestore event CRUD and active-event selection |
| `/registrations` | Phase 3 boundary | Future registration management |
| `/imports` | Phase 3 boundary | Future CSV/Google Sheets import workflow |
| `/tickets` | Phase 4 boundary | Future ticket-code management |
| `/check-in` | Phase 5 boundary | Future event-day check-in |
| `/communications` | Phase 6 boundary | Future guest filtering and message drafts |
| `/ai-writing` | Phase 7 boundary | Future editable AI writing drafts |
| `/settings` | Complete | Firebase and data-model status |

Every route other than `/login` is protected by Firebase Authentication.

## 6. Firebase configuration

Firebase credentials are not committed to the repository.

The application reads these environment variables:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=gathervibeshub.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gathervibeshub
VITE_FIREBASE_STORAGE_BUCKET=gathervibeshub.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

The template is stored in `.env.example`.

Create the local configuration file with:

```powershell
Copy-Item .env.example .env.local
```

Then replace the example values with the Firebase Web App configuration.

### Safe information to provide for setup

The Firebase Web App configuration values above can be provided when connecting the project. Do not provide or commit:

- Firebase account passwords
- User passwords
- Service-account private keys
- Admin SDK JSON private keys
- Recovery codes
- Google OAuth client secrets not intended for browser use

Firebase browser configuration identifies the project. Authentication and Firestore Security Rules enforce authorization.

## 7. Firebase project and remaining Console setup

Confirmed and configured on June 21, 2026:

- Firebase project ID: `gathervibeshub`
- Firebase project number: `9444350727`
- Web app ID: `1:9444350727:web:27345e830f0769a91183a2`
- Default Firestore database: Standard edition, Native mode, `nam5`
- Google Authentication provider: enabled
- Email/password Authentication provider: enabled
- Firestore rules: compiled and deployed
- Firebase Hosting: deployed at `https://gathervibeshub.web.app`

Remaining before authenticated event CRUD can be tested:

1. Confirm which existing Firebase user is the organizer/trusted administrator.
2. Create the admin allowlist document described below.

There is deliberately no public account-registration page.

## 8. Approved-admin allowlist

The rules use a Firestore-managed email allowlist instead of hardcoding personal emails in the source file.

Create this document manually in the Firebase Console:

```text
Collection: settings
Document: accessControl
Field: approvedEmails
Type: array
Value: ["owner@example.com", "trusted.staff@example.com"]
```

Use lowercase email addresses that exactly match the Firebase Authentication users.

Client code cannot create, update, or delete `settings/accessControl`. This prevents a signed-in browser client from adding another administrator.

## 9. Firestore Security Rules behavior

The rules are stored in `firestore.rules`.

They implement the following policy:

- Unauthenticated users cannot read or write any application collection.
- A signed-in user must have an email in `settings/accessControl.approvedEmails`.
- Approved administrators can read events and create, update, or delete only schema-valid event records.
- The allowlist document cannot be modified through client code.
- Audit log documents can be created only for matching event mutations and read by approved administrators.
- Audit log documents cannot be updated or deleted.
- Future-phase collections remain denied until their schemas and features are implemented.
- Anything not explicitly matched is denied by default.

Collections currently covered by the rules:

- `events`
- `registrations`
- `tickets`
- `communications`
- `aiDrafts`
- `auditLogs`
- `settings`

Only `events`, `auditLogs`, and the `settings/accessControl` allowlist are currently used by implemented application behavior.

## 10. Firestore event data model

Each event is stored in the `events` collection.

```text
eventId       string       Firestore document ID duplicated as a field
eventName     string       Required
eventDate     Timestamp    Required
location      string       Required
eventType     string       Required
status        string       Required
capacity      number       Required, integer greater than zero
ticketPrice   number       Required, zero or greater
notes         string       Optional internal notes
createdAt     Timestamp    Firestore server timestamp
updatedAt     Timestamp    Firestore server timestamp
```

Supported event types in the current form:

- Cake picnic
- Brunch
- Tasting
- Vendor pop-up
- Private food experience
- Other

Supported statuses:

- Draft
- Upcoming
- Active
- Completed
- Cancelled

Selecting an event as the dashboard's active event is separate from setting the event's `status` field to `active`.

## 11. Audit log data model

Event changes create records in `auditLogs`.

```text
logId          string       Audit document ID
eventId        string       Related event ID
action         string       event.create, event.update, or event.delete
targetType     string       event
targetId       string       Event document ID
performedBy    string       Admin email, or UID fallback
timestamp      Timestamp    Firestore server timestamp
details        map          Current event name
```

Event writes and audit writes are committed in the same Firestore batch. This means:

- An event creation cannot commit without its audit entry.
- An event update cannot commit without its audit entry.
- An event deletion cannot commit without its audit entry.

The client cannot edit or delete audit history after creation.

## 12. Active-event behavior

The selected active event is stored locally under this browser storage key:

```text
gather-savor-active-event
```

Only the following event summary is stored locally:

- Event ID
- Event name
- Event date
- Location
- Status

The full event remains in Firestore. Local persistence lets the sidebar and dashboard remember the organizer's working context after a refresh.

If the selected event is deleted or no longer exists in the real-time event list, the local active-event selection is cleared.

## 13. Event CRUD behavior

### Create

1. The administrator opens the event form.
2. Required fields are validated in the browser.
3. A new Firestore event document ID is generated.
4. The event and `event.create` audit record are written atomically.
5. Firestore's live subscription updates the event list.
6. The interface displays a success notification.

### Edit

1. Existing event data is loaded into the form.
2. Updated fields are validated.
3. The event and `event.update` audit record are written atomically.
4. `createdAt` remains unchanged and `updatedAt` receives a new server timestamp.
5. If the edited event is selected as active, its locally stored summary is refreshed.

### Delete

1. The administrator must open a destructive-action confirmation dialog.
2. The event name is displayed in the warning.
3. The event and `event.delete` audit record are committed atomically.
4. An active-event selection is cleared when its event is deleted.
5. Audit history remains append-only.

## 14. User-interface and reliability states

Implemented states include:

- Authentication loading screen
- Missing Firebase configuration warning
- Disabled login form until Firebase is configured
- Friendly Firebase Authentication errors
- Protected-route redirect
- Firestore event loading state
- Firestore error state
- Retry action
- Empty event-calendar state
- Field-level validation errors
- Form-level save errors
- Saving state
- Deleting state
- Success notifications
- Confirmed destructive actions
- Desktop event table
- Mobile event cards
- Mobile event-form scrolling
- Keyboard Escape support for closing the event form when not saving
- Reduced-motion CSS support
- Visible keyboard focus states

## 15. Folder structure

```text
gather-savor-event-hub/
  .env.example
  .firebaserc
  .gitignore
  firebase.json
  firestore.indexes.json
  firestore.rules
  index.html
  package.json
  package-lock.json
  README.md
  PROJECT_HANDOFF.md
  vite.config.js
  eslint.config.js

  public/
    favicon.svg

  src/
    App.jsx
    main.jsx
    styles.css

    auth/
      AuthContext.js
      AuthProvider.jsx
      ProtectedRoute.jsx
      useAuth.js

    components/
      BrandMark.jsx
      LoadingScreen.jsx

      events/
        DeleteEventDialog.jsx
        EventFormModal.jsx

      ui/
        EmptyState.jsx
        ErrorState.jsx
        LoadingState.jsx

    events/
      ActiveEventContext.js
      ActiveEventProvider.jsx
      useActiveEvent.js

    layout/
      AppShell.jsx

    lib/
      firebase.js

    pages/
      DashboardPage.jsx
      EventsPage.jsx
      LoginPage.jsx
      NotFoundPage.jsx
      PhasePage.jsx
      SettingsPage.jsx

    services/
      auditService.js
      eventService.js

    utils/
      dateUtils.js
      validators.js

  tests/
    event-utils.test.js
```

## 16. Important source files

| File | Responsibility |
|---|---|
| `src/lib/firebase.js` | Initializes Firebase Auth and Firestore from environment variables |
| `src/auth/AuthProvider.jsx` | Tracks the Firebase Authentication session |
| `src/auth/ProtectedRoute.jsx` | Blocks private routes for signed-out users |
| `src/App.jsx` | Registers implemented and future-phase routes |
| `src/layout/AppShell.jsx` | Responsive private dashboard layout and navigation |
| `src/pages/LoginPage.jsx` | Secure admin login interface |
| `src/pages/DashboardPage.jsx` | Workspace and active-event summary |
| `src/pages/EventsPage.jsx` | Event list, states, active selection, and CRUD coordination |
| `src/components/events/EventFormModal.jsx` | Validated create/edit form |
| `src/components/events/DeleteEventDialog.jsx` | Destructive-action confirmation |
| `src/services/eventService.js` | Firestore event subscription and batch mutations |
| `src/services/auditService.js` | Creates append-only event audit records |
| `src/events/ActiveEventProvider.jsx` | Persists active-event context locally |
| `src/utils/validators.js` | Event-form validation |
| `src/utils/dateUtils.js` | Firestore and browser date conversion |
| `firestore.rules` | Approved-admin data authorization |
| `firebase.json` | Firestore and Hosting deployment configuration |

## 17. Local commands

Install dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Run tests:

```powershell
npm test
```

Run lint checks:

```powershell
npm run lint
```

Create a production build:

```powershell
npm run build
```

Preview the production build locally:

```powershell
npm run preview
```

## 18. Firebase deployment commands

Review `.firebaserc` before deployment and confirm that it contains the correct Firebase project ID.

Authenticate the Firebase CLI:

```powershell
npx firebase-tools login
```

Select the project:

```powershell
npx firebase-tools use gathervibeshub
```

Deploy Firestore rules:

```powershell
npx firebase-tools deploy --only firestore:rules --project gathervibeshub
```

Build and deploy Hosting:

```powershell
npm run build
npx firebase-tools deploy --only hosting --project gathervibeshub
```

Deploy rules and Hosting together:

```powershell
npm run build
npx firebase-tools deploy --only firestore:rules,hosting --project gathervibeshub
```

## 19. Verification completed

The current implementation passed:

- ESLint
- Production Vite build
- Node unit tests
- Dependency audit with zero known vulnerabilities
- Protected `/dashboard` to `/login` browser redirect
- Missing-Firebase configuration state
- Event-form required-field validation
- Completed event-form submission through an isolated browser test harness
- 390-pixel mobile event-form rendering
- Mobile horizontal-overflow check
- Browser runtime-error check
- Browser failed-request check
- Firebase CLI project and web-app identity verification
- Firestore database existence and edition verification
- Firestore rules compilation and production deployment
- Firebase Hosting production deployment
- Live Hosting root page and production asset HTTP 200 checks
- Live Google and Email/Password provider configuration verification
- Authorized-domain verification for `localhost`, `gathervibeshub.firebaseapp.com`, and `gathervibeshub.web.app`
- Google button and email/password backup presence at 390, 430, 768, and 1440 pixel widths
- Signed-out `/dashboard`, `/events`, and `/settings` redirects to `/login`
- Zero horizontal overflow at all tested login widths
- PWA manifest, production icons, and no-cache service worker verification

Unit tests currently cover:

- Valid event data
- Missing and invalid event data
- Whole-number capacity enforcement
- Non-negative ticket-price enforcement
- Stable active-event date persistence
- PWA name, colors, display mode, and icon requirements
- Absence of service-worker fetch interception or Cache API use
- Google/email authentication wiring through the admin allowlist check

## 20. Remaining authenticated end-to-end testing limitation

Firebase is connected and deployed. A true authenticated database test still requires:

- The existing Firebase Authentication user's email in `settings/accessControl.approvedEmails`

The Authentication user export contained one user during the Phase 2.5 review, but `settings/accessControl` did not exist. Codex did not invent an allowlist or claim a successful approved login without owner confirmation.

No fake Firebase fallback or bypass was added. This prevents local demonstrations from being mistaken for working production authorization.

After the first approved administrator is created, live verification should confirm:

1. Approved admin login succeeds.
2. Unapproved login cannot read Firestore data.
3. Event creation produces both an `events` document and an `auditLogs` document.
4. Event editing preserves `createdAt` and updates `updatedAt`.
5. Event deletion removes the event and preserves the deletion audit record.
6. Audit records cannot be edited or deleted from the browser client.
7. Refreshing the page preserves the active-event selection.

## 21. Design decisions

### Firestore allowlist instead of hardcoded emails

Approved emails are kept in `settings/accessControl`. This avoids committing personal email addresses to source control and allows the Firebase Console to remain the administrative source of truth.

### Atomic audit logging

Event changes and audit records share one Firestore batch. This is stronger than writing the event first and attempting the audit record afterward.

### Local active-event persistence

The active-event choice is an organizer-interface preference, so it is currently stored locally instead of requiring another Firestore write. A future multi-device requirement could move this to a protected settings document.

### Firestore Timestamp for event dates

Event dates are stored as Firestore Timestamps. The form converts dates at local noon to avoid date-only values moving to the previous day because of timezone conversion.

### No early Google Sheets OAuth integration

Google Sheets OAuth was intentionally deferred. The recommended first import workflow remains:

```text
Google Form → Google Sheet → Export CSV → Import Preview → Firestore
```

Direct Google Sheets OAuth can be evaluated after the safer CSV workflow is complete.

## 22. Recommended next phase

Phase 3 should be implemented as one complete registration feature without adding tickets or AI.

Recommended Phase 3 scope:

- Registrations CRUD
- CSV upload or pasted CSV
- Import preview before any Firestore write
- Field mapping
- Row validation
- Duplicate detection
- Stable registration IDs
- Atomic import and audit entries
- Search and registration filters
- Loading, error, empty, and success states
- No Google OAuth initially

Do not begin Phase 3 until the live Firebase login, event CRUD, rules, and audit behavior have been verified with the real project.
