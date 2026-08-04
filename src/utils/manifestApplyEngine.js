import { CODEX_DEMO_EVENT_ID } from './demoEvent.js'

export const CODEX_DEMO_REHEARSAL_EVENT_ID = CODEX_DEMO_EVENT_ID
export const PHASE_23G_MANIFEST_SHA256 = 'D690D6B84A272F5189098F57E4643FAF6F5E628F98519B74369593ED31DE0828'
export const PHASE_23J_MANIFEST_SHA256 = PHASE_23G_MANIFEST_SHA256

export const APPLY_SUPPORTED_FIELDS = [
  'ticketPrice',
  'amountDue',
  'amountPaid',
  'balanceDue',
  'paymentStatus',
  'priceTier',
  'paymentMethod',
]

export function expectedPhase23gApprovalPhrase(manifestSha256 = PHASE_23G_MANIFEST_SHA256) {
  return `I APPROVE TEST MANIFEST ${manifestSha256} FOR CODEX_DEMO APPLY REHEARSAL ONLY`
}

export function expectedRealEventApprovalPhrase({ manifestSha256 = PHASE_23J_MANIFEST_SHA256, targetEventId } = {}) {
  if (!targetEventId || targetEventId === CODEX_DEMO_REHEARSAL_EVENT_ID) return ''
  return `I APPROVE REAL EVENT MANIFEST ${manifestSha256} FOR ${targetEventId} PRODUCTION APPLY`
}

export function assertPhase23gApplyLock({
  targetEventId,
  manifestSha256,
  approvalPhrase,
  rehearsalOnly = true,
} = {}) {
  if (targetEventId !== CODEX_DEMO_REHEARSAL_EVENT_ID) throw new Error('Apply rehearsal is locked to CODEX_DEMO. Real events use standard approved-organizer workflows and separately approved production corrections.')
  if (manifestSha256 !== PHASE_23G_MANIFEST_SHA256) throw new Error('Manifest hash mismatch.')
  if (approvalPhrase !== expectedPhase23gApprovalPhrase(manifestSha256)) throw new Error('Exact Phase 23G rehearsal approval phrase is required.')
  if (rehearsalOnly !== true) throw new Error('Phase 23G supports rehearsal only; production apply is not enabled.')
  return true
}

export function assertRealEventProductionApplyApproval({
  targetEventId,
  manifestSha256,
  approvalPhrase,
  dryRun = true,
  proposalCount,
} = {}) {
  if (!targetEventId) throw new Error('Production apply requires a target event.')
  if (targetEventId === CODEX_DEMO_REHEARSAL_EVENT_ID) throw new Error('Production apply requires a real event target, not CODEX_DEMO.')
  if (manifestSha256 !== PHASE_23J_MANIFEST_SHA256) throw new Error('Manifest hash mismatch.')
  if (approvalPhrase !== expectedRealEventApprovalPhrase({ manifestSha256, targetEventId })) throw new Error('Exact real-event production approval phrase is required.')
  if (!Number.isInteger(proposalCount) || proposalCount <= 0) throw new Error('Production apply requires a positive proposal count.')
  return { approved: true, dryRun }
}

export function buildRegistrationApplyPlan({ registration, proposal, targetEventId }) {
  if (!registration?.registrationId) throw new Error('Registration is required.')
  if (registration.eventId !== targetEventId) throw new Error('Registration event scope mismatch.')
  const changedFields = proposal?.changedFields || []
  const unsupported = changedFields.filter((field) => !APPLY_SUPPORTED_FIELDS.includes(field))
  if (unsupported.length) throw new Error(`Unsupported proposal fields: ${unsupported.join(', ')}`)

  const updates = {}
  changedFields.forEach((field) => {
    updates[field] = proposal.proposedValues[field]
  })

  return {
    registrationId: registration.registrationId,
    eventId: targetEventId,
    changedFields,
    before: Object.fromEntries(changedFields.map((field) => [field, registration[field] ?? null])),
    after: updates,
    audit: {
      action: 'registration.finance-update',
      targetType: 'registration',
      targetId: registration.registrationId,
      details: {
        phase: '23G',
        rehearsalOnly: true,
        manifestSha256: PHASE_23G_MANIFEST_SHA256,
        changedFields: changedFields.join(','),
      },
    },
  }
}
