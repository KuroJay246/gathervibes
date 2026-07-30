# Role Permission and Rules Consistency Audit

Audit pass: Pass 3
Date: 2026-07-30
Scope: `accessRoles`, `ProtectedRoute`, `AssignedEventGate`, `AppShell`, service writes, Firestore rules, and role tests.

## Result

Protected owner and approved organizers have full organizer access. Staff roles are route-filtered in the UI and constrained by rules for assigned-event reads/check-in/Operations helper reads. The main consistency gap is product wording that says some live staff access is not fully enforced until deployment approval while current rules already contain staff assignment enforcement.

## Role Review

| Role | UI route behavior | Rules behavior |
| --- | --- | --- |
| Protected owner | Full organizer access by UID | `isProtectedOwner` bypasses mutable allowlist but not validators. |
| Approved organizer/admin | Full organizer access | Approved email may read/write admin paths allowed by rules. |
| Event manager | Dashboard and Check-In in client route helper | Rules allow assigned-event read paths; writes remain narrow/admin except explicit paths. |
| Scanner | Scanner route only | Assigned-event registration read and check-in completion/audit only. |
| Viewer | Dashboard route helper | Assigned-event read-only rules where implemented. |
| Operations helper | Operations route only | Assigned-event Operations read; no writes. |
| Unapproved signed-in | Redirect/not approved | Rules deny normal data access. |
| Signed-out | Login route | Rules deny. |

## Findings

| ID | Priority | Finding |
| --- | --- | --- |
| PASS3-ROLE-P2-001 | P2 | `roleCapabilitySummary` includes wording that live staff access does not enforce scoped rules yet, while Firestore rules now contain assigned-event role checks. This creates operator confusion. |
| PASS3-ROLE-P3-001 | P3 | Client route access is intentionally narrower than some rules reads for staff roles; this is safe but should remain documented so hidden buttons are not confused with missing backend enforcement. |
