# Gather & Savor Event Hub

For the complete implementation, Firebase, security, testing, and deployment handoff, see [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md).

Private event-operations dashboard for **Gather & Savor Vibes**. Phases 1, 2, and 2.5 are implemented: the secure React/Firebase foundation, complete event management, Google sign-in, and a mobile-first PWA foundation.

Registrations, tickets, check-in, imports, communications, and AI writing are not implemented yet. Those routes identify their planned phase and do not pretend to save or load data.

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

## Security rules

`firestore.rules` denies public access and permits only authenticated users whose email appears in `settings/accessControl.approvedEmails`. The allowlist document cannot be written by client code. Audit log documents are append-only from the client.

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

The current production build is deployed at [gathervibeshub.web.app](https://gathervibeshub.web.app). Authentication providers are enabled, but `settings/accessControl` must be created before approved dashboard login and live CRUD can be tested.

## Mobile/PWA foundation

Phase 2.5 adds an installable mobile-web foundation named **Gather & Savor Hub** (`G&S Hub`). It includes a manifest, branded app icons, Apple touch icon metadata, standalone display mode, iPhone safe-area spacing, mobile navigation, and larger touch targets. The service worker performs lifecycle setup only: it has no fetch handler and does not cache Firestore or other private admin data.

This remains a private web application. It is not a public attendee app and is not yet a native App Store or Play Store application.

## Project structure

```text
src/
  auth/         Firebase session context and route guard
  components/   Shared UI plus event form and confirmation dialogs
  events/       Active-event context with local persistence
  layout/       Responsive protected admin shell
  lib/          Firebase initialization
  pages/        Login, dashboard, Events CRUD, settings, and phase boundaries
  services/     Firestore event and audit operations
  utils/        Event validation and date formatting
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
- [x] Phase 3 and all later features remain unimplemented
