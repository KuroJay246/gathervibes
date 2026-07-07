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

test('Phase 17E-B docs and status copy describe accessRequests as a closed dry-run prototype only', async () => {
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')
  const qa = await readFile('src/pages/QaPage.jsx', 'utf8')
  const health = await readFile('src/utils/runtimeHealth.js', 'utf8')
  const readme = await readFile('README.md', 'utf8')
  const handoff = await readFile('PROJECT_HANDOFF.md', 'utf8')
  const readiness = await readFile('PHASE_17E_E_ACCESS_WORKFLOW_DEPLOYMENT_READINESS.md', 'utf8')

  assert.match(settings, /Phase 17E-C Access Requests read-only\/admin UI foundation/)
  assert.match(settings, /Phase 17E-D Requester access-request form UX prototype/)
  assert.match(settings, /Phase 17E-E Access workflow deployment readiness package/)
  assert.match(settings, /Phase 17E-B is closed after organizer prototype review PASS as an undeployed access-request rules prototype and test pass only/)
  assert.match(settings, /Phase 17E-C adds an admin-visible read-only request surface only, Phase 17E-D adds a disabled requester form preview only, Phase 17E-E adds readiness\/rollback planning only, Phase 17F-A adds implementation planning only, Phase 17F-B adds a disabled service contract only, and Phase 17F-C adds a manual smoke checklist only/)
  assert.match(settings, /no live workflow exists and this batch intentionally exposes no live write action for accessRequests, staffProfiles, staffAssignments, approvedEmails, or auditLogs/i)
  assert.match(qa, /Phase 17E-C is active as a read-only admin request surface, Phase 17E-D is active as a disabled requester prototype, Phase 17E-E is active as readiness planning only, Phase 17F-A is active as implementation planning only, Phase 17F-B is active as a disabled service contract only, and Phase 17F-C is active as a manual smoke checklist only/)
  assert.match(qa, /Phase 17E-B closed as a dry-run-only accessRequests prototype, and Phase 17E-C \/ 17E-D \/ 17E-E \/ 17F-A \/ 17F-B \/ 17F-C keep Firestore rules and indexes undeployed/)
  assert.match(health, /Phase 17E-C is active as a read-only admin request surface, Phase 17E-D is active as a disabled requester prototype, Phase 17E-E is active as readiness planning only, Phase 17F-A is active as implementation planning only, Phase 17F-B is active as a disabled service contract only, and Phase 17F-C is active as a manual smoke checklist only/)
  assert.match(health, /Phase 17E-B closed as a dry-run-only accessRequests prototype, and Phase 17E-C \/ 17E-D \/ 17E-E \/ 17F-A \/ 17F-B \/ 17F-C keep Firestore rules and indexes undeployed/)
  assert.match(readme, /Phase 17F-B is now active on branch `codex\/phase-17e-cde-access-requests-ui-readiness-ci` as the disabled Access Request service contract only\./)
  assert.match(handoff, /Phase 17F-C is now active on branch `codex\/phase-17e-cde-access-requests-ui-readiness-ci` as the Access Workflow manual smoke checklist only\./)
  assert.match(readme, /Phase 17E-B is now closed, merged-ready, and accepted by organizer review PASS on branch `codex\/phase-17e-b-access-request-rules-prototype-tests` at commit `dc108e18a5c5efd9cd3c283daeaeed1d440a45d9` as Access Request Rules Prototype \+ Tests, dry-run only\./)
  assert.match(readme, /Requesters cannot self-approve, cannot self-revoke, cannot create `staffProfiles`, cannot create `staffAssignments`, and cannot modify `approvedEmails`\./)
  assert.match(readme, /Phase 17E-E is now active on branch `codex\/phase-17e-cde-access-requests-ui-readiness-ci` as the access workflow deployment readiness package and rollback plan only\./)
  assert.match(handoff, /Phase 17E-B closed as Access Request Rules Prototype \+ Tests after organizer review PASS, dry-run only/)
  assert.match(handoff, /Phase 17E-C is now active on branch `codex\/phase-17e-cde-access-requests-ui-readiness-ci` as the Access Requests read-only\/admin UI foundation only\./)
  assert.match(readiness, /Phase 17E-E is deployment-readiness and rollback planning only\./)
})
