# Audit Log Business Write Standard

Business writes must be paired with append-only audit logs wherever Firestore batch semantics allow it.

## Required Audit Shape

Core business audit details should include:

- action;
- event ID;
- target collection/type;
- target record ID;
- initiating user;
- timestamp;
- operation ID for bulk writes;
- changed field names;
- safe before values;
- safe after values;
- result when available.

## Safe Change Details

Use `safeAuditChanges(before, after, fields)` for field-level before/after values. Callers must pass only fields that are appropriate for audit evidence.

Do not include:

- passwords;
- tokens;
- cookies;
- full private form payloads;
- unnecessary phone numbers;
- unnecessary email content;
- raw secrets.

## Same Unit Of Work

Registration creates, updates, imports, deletes, attendance changes, ticket changes, and Operations ledger changes should write their audit log in the same Firestore batch or transaction as the business record whenever possible.

If the audit write fails validation, the paired business write should fail in the same unit of work.

## Current Coverage

This release strengthens:

- import audit entries with operation ID and chunk index;
- bulk registration deletion with safe before/delete metadata;
- bulk payment status updates with field-level status changes;
- bulk finance updates with safe finance field changes;
- Operations ledger create/update/cancel with field-level changes.

Audit logs remain append-only. This release does not add audit-log editing or deletion.
