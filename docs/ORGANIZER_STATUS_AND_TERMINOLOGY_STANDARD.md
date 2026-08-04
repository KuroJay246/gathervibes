# Organizer Status and Terminology Standard

## Product Terms

- Overview: current event summary and attention list.
- Guests & Registrations: registration records and the guests represented by them.
- Registration Payments: registration charges, payment evidence, balances, and follow-up.
- Tickets: ticket assignment and QR preparation.
- Check-In: event-day attendance.
- Operations: event-level money and obligations.
- Message Builder: copy-only message creation.
- Reports: read-only review and follow-up reporting.
- Settings: practical workspace defaults.
- System QA: diagnostics, safety checks, and synthetic test guidance.

## Status Rules

- Completed events remain editable by approved organizers.
- CODEX_DEMO is a Test Event and is hidden from normal event lists by default.
- Real events use standard safeguards and are not synthetic QA fixtures.
- A registration is not the same as a guest; `personsAttending` controls guest count.
- Registration payments and Operations Ledger records are separate financial surfaces.
- Message Builder never claims automatic sending, live AI generation, OAuth, or delivery tracking.

