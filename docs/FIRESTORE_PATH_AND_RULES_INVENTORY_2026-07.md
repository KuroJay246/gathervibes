# Firestore Path And Rules Inventory - 2026-07

Static scan reviewed source, rules, tests, scripts, functions, and integration packages. No Firestore rules were changed.

## Path Counts
- Static path references discovered: 21
- Active rule-backed paths: 9
- Reserved denied paths: 5
- Potential orphaned/uncertain path references: require deeper Pass 2 review because some dynamic paths are composed at runtime and are not fully captured by static regex.

## Active Paths
- `settings/accessControl`
- `events/{eventId}`
- `events/{eventId}/staffAssignments/{uid}`
- `registrations/{registrationId}`
- `auditLogs/{logId}`
- `operationsLedger/{ledgerEntryId}`
- `staffProfiles/{uid}`
- `staffProfiles/{uid}/preferences/onboarding`
- `accessRequests/{requestId}`

## Reserved / Denied Paths
- `tickets/{documentId}`
- `checkIn/{documentId}`
- `communications/{documentId}`
- `aiDrafts/{documentId}`
- `settings/{documentId}`

## Static Path Evidence
| Path | Rules Seen | Files |
| `, ` | no | `integrations/google-forms/function/googleFormsReceiver.js` |
| `);

  let existingEmails = [];
  try {
    const doc = await accessControlRef.get();
    if (doc.exists) {
      const data = doc.data();
      if (Array.isArray(data.approvedEmails)) {
        existingEmails = data.approvedEmails;
      }
    }
  } catch (error) {
    console.error(` | no | `scripts/admin/ensureAccessControl.mjs` |
| `);
    const doc = await accessControlRef.get();
    
    if (!doc.exists) {
      console.error(` | no | `scripts/admin/verifyFirebaseSetup.mjs` |
| `);
  const auditLogsRef = db.collection(` | no | `scripts/admin/ensureCodexTestEvent.mjs` |
| `).get(),
    db.collection(` | no | `scripts/admin/verifyProductionCounts.mjs` |
| `).get();
  const events = eventsSnapshot.docs.map(eventSummary);
  const codexMatches = events.filter((event) => (
    event.docId === codexTestEventId
    || event.eventId === codexTestEventId
    || event.eventName === codexTestEventName
  ));
  const auditSample = await db.collection(` | no | `scripts/admin/verifyProductionFixtures.mjs` |
| `).set({
      approvedEmails: [E2E_EMAIL],
      rolesByEmail: { [E2E_EMAIL]: ` | no | `scripts/e2e/globalSetup.mjs` |
| `).set({
      logId: ` | no | `scripts/e2e/globalSetup.mjs` |
| `accessRequests/` | yes | `firestore.rules` |
| `aiDrafts/` | yes | `firestore.rules`<br>`tests/phase45-ticketing.test.js` |
| `auditLogs/` | yes | `firestore.rules`<br>`tests/firestore-checkin-rules.test.js`<br>`tests/phase26-historical-attendance-foundation.test.js` |
| `checkIn/` | yes | `firestore.rules` |
| `communications/` | yes | `firestore.rules`<br>`tests/phase45-ticketing.test.js` |
| `databases/` | yes | `firestore.rules` |
| `events/` | yes | `firestore.rules` |
| `operationsLedger/` | yes | `firestore.rules`<br>`tests/firestore-checkin-rules.test.js` |
| `registrations/` | yes | `firestore.rules` |
| `settings/` | yes | `firestore.rules` |
| `settings/accessControl` | yes | `firestore.rules` |
| `staffProfiles/` | yes | `firestore.rules` |
| `tickets/` | yes | `firestore.rules` |

## Permission Summary
- `settings/accessControl`: approved admins can read; all client create/update/delete denied.
- `events/{eventId}`: approved admins can create/update/delete with schema validation; assigned staff roles can read only as allowed.
- `events/{eventId}/staffAssignments/{uid}`: approved admins manage; staff can read their own active assignment.
- `registrations/{registrationId}`: approved admins manage validated registration/ticket/check-in/attendance updates; scanner can only perform assigned-event check-in completion.
- `auditLogs/{logId}`: append-only; create requires matching mutation after-state; update/delete denied.
- `operationsLedger/{ledgerEntryId}`: approved admins create/update; delete denied; operations helpers can read assigned event entries.
- `accessRequests/{requestId}`: rules support a future workflow, but UI remains disabled/guarded by product status.
- `staffProfiles/{uid}`: approved admin management, self-read for active staff profile.
- `staffProfiles/{uid}/preferences/onboarding`: user-owned onboarding preference document.

## Findings
- Source paths not allowed by Rules: none confirmed in Pass 1 static scan, but Google Forms/form inbox paths require deeper review because some paths are packaged and dynamic.
- Rules paths not used by source: reserved `tickets`, `checkIn`, `communications`, `aiDrafts`, and generic `settings/{documentId}` are intentionally denied until implemented.
- Writes without matching audit logs: no confirmed production write missing an audit log in Pass 1, but event delete and staff profile/assignment changes need deeper workflow-level audit in Pass 2.
- Broad permissions: default deny remains present; `events delete` and `registrations delete` are approved-admin allowed and must be protected by UI confirmations and audit behavior in workflow audit.
- UI/rules mismatch candidates: event planner, accessRequests prototype, Google Forms inbox, and onboarding should be reviewed route-by-route in Pass 2.
