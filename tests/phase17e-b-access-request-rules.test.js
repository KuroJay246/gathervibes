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

test('Phase 17E-B docs and status copy describe accessRequests as a dry-run prototype only', async () => {
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')
  const qa = await readFile('src/pages/QaPage.jsx', 'utf8')
  const health = await readFile('src/utils/runtimeHealth.js', 'utf8')
  const readme = await readFile('README.md', 'utf8')
  const handoff = await readFile('PROJECT_HANDOFF.md', 'utf8')

  assert.match(settings, /Phase 17E-B Access Request Rules Prototype \+ Tests/)
  assert.match(settings, /Active \/ dry-run only \/ no live workflow \/ rules dry-run only \/ no index deploy/)
  assert.match(settings, /Phase 17E-B is now active as an undeployed access-request rules prototype and test pass only/)
  assert.match(settings, /no live write action for accessRequests, staffProfiles, staffAssignments, approvedEmails, or auditLogs/i)
  assert.match(qa, /Phase 17E-B is active as a dry-run rules prototype with no live workflow change/)
  assert.match(qa, /Phase 17E-B remains dry-run only for future accessRequests workflow review/)
  assert.match(health, /Phase 17E-B is active as a dry-run rules prototype with no live workflow change/)
  assert.match(health, /Phase 17E-B remains dry-run only for future accessRequests workflow review/)
  assert.match(readme, /Phase 17E-B is now active on branch `codex\/phase-17e-b-access-request-rules-prototype-tests` as Access Request Rules Prototype \+ Tests, dry-run only\./)
  assert.match(readme, /Phase 17E-B is the current dry-run-only rules prototype for future `accessRequests\/\{requestId\}` workflow review; it does not deploy rules or make the workflow live\./)
  assert.match(handoff, /Phase 17E-B active as Access Request Rules Prototype \+ Tests, dry-run only/)
  assert.match(handoff, /Phase 17E-B is now active on branch `codex\/phase-17e-b-access-request-rules-prototype-tests` as Access Request Rules Prototype \+ Tests, dry-run only\./)
})
