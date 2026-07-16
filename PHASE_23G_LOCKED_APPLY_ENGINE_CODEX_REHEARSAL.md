# Phase 23G - Locked Apply Engine and CODEX_TEST Rehearsal

## Purpose

Phase 23G adds a locked rehearsal path for applying approved registration-finance proposals. It does not enable CPB production writes.

## Locks

- Allowed rehearsal event: `CODEX_TEST Live Verification Event`
- Allowed rehearsal event ID: `xPfa0b3KZyLSDnAD2uGI`
- Denied event ID: `zhaPxi31cpqLAW0cuS20`
- Manifest SHA256: `D690D6B84A272F5189098F57E4643FAF6F5E628F98519B74369593ED31DE0828`
- Invalid old manifest SHA256 remains rejected: `2A98AB506F1846294944DA49A57CD2E898F6B5D97E4E03C412FD89683C92C409`

Exact rehearsal approval phrase:

`I APPROVE CPB MANIFEST D690D6B84A272F5189098F57E4643FAF6F5E628F98519B74369593ED31DE0828 FOR PHASE 23G APPLY REHEARSAL ONLY`

## Supported Fields

The apply plan only supports registration finance fields:

- `ticketPrice`
- `amountDue`
- `amountPaid`
- `balanceDue`
- `paymentStatus`
- `priceTier`
- `paymentMethod`

The engine does not support:

- Operations Ledger writes
- ticket assignment
- check-in changes
- scanner permissions
- access-workflow changes
- CPB writes

## CODEX_TEST Rehearsal

The rehearsal script is:

`node scripts/admin/runCodexApplyRehearsal.mjs`

It performs a controlled CODEX_TEST-only write sequence:

1. Verify exact manifest hash and rehearsal approval phrase.
2. Prove CPB is denied by the lock.
3. Create one synthetic CODEX_TEST registration.
4. Apply one registration-finance update to the synthetic registration.
5. Verify the updated finance fields.
6. Delete the synthetic registration.
7. Leave append-only audit logs for create, finance update, and cleanup delete.
8. Write backup and result artifacts outside Git.

Output folder:

`C:\Users\Jaylan\Desktop\GSV_CODEX_TEST_Apply_Rehearsal`

Completed rehearsal run:

- Run ID: `PH23G_CODEX_REHEARSAL_20260716194517`
- Synthetic registration created: `1`
- Synthetic registration finance-updated: `1`
- Synthetic registration deleted: `1`
- Cleanup verified: `true`
- CPB denial verified: `true`
- Audit logs appended: `3`
- Operations writes: `0`
- ticket writes: `0`
- check-in writes: `0`
- CPB writes: `0`

## Guardrails

- CPB registrations were not written by this phase.
- CPB Operations entries were not written by this phase.
- CPB tickets were not written by this phase.
- CPB check-in fields were not written by this phase.
- Firestore rules and indexes were not changed.
- No dependency was added.
- The workbook was not modified.
- The Phase 23EFG branch is not merged, pushed, or deployed.
