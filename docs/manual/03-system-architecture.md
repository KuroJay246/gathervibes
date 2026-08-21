# System Architecture

## High-Level Flow

```mermaid
flowchart TD
  User[Owner, organizer, staff, scanner] --> Browser[Browser / PWA shell]
  Browser --> React[React 19 + Vite app]
  React --> RouteGate[ProtectedRoute and canViewRoute]
  RouteGate --> Auth[Firebase Authentication]
  Auth --> Access[Access resolver: settings/accessControl + staff profile + assignment]
  Access --> FirestoreRules[Firestore Security Rules]
  FirestoreRules --> Firestore[(Cloud Firestore)]
  React --> Hosting[Firebase Hosting static assets]
  React --> QA[Local emulator tests and Playwright QA]
```

## Important Boundaries

- Frontend route checks improve user experience but do not replace Firestore Rules.
- Firestore Rules are the backend security boundary.
- Audit logs are append-only evidence and are coupled to business mutations.
- Message Builder is copy-only; it does not send email.
- Documents are references/links and metadata only; no Firebase Storage upload is active.
