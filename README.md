# Gather & Savor Event Hub

For the complete implementation, Firebase, security, testing, and deployment handoff, see [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md).

Private event-operations dashboard for **Gather & Savor Vibes**. Phases 1 and 2 are implemented: the secure React/Firebase foundation plus complete event management.

Registrations, tickets, check-in, imports, communications, and AI writing are not implemented yet. Those routes identify their planned phase and do not pretend to save or load data.

## Stack

- React 19 + Vite
- JavaScript
- Tailwind CSS 4
- Firebase Authentication and Cloud Firestore
- Firebase Hosting

## Local setup

Requirements: Node.js 20.19+ or 22.12+ and a Firebase project you control.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Open the existing [`gathervibeshub` Firebase project](https://console.firebase.google.com/project/gathervibeshub/overview) (project number `9444350727`).

3. The Firebase Web App is already registered and **Authentication → Sign-in method → Email/Password** is enabled.

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

The current production build is deployed at [gathervibeshub.web.app](https://gathervibeshub.web.app). Firestore rules and Hosting were last deployed on June 21, 2026. Authentication is enabled, but the project still needs its first trusted user and `settings/accessControl` allowlist document before dashboard login and live CRUD can be tested.

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
- [x] Email/password login with clear loading and error states
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
