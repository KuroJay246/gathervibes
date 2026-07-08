import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  ACCESS_REQUEST_ALLOWED_STATUSES,
  ACCESS_REQUEST_AUDIT_ACTIONS,
  ACCESS_REQUEST_FIELD_NAMES,
  ACCESS_REQUEST_NOT_LIVE_CODE,
  ACCESS_REQUEST_NOT_LIVE_MESSAGE,
  ACCESS_REQUEST_SECURITY_BOUNDARIES,
  approveAccessRequest,
  buildNotLiveAccessWorkflowResult,
  createStaffProfileForAccessRequest,
  declineAccessRequest,
  revokeAccessRequest,
  submitAccessRequest,
  upsertStaffAssignmentForAccessRequest,
} from '../src/services/accessRequestContract.js'

test('Phase 17F-A plan and 17F-C checklist stay planning-only and preserve guardrails', async () => {
  const plan = await readFile('PHASE_17F_A_ACCESS_WORKFLOW_IMPLEMENTATION_PLAN.md', 'utf8')
  const checklist = await readFile('PHASE_17F_C_ACCESS_WORKFLOW_SMOKE_CHECKLIST.md', 'utf8')

  assert.match(plan, /Status: active planning artifact only/)
  assert.match(plan, /future approval workflow sequence/i)
  assert.match(plan, /future decline workflow sequence/i)
  assert.match(plan, /future revoke workflow sequence/i)
  assert.match(plan, /future staffProfile create\/update sequence/i)
  assert.match(plan, /future staffAssignment create\/update sequence/i)
  assert.match(plan, /`approvedEmails` remains admin-level access only/i)
  assert.match(plan, /No live approval, decline, revoke, profile-edit, assignment-edit, or lead-scanner workflow is implemented in Phase 17F-A\./)
  assert.match(plan, /Firestore rules are not deployed in Phase 17F-A\./)
  assert.match(plan, /Firestore indexes are not deployed in Phase 17F-A\./)
  assert.match(plan, /CPB remains protected production data\./)
  assert.match(plan, /CODEX_TEST only/i)

  assert.match(checklist, /Status: active manual checklist only/)
  assert.match(checklist, /It does not make approval, decline, revoke, staff assignment editing, or lead-scanner workflow live\./)
  assert.match(checklist, /Approved admin login works\./)
  assert.match(checklist, /Scanner still lands on `\/scanner`\./)
  assert.match(checklist, /Submit remains disabled\./)
  assert.match(checklist, /Confirm no staff\/scanner\/requester email is added to `approvedEmails` as a shortcut\./)
  assert.match(checklist, /Do not use CPB for QA\./)
})

test('Phase 17F-B disabled contract exposes no live write path', async () => {
  const contractSource = await readFile('src/services/accessRequestContract.js', 'utf8')

  assert.deepEqual(ACCESS_REQUEST_ALLOWED_STATUSES, ['pending', 'approved', 'declined', 'revoked'])
  assert.equal(ACCESS_REQUEST_FIELD_NAMES.includes('requestedRole'), true)
  assert.equal(ACCESS_REQUEST_FIELD_NAMES.includes('reviewedBy'), true)
  assert.equal(ACCESS_REQUEST_AUDIT_ACTIONS.includes('access.request.approve'), true)
  assert.equal(ACCESS_REQUEST_AUDIT_ACTIONS.includes('staff.assignment.revoke'), true)
  assert.equal(ACCESS_REQUEST_SECURITY_BOUNDARIES.includes('approvedEmails remains admin-only'), true)
  assert.equal(buildNotLiveAccessWorkflowResult('approveAccessRequest').code, ACCESS_REQUEST_NOT_LIVE_CODE)
  assert.match(buildNotLiveAccessWorkflowResult('approveAccessRequest').message, /Phase 17F-B is a disabled contract only/)
  assert.match(ACCESS_REQUEST_NOT_LIVE_MESSAGE, /No live access workflow is available/)
  assert.doesNotMatch(contractSource, /firebase\/firestore|addDoc|setDoc|updateDoc|deleteDoc|writeBatch|runTransaction/)

  for (const fn of [
    submitAccessRequest,
    approveAccessRequest,
    declineAccessRequest,
    revokeAccessRequest,
    createStaffProfileForAccessRequest,
    upsertStaffAssignmentForAccessRequest,
  ]) {
    await assert.rejects(fn(), (error) => error?.code === ACCESS_REQUEST_NOT_LIVE_CODE)
  }
})

