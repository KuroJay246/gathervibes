# Document Register Foundation Result - 2026-08

## Result

The app now has an event-scoped Documents route at `/documents` for structured document references, links, and evidence metadata.

## Boundary

This phase does not implement Firebase Storage, file upload, OCR, document editing, or server-side fetching of external URLs. The register stores metadata and external locations only.

## Data Model

Primary path:

`events/{eventId}/documents/{documentId}`

Supported fields include title, category, description, status, required flag, URL, document type, provider, external location, linked contact, linked organization, linked task, linked Operations entry, linked commitment, due date, expiry date, version label, notes, created/updated timestamps, and created/updated actor.

## Organizer Workflow

- Add Document Reference
- Edit
- Open Link using explicit external link behavior
- Copy Link
- Mark Received
- Mark Approved
- Mark Replaced
- Mark Not Required
- Create Follow-Up Task
- Prepare Message when linked to a contact or organization
- Delete the reference only, not the external file

## Integrations

- Overview: Documents is available as a restrained quick action.
- Tasks: document follow-up opens Tasks with safe query-param prefill for organizer confirmation.
- Operations: ledger entries support optional `linkedDocumentId`.
- Message Builder: document context opens copy-only Message Builder; no sending is performed.

## Security

Firestore rules validate allowed fields, enum values, URL format, date-string format, immutable identity fields, event scoping, and timestamps. Scanner access is denied by omission. Event managers can read/create/update event-scoped document records; viewers can read; deletes remain approved-organizer only.

## Tests

`tests/document-contact-foundation.test.js` covers route wiring, no-file-upload copy, URL handling, required/missing/expiring state, task prefill, audit service usage, dependency/QR guardrails, and Firestore rule coverage.

