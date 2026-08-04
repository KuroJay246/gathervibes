# Import Intake and Message Refinement Plan - 2026-08

## Product Problem

Import Center and Google Forms Response Inbox both handle structured intake, but the organizer experience previously felt like separate technical flows. Message Builder prepared copyable text, but it needed clearer purpose, recipient context, template metadata, and stronger copy-only language.

## Current Behavior Reviewed

- Import Center supports staged source, record type, upload/paste, worksheet, mapping, validation, review, confirmation, and result screens.
- Response Inbox supports manual pasted Google Forms exports and safe review actions before any mapping handoff.
- Message Builder supports event-scoped registration segments, deterministic templates, preview text, recipient lists, and clipboard copy.

## Organizer Friction

- Response Inbox status columns mixed daily review terms with implementation terms.
- Source and record cards did not make review-only destinations prominent enough.
- Final import confirmation lacked a compact operation summary before the write action.
- Message Builder template choices lacked purpose, audience, subject, version, and merge-field context.
- Copy actions did not separate subject and body clearly.

## Proposed Correction

- Keep Import Center as the only confirmed-write path for guest registrations.
- Present Response Inbox as a review queue with New, Needs Review, Approved, Ready to Import, Waiting for Information, Duplicates, and History.
- Add a final confirmation summary before import.
- Strengthen Message Builder as deterministic copy-only preparation, not sending, AI generation, or CRM history.

## Behavior That Must Remain Unchanged

- No CPB writes.
- No Gmail, WhatsApp, SMS, live Google Sheets sync, OCR, or AI generation.
- No new Firestore collections.
- No scanner permission expansion.
- QR payload remains `GSV:TICKET:{ticketCode}`.
