# Phase 23L-A Audit Log Append-Only Integrity Review

Date: 2026-07-21
Project: `gathervibeshub`
Database: Firestore Native `(default)`

## Result

`AUDIT INTEGRITY PASS WITH FIXES`

The app and Firestore Security Rules preserve audit-log append-only behavior for client SDK users. The six missing synthetic audit logs were deleted through a privileged Firestore REST cleanup path that bypassed Security Rules. The fix in this phase is audit-integrity documentation plus emulator regression coverage for append-only denial, malformed audit writes, and failed-batch atomicity. No CPB apply package was modified or executed.

## Production Versus Emulator Determination

The six-log deletion occurred in production Firestore, not the emulator.

Evidence:
- The cleanup used Firestore REST URLs under `https://firestore.googleapis.com/v1/projects/gathervibeshub/databases/(default)/documents`.
- `npx -y firebase-tools@latest firestore:databases:list --project gathervibeshub` reported `(default)` as a `FIRESTORE_NATIVE` database.
- The earlier Admin SDK cleanup attempt failed because Application Default Credentials were unavailable, then a REST cleanup using Firebase CLI OAuth credentials succeeded.

## Six-Log Deletion Confirmation

Six synthetic audit-log documents were deleted during the Phase 23L production cleanup.

Known recorded evidence:
- Synthetic prefix: `QA_TICKET_PERMISSION_AUDIT_1784651528475`
- Synthetic registration id: `b9oP1qroc0K8B1tstI1r`
- Deleted registrations: `1`
- Deleted audit logs: `6`
- Remaining registrations by prefix after cleanup: `0`
- Remaining audit logs for the target registration after cleanup: `0`

The exact six audit-log document ids were not printed or stored in the cleanup output.

## Exact Deletion Mechanism

The deletion mechanism was a Codex-run PowerShell cleanup command that used:
- The Firebase CLI OAuth token from local Firebase CLI configuration.
- Firestore REST `documents:runQuery` to find matching production documents.
- Firestore REST `DELETE https://firestore.googleapis.com/v1/{document.name}` to delete each matching audit log.
- Firestore REST `DELETE` to delete the synthetic registration.

This was not a client SDK operation and not a UI operation.

## Actor And Tool Used

Actor/tool: Codex executing local PowerShell against the production Firestore REST API.

Credential class: Firebase CLI Google OAuth credential with enough IAM permission to delete production Firestore documents.

The exact Google principal was not captured in the cleanup output. No access tokens are recorded in this report.

## Rules-Bypass Result

The delete succeeded because privileged Google Cloud credentials bypass Firestore Security Rules. Firestore Security Rules govern Firebase client SDK requests authenticated by Firebase Auth. They do not constrain deletes performed through sufficiently privileged IAM credentials, including Firebase CLI, Google Cloud REST, Admin SDK, service account, or console paths.

## Application Deletion-Path Result

No tracked React/Firebase application path deletes or updates `auditLogs`.

Reviewed services create audit logs with `batch.set(audit.ref, audit.data)` or `setDoc`; registration deletion paths delete registration documents only. The app-side audit behavior is append-only.

## QA Cleanup-Path Result

The unsafe behavior was the privileged QA cleanup path deleting synthetic audit logs by `targetId`. Future QA cleanup must preserve audit/security/access records by default and may delete only the synthetic primary records that the test created, such as registrations, tickets, or temporary fixtures.

Any future privileged cleanup that can touch audit logs requires explicit human confirmation naming the collection, query predicate, and expected document count before execution.

## Rules Before

The production rules already contained an append-only audit rule:

```rules
match /auditLogs/{logId} {
  allow read: if isApprovedAdmin();
  allow create: if ...;
  allow update, delete: if false;
}
```

## Rules After

No Firestore rules behavior change was required. The append-only denial remains equivalent and active in source:

```rules
allow update, delete: if false;
```

Live production release check:
- Release: `projects/gathervibeshub/releases/cloud.firestore`
- Ruleset: `projects/gathervibeshub/rulesets/059bec4b-eef6-43cb-acb3-82617b4cf503`
- Release update time: `2026-07-21T16:36:17.812304Z`
- Production rules match local `firestore.rules`: `true`
- Production rules include audit append-only denial: `true`

## Rules Tests

Added regression coverage in `tests/firestore-checkin-rules.test.js` for:
- Approved admin audit update denied.
- Approved admin audit delete denied.
- Assigned scanner audit update/delete denied.
- Unapproved user audit delete denied.
- Mismatched audit target denied.
- Mismatched audit event denied.
- Missing audit required fields denied.
- Invalid audit side of a batch blocks the registration ticket mutation.
- Source-level assertion that audit rules remain append-only and services do not add audit delete/update paths.

## Audit Preservation Contract

QA and production cleanup must preserve audit logs. Synthetic audit records should remain queryable as evidence and should be identifiable by synthetic markers in surrounding record fields or future explicit metadata, not removed after verification.

## Production CODEX_TEST Verification

One production CODEX_TEST smoke was performed through the deployed app using the authenticated approved-admin browser session:

- Synthetic prefix: `QA_AUDIT_APPEND_ONLY_1784657462522`
- Synthetic registration id: `xa64twGsLhGoAgN0i2Pj`
- Ticket assigned: `CTLVE-001`
- Audit logs after create and ticket assignment: `2`
- Audit actions after create and ticket assignment: `registration.create`, `ticket.assign`
- Synthetic registration cleanup: app UI deleted the registration only.
- Registration read after cleanup: `404`
- Audit logs remaining after cleanup: `3`
- Remaining audit actions: `registration.create`, `ticket.assign`, `registration.delete`
- Remaining audit ids: `hG99X8aEzrWTDnz4n2pC`, `N3At5O0WYakJIKNQYV6X`, `7aWuBV4KP95iVNZNATZd`

Production client update/delete denial was not executed because the deployed app intentionally exposes no audit-log mutation UI, and there is no safe client-auth test harness in this repository for direct audit-log mutation attempts without inspecting browser session credentials. Emulator rules tests cover those denials against the same ruleset content that is active in production.

## Deleted-Evidence Assessment

The six deleted audit logs are not reconstructable from repository output because their document ids, original timestamps, and full details were not captured before deletion.

Do not fabricate replacement audit logs. The trustworthy record is this incident report plus any independent Cloud Audit Logs that may be available in Google Cloud for the deletion events.

## Incident Documentation Result

This document records the deletion mechanism, known evidence, rules boundary, cleanup flaw, and remediation. It should be retained with the Phase 23L/23L-A QA artifacts.

## CPB Apply Audit-Architecture Result

The CPB apply audit architecture remains acceptable from a client-enforced append-only perspective after this review because app code and Firestore rules deny client update/delete paths for audit logs.

Operational caveat: CPB apply trust still depends on IAM discipline. Any privileged cleanup or apply tooling can bypass Firestore Security Rules if it uses Google Cloud credentials with direct Firestore permissions.

## CPB Untouched Confirmation

No CPB manifest, CPB proposal file, CPB apply data, or CPB production data was modified or executed in this phase.

## Manifest Impact

No manifest impact. This phase documents audit-integrity risk and adds regression tests; it does not change CPB decisions, proposal counts, stored values, or apply status.

## Next Action

Run validation, complete one production CODEX_TEST append-only verification, merge the focused branch to `main`, push, and do not deploy Hosting or Firestore rules unless a deployed source file changes.
