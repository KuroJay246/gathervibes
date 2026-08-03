# Run of Show Foundation Result - 2026-08

## Result

The app now has a persistent event-scoped Run of Show workspace at `/run-of-show`.

Records are stored under:

`events/{eventId}/runOfShow/{itemId}`

The route keeps existing Working Event scoping and is guarded by the organizer shell. Approved organizers and the protected owner can manage records. Assigned staff write/read UX is deliberately not exposed for this foundation. Scanner and operations-helper roles remain isolated.

## Implemented

- Event-day timeline items with title, category, date, start/end time, sequence, location, status, description, notes, responsible person labels, supplier/staff arrival state, dependency IDs, linked task/document/resource IDs, and delay reason.
- Now/Next summary derived from saved timeline items.
- Status transitions for confirmed, in progress, completed, and delayed items.
- Add, edit, and delete controls with append-only audit logs.
- Task prefill links for follow-up without auto-creating tasks.
- Forward-compatible optional links to existing tasks, documents, contacts, organizations, and resources.

## Guardrails

- Firestore schema validation is strict for new Run of Show documents.
- Old linked records do not need new fields to remain linkable.
- Relationship IDs do not grant access to the linked records.
- Completed events remain editable through the same safeguards as active events.
- No scanner access was added.
- QR payload behavior was not changed.
- No production migration was performed.
