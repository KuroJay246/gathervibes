import { readFileSync } from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  APPLY_SUPPORTED_FIELDS,
  CODEX_TEST_EVENT_ID,
  CPB_EVENT_ID,
  PHASE_23G_MANIFEST_SHA256,
  PHASE_23J_MANIFEST_SHA256,
  assertPhase23gApplyLock,
  assertPhase23jProductionApplyLock,
  buildRegistrationApplyPlan,
  expectedPhase23gApprovalPhrase,
  expectedPhase23jApprovalPhrase,
} from '../src/utils/manifestApplyEngine.js'

test('Phase 23G apply lock allows CODEX_TEST rehearsal only with exact manifest approval phrase', () => {
  assert.equal(assertPhase23gApplyLock({
    targetEventId: CODEX_TEST_EVENT_ID,
    manifestSha256: PHASE_23G_MANIFEST_SHA256,
    approvalPhrase: expectedPhase23gApprovalPhrase(),
    rehearsalOnly: true,
  }), true)

  assert.throws(() => assertPhase23gApplyLock({
    targetEventId: CPB_EVENT_ID,
    manifestSha256: PHASE_23G_MANIFEST_SHA256,
    approvalPhrase: expectedPhase23gApprovalPhrase(),
    rehearsalOnly: true,
  }), /CPB is denied/)

  assert.throws(() => assertPhase23gApplyLock({
    targetEventId: CODEX_TEST_EVENT_ID,
    manifestSha256: '2A98AB506F1846294944DA49A57CD2E898F6B5D97E4E03C412FD89683C92C409',
    approvalPhrase: expectedPhase23gApprovalPhrase(),
    rehearsalOnly: true,
  }), /Manifest hash mismatch/)
})

test('Phase 23G apply plan supports only registration finance fields and audit metadata', () => {
  const plan = buildRegistrationApplyPlan({
    targetEventId: CODEX_TEST_EVENT_ID,
    registration: {
      registrationId: 'qa-reg',
      eventId: CODEX_TEST_EVENT_ID,
      amountPaid: 0,
      balanceDue: 25,
      paymentStatus: 'pending',
    },
    proposal: {
      changedFields: ['amountPaid', 'balanceDue', 'paymentStatus'],
      proposedValues: { amountPaid: 25, balanceDue: 0, paymentStatus: 'paid' },
    },
  })

  assert.deepEqual(plan.changedFields, ['amountPaid', 'balanceDue', 'paymentStatus'])
  assert.deepEqual(plan.after, { amountPaid: 25, balanceDue: 0, paymentStatus: 'paid' })
  assert.equal(plan.audit.action, 'registration.finance-update')
  assert.equal(plan.audit.details.rehearsalOnly, true)
  assert.equal(plan.audit.details.manifestSha256, PHASE_23G_MANIFEST_SHA256)
})

test('Phase 23G apply plan rejects unsupported fields and scope drift', () => {
  assert.throws(() => buildRegistrationApplyPlan({
    targetEventId: CODEX_TEST_EVENT_ID,
    registration: { registrationId: 'qa-reg', eventId: CPB_EVENT_ID },
    proposal: { changedFields: ['amountPaid'], proposedValues: { amountPaid: 25 } },
  }), /event scope mismatch/)

  assert.throws(() => buildRegistrationApplyPlan({
    targetEventId: CODEX_TEST_EVENT_ID,
    registration: { registrationId: 'qa-reg', eventId: CODEX_TEST_EVENT_ID },
    proposal: { changedFields: ['checkedIn'], proposedValues: { checkedIn: true } },
  }), /Unsupported proposal fields/)

  assert.equal(APPLY_SUPPORTED_FIELDS.includes('paymentReference'), false)
  assert.equal(APPLY_SUPPORTED_FIELDS.includes('checkedIn'), false)
})

test('Phase 23J production apply lock requires CPB, exact approval, and full proposal count', () => {
  assert.deepEqual(assertPhase23jProductionApplyLock({
    targetEventId: CPB_EVENT_ID,
    manifestSha256: PHASE_23J_MANIFEST_SHA256,
    approvalPhrase: expectedPhase23jApprovalPhrase(),
    dryRun: false,
    proposalCount: 65,
  }), { approved: true, dryRun: false })

  assert.throws(() => assertPhase23jProductionApplyLock({
    targetEventId: CODEX_TEST_EVENT_ID,
    manifestSha256: PHASE_23J_MANIFEST_SHA256,
    approvalPhrase: expectedPhase23jApprovalPhrase(),
    proposalCount: 65,
  }), /locked to CPB/)

  assert.throws(() => assertPhase23jProductionApplyLock({
    targetEventId: CPB_EVENT_ID,
    manifestSha256: PHASE_23J_MANIFEST_SHA256,
    approvalPhrase: expectedPhase23gApprovalPhrase(),
    proposalCount: 65,
  }), /Exact Phase 23J production approval phrase/)

  assert.throws(() => assertPhase23jProductionApplyLock({
    targetEventId: CPB_EVENT_ID,
    manifestSha256: PHASE_23J_MANIFEST_SHA256,
    approvalPhrase: expectedPhase23jApprovalPhrase(),
    proposalCount: 64,
  }), /expected exactly 65/)
})

test('Phase 23G rehearsal script is CODEX_TEST-only and does not write Operations, tickets, or check-ins', () => {
  const script = readFileSync('scripts/admin/runCodexApplyRehearsal.mjs', 'utf8')
  assert.match(script, /CODEX_TEST_EVENT_ID/)
  assert.match(script, /CPB_EVENT_ID/)
  assert.match(script, /cpbDenied/)
  assert.doesNotMatch(script, /operationsLedger/)
  assert.doesNotMatch(script, /checkedIn:\s*true/)
  assert.doesNotMatch(script, /ticketCode:\s*'[^']+'/)
})

test('Phase 23J production script is locked to manifest approval, backups, audit logs, and registration finance only', () => {
  const script = readFileSync('scripts/admin/runCpbProductionApply.mjs', 'utf8')

  assert.match(script, /CPB_PRODUCTION_APPLY_APPROVAL/)
  assert.match(script, /assertPhase23jProductionApplyLock/)
  assert.match(script, /backup_private\.json/)
  assert.match(script, /rawAuditValidated/)
  assert.match(script, /registration\.finance-update/)
  assert.match(script, /updateMask/)
  assert.doesNotMatch(script, /operationsLedger/)
  assert.doesNotMatch(script, /checkedIn:\s*true/)
  assert.doesNotMatch(script, /ticketCode:\s*'[^']+'/)
  assert.doesNotMatch(script, /\{\s*delete:/)
})
