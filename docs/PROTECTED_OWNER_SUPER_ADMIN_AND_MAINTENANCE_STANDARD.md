# Protected Owner Super Admin and Maintenance Standard

## Purpose

Gather & Savor Event Hub must keep Jaylan's protected-owner access available while the product changes. The protected owner identity is pinned by immutable Firebase UID:

- Email: `jaylanspencer99@gmail.com`
- Firebase UID: `WcDU2jmbopdAgDlMMWvD3TkqqbC3`

This owner grant covers authentication and authorization only. It must never bypass event scoping, schema validation, destructive-action confirmation, duplicate detection, payment validation, ticket validation, attendance validation, or append-only audit logging.

## Required Behavior

- The protected owner resolves to admin access even when `settings/accessControl.approvedEmails` is missing, stale, or edited.
- The protected owner can use legitimate organizer write paths that are available to approved organizers.
- Invalid writes still fail for the protected owner.
- Scanner, viewer, requester, and anonymous boundaries are not widened by owner support.
- Every business-record write that normally requires audit evidence must keep the same append-only audit requirement for the protected owner.
- Legacy records must be readable and editable through normal UI flows by replacing or normalizing only the supported document shape at save time.
- The app must not add page-level or service-level hardcoded owner bypasses that skip Firestore rules.

## Release Procedure for New Write Paths

Every new organizer feature, route, service, import path, batch operation, or production correction workflow must update the protected-owner authorization matrix before release.

Required checks:

1. Document the route, service, Firestore path, legitimate owner actions, and retained guardrails.
2. Add tests proving the protected owner can perform the legitimate write without being listed in `approvedEmails`.
3. Add tests proving invalid data is still rejected for the protected owner.
4. Add tests proving scanner, viewer, requester, and anonymous access are not expanded.
5. Confirm append-only audit evidence is created or preserved.
6. Confirm legacy or partial records are normalized safely before validated writes.
7. Confirm System QA still displays signed-in UID, expected UID, UID match, app owner detection, and the manual CODEX_DEMO owner-write procedure.
8. Run lint, tests, build, product QA, e2e smoke or full checks as appropriate, production dependency audit, React Doctor, `git diff --check`, and clean Git status checks.

## Resource Status Incident

The CODEX_DEMO Resource status failure was caused by app-side partial update semantics against strict Firestore rules. The rules validate the full post-update Resource document with an exact field allowlist. Legacy Resource documents can contain old values or stale fields from earlier demo fixtures. A partial update that does not delete unsupported stale fields keeps those fields in `request.resource.data`, so the write is denied even though protected-owner authorization succeeds.

The standard fix is not to weaken rules. Resource creation must still require `createdBy` to match the writer. Resource updates must keep `createdBy` immutable and well-formed while requiring `updatedBy` to match the current writer. Resource edits must send normalized supported fields and delete detected unsupported legacy fields in the same Firestore batch as the append-only audit log. This lets old records become current-shape only when an approved organizer edits them.

## Production Verification

Production permission fixes require browser verification with the real protected-owner session after deployment:

1. Sign in as `jaylanspencer99@gmail.com`.
2. Open System QA and confirm UID `WcDU2jmbopdAgDlMMWvD3TkqqbC3`.
3. Confirm Protected Owner access is active.
4. Select `CODEX_DEMO - Full System Walkthrough`.
5. Perform one safe, reversible write through the affected workflow.
6. Confirm the write persists after reload.
7. Confirm the append-only audit log exists where the workflow records one.
8. Reverse only the business-record change when required.
9. Leave audit logs intact.

Do not use Cake Piknik Barbados for protected-owner smoke testing unless the task explicitly authorizes that event.
