# Phase 17F-C - Access Workflow Smoke Checklist

Status: active manual checklist only  
Branch: `codex/phase-17e-cde-access-requests-ui-readiness-ci`

## 1. No-live-workflow statement

Phase 17F-C is a manual checklist only. It does not make approval, decline, revoke, staff assignment editing, or lead-scanner workflow live.

## 2. CODEX_TEST-only rules

- Use CODEX_TEST only for any future rehearsal tied to access workflow.
- Do not create a separate event for access workflow smoke without explicit organizer approval.
- Keep scanner smoke assigned-event-only.

## 3. CPB no-touch rules

- Do not use CPB for QA.
- Do not assign scanner or requester smoke to CPB.
- Stop immediately if CPB becomes visible from any requester, scanner, or access-workflow surface.

## 4. Admin smoke checklist

- Approved admin login works.
- `/settings?tab=access` opens.
- Access Requests admin surface opens without AppErrorBoundary fallback.
- Request states are visible as read-only or disabled only.
- Approve, decline, revoke, create staff profile, and assign event controls remain clearly not live until separately approved.
- `approvedEmails` warnings remain visible and admin-only.
- No CPB visibility or targeting appears.

## 5. Scanner smoke checklist

- Scanner login works through the existing live scanner path.
- Scanner still lands on `/scanner`.
- Scanner sees assigned-event-only access.
- Scanner sees CODEX_TEST only for approved rehearsal.
- Scanner sees no admin navigation.
- Scanner still has no undo/check-out.
- Admin undo remains admin-only where already implemented.
- CPB is not visible or accessible.

## 6. Requester-preview smoke checklist

- Requester preview remains disabled and admin-visible only.
- No public requester route is exposed.
- Submit remains disabled.
- No Firestore write occurs.
- No service call occurs.
- No approval, decline, revoke, profile, or assignment action is triggered.

## 7. Rollback verification

- Keep the last known-good rules commit recorded before any future approved live rollout.
- Reconfirm rollback operator and command before any future real rules deploy.
- If admin or scanner access breaks, roll back rules first if the failure is rules-related.
- Re-test admin login, scanner login, CODEX_TEST-only assignment visibility, and CPB protection after rollback.

## 8. Audit log append-only check

- Confirm access workflow audit actions append only.
- Confirm no client path updates or deletes `auditLogs`.
- Confirm audit wording stays explicit for request, profile, and assignment actions.

## 9. No-approvedEmails workaround check

- Confirm no staff/scanner/requester email is added to `approvedEmails` as a shortcut.
- Confirm `approvedEmails` remains admin-level access only.
- If access appears blocked, do not solve it by broadening allowlist access.
