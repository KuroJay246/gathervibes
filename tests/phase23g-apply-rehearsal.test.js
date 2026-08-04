import { readFileSync } from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  APPLY_SUPPORTED_FIELDS,
  CODEX_DEMO_REHEARSAL_EVENT_ID,
  PHASE_23G_MANIFEST_SHA256,
  PHASE_23J_MANIFEST_SHA256,
  assertPhase23gApplyLock,
  assertRealEventProductionApplyApproval,
  buildRegistrationApplyPlan,
  expectedPhase23gApprovalPhrase,
  expectedRealEventApprovalPhrase,
} from '../src/utils/manifestApplyEngine.js'

test('Phase 23G apply lock allows CODEX_DEMO rehearsal only with exact manifest approval phrase', () => {
  assert.equal(assertPhase23gApplyLock({
    targetEventId: CODEX_DEMO_REHEARSAL_EVENT_ID,
    manifestSha256: PHASE_23G_MANIFEST_SHA256,
    approvalPhrase: expectedPhase23gApprovalPhrase(),
    rehearsalOnly: true,
  }), true)

  assert.throws(() => assertPhase23gApplyLock({
    targetEventId: 'real-event-id',
    manifestSha256: PHASE_23G_MANIFEST_SHA256,
    approvalPhrase: expectedPhase23gApprovalPhrase(),
    rehearsalOnly: true,
  }), /locked to CODEX_DEMO/)

  assert.throws(() => assertPhase23gApplyLock({
    targetEventId: CODEX_DEMO_REHEARSAL_EVENT_ID,
    manifestSha256: '2A98AB506F1846294944DA49A57CD2E898F6B5D97E4E03C412FD89683C92C409',
    approvalPhrase: expectedPhase23gApprovalPhrase(),
    rehearsalOnly: true,
  }), /Manifest hash mismatch/)
})

test('Phase 23G apply plan supports only registration finance fields and audit metadata', () => {
  const plan = buildRegistrationApplyPlan({
    targetEventId: CODEX_DEMO_REHEARSAL_EVENT_ID,
    registration: {
      registrationId: 'qa-reg',
      eventId: CODEX_DEMO_REHEARSAL_EVENT_ID,
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
    targetEventId: CODEX_DEMO_REHEARSAL_EVENT_ID,
    registration: { registrationId: 'qa-reg', eventId: 'real-event-id' },
    proposal: { changedFields: ['amountPaid'], proposedValues: { amountPaid: 25 } },
  }), /event scope mismatch/)

  assert.throws(() => buildRegistrationApplyPlan({
    targetEventId: CODEX_DEMO_REHEARSAL_EVENT_ID,
    registration: { registrationId: 'qa-reg', eventId: CODEX_DEMO_REHEARSAL_EVENT_ID },
    proposal: { changedFields: ['checkedIn'], proposedValues: { checkedIn: true } },
  }), /Unsupported proposal fields/)

  assert.equal(APPLY_SUPPORTED_FIELDS.includes('paymentReference'), false)
  assert.equal(APPLY_SUPPORTED_FIELDS.includes('checkedIn'), false)
})

test('real-event production apply approval is not CPB-specific and requires exact approval plus a positive proposal count', () => {
  assert.deepEqual(assertRealEventProductionApplyApproval({
    targetEventId: 'real-event-id',
    manifestSha256: PHASE_23J_MANIFEST_SHA256,
    approvalPhrase: expectedRealEventApprovalPhrase({ targetEventId: 'real-event-id' }),
    dryRun: false,
    proposalCount: 1,
  }), { approved: true, dryRun: false })

  assert.throws(() => assertRealEventProductionApplyApproval({
    targetEventId: CODEX_DEMO_REHEARSAL_EVENT_ID,
    manifestSha256: PHASE_23J_MANIFEST_SHA256,
    approvalPhrase: expectedRealEventApprovalPhrase({ targetEventId: 'real-event-id' }),
    proposalCount: 1,
  }), /real event target/)

  assert.throws(() => assertRealEventProductionApplyApproval({
    targetEventId: 'real-event-id',
    manifestSha256: PHASE_23J_MANIFEST_SHA256,
    approvalPhrase: expectedPhase23gApprovalPhrase(),
    proposalCount: 1,
  }), /Exact real-event production approval phrase/)

  assert.throws(() => assertRealEventProductionApplyApproval({
    targetEventId: 'real-event-id',
    manifestSha256: PHASE_23J_MANIFEST_SHA256,
    approvalPhrase: expectedRealEventApprovalPhrase({ targetEventId: 'real-event-id' }),
    proposalCount: 0,
  }), /positive proposal count/)
})

test('Phase 23G rehearsal script is CODEX_DEMO-only and does not write Operations, tickets, or check-ins', () => {
  const script = readFileSync('scripts/admin/runCodexApplyRehearsal.mjs', 'utf8')
  assert.match(script, /CODEX_DEMO_REHEARSAL_EVENT_ID/)
  assert.match(script, /realEventDenied/)
  assert.doesNotMatch(script, /CPB_EVENT_ID|cpbDenied|cpbWrites/)
  assert.doesNotMatch(script, /operationsLedger/)
  assert.doesNotMatch(script, /checkedIn:\s*true/)
  assert.doesNotMatch(script, /ticketCode:\s*'[^']+'/)
})

test('package scripts do not expose a CPB-specific production apply path', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  assert.equal(pkg.scripts['admin:cpb-production-apply'], undefined)
})
