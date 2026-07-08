import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function rulesText() {
  return readFile('firestore.rules', 'utf8')
}

test('Phase 17E-B prototype adds accessRequests collection rules without deploying workflow behavior', async () => {
  const rules = await rulesText()

  assert.match(rules, /match \/accessRequests\/\{requestId\} \{/)
  assert.match(rules, /function validAccessRequest\(data, requestId\)/)
  assert.match(rules, /function validRequestedRole\(role\) \{\s*return role in \['event-manager', 'scanner', 'viewer', 'operations-helper'\];/)
  assert.match(rules, /function validAccessRequestStatus\(status\) \{\s*return status in \['pending', 'approved', 'declined', 'revoked'\];/)
  assert.match(rules, /allow get: if isApprovedAdmin\(\)[\s\S]*resource\.data\.requesterUid == request\.auth\.uid/)
  assert.match(rules, /allow list: if isApprovedAdmin\(\);/)
  assert.match(rules, /allow create: if isSignedIn\(\)[\s\S]*request\.resource\.data\.requesterUid == request\.auth\.uid[\s\S]*request\.resource\.data\.createdBy == request\.auth\.uid[\s\S]*request\.resource\.data\.status == 'pending'[\s\S]*request\.resource\.data\.reviewedAt == null[\s\S]*request\.resource\.data\.reviewedBy == null[\s\S]*request\.resource\.data\.createdAt == request\.time[\s\S]*request\.resource\.data\.updatedAt == request\.time/)
  assert.match(rules, /allow update: if isApprovedAdmin\(\)[\s\S]*accessRequestImmutableFieldsUnchanged\(requestId\)[\s\S]*accessRequestReviewFieldsValid\(\)[\s\S]*request\.resource\.data\.updatedAt == request\.time/)
  assert.match(rules, /function accessRequestReviewFieldsValid\(\)[\s\S]*request\.resource\.data\.status == 'pending'[\s\S]*request\.resource\.data\.reviewedAt == null[\s\S]*request\.resource\.data\.reviewedBy == null[\s\S]*request\.resource\.data\.status in \['approved', 'declined', 'revoked'\][\s\S]*request\.resource\.data\.reviewedAt == request\.time[\s\S]*validPerformedBy\(request\.resource\.data\.reviewedBy\)/)
  assert.match(rules, /allow delete: if false;/)
})

test('Phase 17E-B docs and current Phase 17G-B2 status copy keep accessRequests non-live', async () => {
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')
  const qa = await readFile('src/pages/QaPage.jsx', 'utf8')
  const health = await readFile('src/utils/runtimeHealth.js', 'utf8')
  const readme = await readFile('README.md', 'utf8')
  const handoff = await readFile('PROJECT_HANDOFF.md', 'utf8')
  const readiness = await readFile('PHASE_17E_E_ACCESS_WORKFLOW_DEPLOYMENT_READINESS.md', 'utf8')
  const phase17gB = await readFile('PHASE_17G_B_FIRESTORE_RULES_DEPLOYMENT_FINAL_REVIEW.md', 'utf8')

  assert.match(settings, /Phase 17E-C Access Requests read-only\/admin UI foundation/)
  assert.match(settings, /Phase 17E-D Requester access-request form UX prototype/)
  assert.match(settings, /Phase 17E-E Access workflow deployment readiness package/)
  assert.match(settings, /Phase 17E-B is closed after organizer prototype review PASS as an undeployed access-request rules prototype and test pass only/)
  assert.match(settings, /Phase 17E-C closed after organizer review PASS with an admin-visible read-only request surface only, Phase 17E-D closed after organizer review PASS with a disabled requester form preview only, Phase 17E-E closed after organizer review PASS with readiness\/rollback planning only, Phase 17F-A closed after organizer review PASS with implementation planning only, and Phase 17F-B \/ 17F-C closed after organizer review PASS as the disabled contract and manual smoke checklist only\. Phase 17G-A is closed after organizer review PASS/)
  assert.match(settings, /Phase 17G-B is closed after organizer review PASS and documents the accepted final dry-run comparison between the current repository rules and the last deployed baseline/i)
  assert.match(settings, /Phase 17G-B2 is in progress on the current branch: backend accessRequests rules are live, Firestore indexes remain undeployed, the login redirect compatibility fix is deployed, scanner smoke is still pending, and no live workflow exists\./i)
  assert.match(qa, /Phase 17E-C, Phase 17E-D, and Phase 17E-E are closed after organizer review PASS\. Phase 17F-A, Phase 17F-B, and Phase 17F-C are closed after organizer review PASS\. Phase 17G-A is closed after organizer review PASS and the approval package is accepted\. Phase 17G-B is closed after organizer review PASS as the accepted final dry-run review only\. Phase 17G-B2 is in progress with Firestore rules deployed, admin smoke verified, and scanner smoke still pending\./)
  assert.match(qa, /Phase 17E-B closed as a dry-run-only accessRequests prototype, Phase 17E-C \/ 17E-D \/ 17E-E \/ 17F-A \/ 17F-B \/ 17F-C closed without deploying Firestore rules or indexes, Phase 17G-A closed after organizer review PASS with no rules or index deploy, and Phase 17G-B2 deployed backend accessRequests rules without deploying indexes\./)
  assert.match(health, /Phase 17E-C, Phase 17E-D, and Phase 17E-E are closed after organizer review PASS\. Phase 17F-A, Phase 17F-B, and Phase 17F-C are closed after organizer review PASS\. Phase 17G-A is closed after organizer review PASS and the approval package is accepted\. Phase 17G-B is closed after organizer review PASS as the accepted final dry-run review only\. Phase 17G-B2 is in progress on the current branch with Firestore rules deployed, admin smoke passed, and scanner smoke still pending\./)
  assert.match(health, /Phase 17E-B closed as a dry-run-only accessRequests prototype, Phase 17E-C \/ 17E-D \/ 17E-E \/ 17F-A \/ 17F-B \/ 17F-C closed without deploying Firestore rules or indexes, Phase 17G-A closed after organizer review PASS with no rules or index deploy, and Phase 17G-B2 deployed backend accessRequests rules without deploying indexes\./)
  assert.match(readme, /Phase 17F-B is now closed, merged-ready, and organizer accepted on branch `codex\/phase-17e-cde-access-requests-ui-readiness-ci` as the disabled Access Request service contract only\./)
  assert.match(handoff, /Phase 17F-C is now closed, merged-ready, and organizer accepted on branch `codex\/phase-17e-cde-access-requests-ui-readiness-ci` as the Access Workflow manual smoke checklist only\./)
  assert.match(readme, /Phase 17E-B is now closed, merged-ready, and accepted by organizer review PASS on branch `codex\/phase-17e-b-access-request-rules-prototype-tests` at commit `dc108e18a5c5efd9cd3c283daeaeed1d440a45d9` as Access Request Rules Prototype \+ Tests, dry-run only\./)
  assert.match(readme, /Requesters cannot self-approve, cannot self-revoke, cannot create `staffProfiles`, cannot create `staffAssignments`, and cannot modify `approvedEmails`\./)
  assert.match(readme, /Phase 17E-E is now closed, merged-ready, and organizer accepted on branch `codex\/phase-17e-cde-access-requests-ui-readiness-ci` as the access workflow deployment readiness package and rollback plan only\./)
  assert.match(handoff, /Phase 17E-B closed as Access Request Rules Prototype \+ Tests after organizer review PASS, dry-run only/)
  assert.match(handoff, /Phase 17E-C is now closed, merged-ready, and organizer accepted on branch `codex\/phase-17e-cde-access-requests-ui-readiness-ci`\./)
  assert.match(readiness, /Phase 17E-E is deployment-readiness and rollback planning only\./)
  assert.match(readme, /Phase 17G-B is now closed, merged-ready, and organizer accepted on branch `codex\/phase-17g-b-firestore-rules-deployment-final-review` at commit `c998700d7882c3c5feaa52f59e9f21fd57c72b10` as Firestore Rules Deployment Approval \+ Dry-Run Final Review only\./)
  assert.match(handoff, /Phase 17G-B is now closed, merged-ready, and organizer accepted on branch `codex\/phase-17g-b-firestore-rules-deployment-final-review` at commit `c998700d7882c3c5feaa52f59e9f21fd57c72b10` as Firestore Rules Deployment Approval \+ Dry-Run Final Review only\./)
  assert.match(readme, /Phase 17G-B2 is currently in progress on branch `codex\/phase-17g-b2-firestore-rules-real-deploy-immediate-smoke` from base\/main tip `24d66e9bb49db2d3fe4f1722439dafe3bbd626c7`\./)
  assert.match(handoff, /Phase 17G-B2 is currently in progress on branch `codex\/phase-17g-b2-firestore-rules-real-deploy-immediate-smoke` from base\/main tip `24d66e9bb49db2d3fe4f1722439dafe3bbd626c7`\./)
  assert.match(phase17gB, /Last deployed-rules comparison baseline: `dc62cade23313eb0ab6a3b06d5318c379b8a4cbb`/)
  assert.match(phase17gB, /git-history baseline only; `firebase-tools` help in this workflow did not expose a Firestore rules fetch\/get command/i)
  assert.match(phase17gB, /Phase 17G-B2 - Explicit Firestore Rules Deploy Authorization \+ Real Deploy \+ Immediate Smoke only\./)
})