test('17F status copy keeps 17E-C/D/E read-only and records current-head Daily QA success as non-blocking', async () => {
  const settings = await readFile('src/pages/SettingsPage.jsx', 'utf8')
  const qa = await readFile('src/pages/QaPage.jsx', 'utf8')
  const health = await readFile('src/utils/runtimeHealth.js', 'utf8')
  const readme = await readFile('README.md', 'utf8')
  const handoff = await readFile('PROJECT_HANDOFF.md', 'utf8')
  const phase17gB = await readFile('PHASE_17G_B_FIRESTORE_RULES_DEPLOYMENT_FINAL_REVIEW.md', 'utf8')

  assert.match(settings, /Phase 17F-A Access workflow implementation plan/)
  assert.match(settings, /Phase 17F-B Disabled access request service contract/)
  assert.match(settings, /Phase 17F-C Access workflow manual smoke checklist/)
  assert.match(settings, /Service contract: disabled/)
  assert.match(settings, /Smoke checklist: manual only/)
  assert.match(settings, /Phase 17G-B2 Firestore Rules Real Deploy \+ Immediate Smoke/)
  assert.match(settings, /In progress on current branch \/ Firestore rules deployed \/ Firestore indexes not deployed \/ admin smoke verified \/ scanner smoke pending \/ no live workflow/)
  assert.match(settings, /Complete Phase 17G-B2 scanner smoke \+ closeout/)
  assert.match(qa, /Latest current-head Daily QA run 28875120502 succeeded for branch commit ca93b260/)
  assert.match(health, /Older failed GitHub UI badges can reflect stale built-auth smoke history/)
  assert.match(health, /Phase 17G-A closed after organizer review PASS with no rules or index deploy, and Phase 17G-B2 deployed backend accessRequests rules without deploying indexes\./)
  assert.match(readme, /Phase 17F-A is now closed, merged-ready, and organizer accepted on branch `codex\/phase-17e-cde-access-requests-ui-readiness-ci` as the Access Workflow Implementation Plan only\./)
  assert.match(readme, /Phase 17F-C is now closed, merged-ready, and organizer accepted on branch `codex\/phase-17e-cde-access-requests-ui-readiness-ci` as the Access Workflow manual smoke checklist only\./)
  assert.match(readme, /Phase 17G-A is now closed, merged-ready, and organizer accepted on branch `codex\/phase-17g-a-live-workflow-go-no-go-rules-approval-package` at commit `e098315c29e5b085bdbd11218ce6b5211d2c9832` as a Live Workflow Go\/No-Go Review \+ Rules Deployment Approval Package only\./)
  assert.match(readme, /Phase 17G-B is now closed, merged-ready, and organizer accepted on branch `codex\/phase-17g-b-firestore-rules-deployment-final-review` at commit `c998700d7882c3c5feaa52f59e9f21fd57c72b10` as Firestore Rules Deployment Approval \+ Dry-Run Final Review only\./)
  assert.match(readme, /Phase 17G-B2 is currently in progress on branch `codex\/phase-17g-b2-firestore-rules-real-deploy-immediate-smoke` from base\/main tip `24d66e9bb49db2d3fe4f1722439dafe3bbd626c7`\./)
  assert.match(handoff, /Phase 17F-B is now closed, merged-ready, and organizer accepted on branch `codex\/phase-17e-cde-access-requests-ui-readiness-ci` as the disabled Access Request service contract only\./)
  assert.match(handoff, /Phase 17G-A is now closed, merged-ready, and organizer accepted on branch `codex\/phase-17g-a-live-workflow-go-no-go-rules-approval-package` at commit `e098315c29e5b085bdbd11218ce6b5211d2c9832` as a Live Workflow Go\/No-Go Review \+ Rules Deployment Approval Package only\./)
  assert.match(handoff, /Phase 17G-B is now closed, merged-ready, and organizer accepted on branch `codex\/phase-17g-b-firestore-rules-deployment-final-review` at commit `c998700d7882c3c5feaa52f59e9f21fd57c72b10` as Firestore Rules Deployment Approval \+ Dry-Run Final Review only\./)
  assert.match(handoff, /Phase 17G-B2 is currently in progress on branch `codex\/phase-17g-b2-firestore-rules-real-deploy-immediate-smoke` from base\/main tip `24d66e9bb49db2d3fe4f1722439dafe3bbd626c7`\./)
  assert.match(handoff, /If GitHub still shows an older failure badge for this branch, treat it as stale older-run UI confusion unless the current head fails again\./)
  assert.match(phase17gB, /Phase 17G-B2 - Explicit Firestore Rules Deploy Authorization \+ Real Deploy \+ Immediate Smoke only\./)
})

test('Phase 17G-A approval package stays non-live and documents the rules deployment boundary', async () => {
  const artifact = await readFile('PHASE_17G_A_LIVE_WORKFLOW_GO_NO_GO_RULES_APPROVAL.md', 'utf8')
  const contract = await readFile('src/services/accessRequestContract.js', 'utf8')
  const rules = await readFile('firestore.rules', 'utf8')

  assert.match(artifact, /Status: closed, merged-ready, and organizer accepted approval package only/)
  assert.match(artifact, /What deploying current firestore\.rules would change/)
  assert.match(artifact, /Deploying the current repository `firestore\.rules` would make the server-side `accessRequests\/\{requestId\}` rules live\./)
  assert.match(artifact, /That deployment would not, by itself:/)
  assert.match(artifact, /wire `src\/services\/accessRequestContract\.js` into the UI/)
  assert.match(artifact, /Default answer: no index deploy unless separately approved\./)
  assert.match(artifact, /Phase 17G-B — Firestore Rules Deployment Approval \+ Dry-Run Final Review only\./)
  assert.match(artifact, /Phase 17G-C — Live Requester Create Workflow Implementation, disabled behind explicit gate\./)
  assert.match(artifact, /Phase 17G-D — Admin Review Workflow Implementation, disabled behind explicit gate\./)
  assert.match(contract, /Phase 17F-B is a disabled contract only\. No live access workflow is available\./)
  assert.doesNotMatch(contract, /addDoc|setDoc|updateDoc|writeBatch|runTransaction/)
  assert.match(rules, /match \/accessRequests\/\{requestId\} \{/)
  assert.match(rules, /allow create: if isSignedIn\(\)/)
  assert.match(rules, /allow update: if isApprovedAdmin\(\)/)
})
