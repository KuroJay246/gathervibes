# Run of Show and Resources Existing Data Compatibility - 2026-08

## Compatibility Inventory

Existing Events remain unchanged. New Run of Show and Resources records are event-scoped subcollections, so no event document migration is required.

Existing Tasks remain readable and editable. New Run of Show and Resources records may store optional task IDs, but task documents do not need backfilled fields.

Existing Contacts and Organizations remain reusable directory records. New records may store optional contact or organization IDs, but those links do not grant access and do not require contact-schema changes.

Existing Documents remain URL/reference records. New records may store optional document IDs, but document records do not need relationship backfills.

Existing Operations Ledger entries and Commitments remain financially authoritative for event-level money and obligations. Resources may link IDs for context only and do not alter ledger formulas or totals.

Existing Reports remain read-only. Run of Show and Resources can inform Overview readiness, but report calculations for registrations, guests, payments, attendance, and Operations are not changed by this foundation.

## Forward Compatibility

Optional relationship fields are intentionally nullable or empty. Old records without these fields remain valid in their own collections. New records can link to old IDs without modifying those old records.

## Migration Policy

No production data migration was performed in this phase. If future backfill is needed, it must be a separate dry-run-first task with exact event scope, organizer approval, append-only audit evidence, and rollback notes.

