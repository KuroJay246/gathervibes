# Event Resource Foundation Result - 2026-08

## Result

The app now has a persistent event-scoped Resources workspace at `/resources`.

Records are stored under:

`events/{eventId}/resources/{resourceId}`

The workspace tracks equipment, supplies, packing, pickup, delivery, on-site readiness, and return status without changing Operations Ledger calculations or registration payment formulas.

Access is organizer-only for create/update/delete in this foundation. Assigned staff routes are not exposed until a separate read-only or delegated-write UX is approved.

## Implemented

- Resource name, category, source type, status, quantity needed, quantity confirmed, derived shortage, unit, location, supplier links, packing/pickup/return requirements, due dates, notes, and linked task/document/operation/commitment/Run of Show IDs.
- Summary metrics for total resources, confirmed resources, shortages, packed items, on-site items, pickup due, and return overdue.
- Add, edit, delete, and status-update controls with append-only audit logs.
- Task prefill links for follow-up.

## Guardrails

- Confirmed quantity cannot exceed needed quantity.
- Shortage is derived from needed minus confirmed quantity.
- Linked Operations or commitment IDs do not alter ledger totals.
- No new dependency was added.
- No storage, file upload, supplier portal, payment, or QR behavior was added.
