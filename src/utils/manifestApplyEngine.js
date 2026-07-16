export const CODEX_TEST_EVENT_ID = 'xPfa0b3KZyLSDnAD2uGI'
export const CPB_EVENT_ID = 'zhaPxi31cpqLAW0cuS20'
export const PHASE_23G_MANIFEST_SHA256 = 'FB3A216BB8F73B3113758AE1335A01CEAA6EAB079281E4DEE7142FBA4911FA80'

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
  return `I APPROVE CPB MANIFEST ${manifestSha256} FOR PHASE 23G APPLY REHEARSAL ONLY`
}

export function assertPhase23gApplyLock({
  targetEventId,
  manifestSha256,
  approvalPhrase,
  rehearsalOnly = true,
} = {}) {
  if (targetEventId === CPB_EVENT_ID) throw new Error('CPB is denied for Phase 23G apply rehearsal.')
  if (targetEventId !== CODEX_TEST_EVENT_ID) throw new Error('Phase 23G apply rehearsal is locked to CODEX_TEST.')
  if (manifestSha256 !== PHASE_23G_MANIFEST_SHA256) throw new Error('Manifest hash mismatch.')
  if (approvalPhrase !== expectedPhase23gApprovalPhrase(manifestSha256)) throw new Error('Exact Phase 23G rehearsal approval phrase is required.')
  if (rehearsalOnly !== true) throw new Error('Phase 23G supports rehearsal only; production apply is not enabled.')
  return true
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
