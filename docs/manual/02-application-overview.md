# Application Overview

Gathetr is a private React/Firebase event operations application for planning, guest management, registration payments, tickets, check-in, operations, run of show, resources, documents, contacts, reports, imports, message preparation, Settings, and System QA.

The active synthetic training event is `CODEX_DEMO - Full System Walkthrough`. CPB is real historical production data and must not receive synthetic writes.

## Main User Groups

- Protected Owner: UID-protected permanent owner access.
- Approved Organizer: active approved email in `settings/accessControl`.
- Staff roles: active `staffProfiles/{uid}` plus active event assignment.
- Scanner: assigned-event check-in-only route and narrow Firestore update path.

## Stack

| Layer | Actual technology |
| --- | --- |
| Frontend | React ^19.2.0, Vite ^7.2.4, React Router ^8.3.0 |
| Styling | Tailwind CSS ^4.1.17 through @tailwindcss/vite |
| Backend services | Firebase client SDK ^12.6.0 |
| Database | Cloud Firestore with local emulator tests |
| Authentication | Firebase Authentication with Google and email/password |
| Hosting | Firebase Hosting classic static SPA rewrites to index.html |
| QR | qrcode ^1.5.4; scanner uses html5-qrcode ^2.3.8 |
| Excel parsing | read-excel-file ^9.2.0; xlsx package intentionally absent |
