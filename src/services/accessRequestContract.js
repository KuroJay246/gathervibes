export const ACCESS_REQUEST_CONTRACT_VERSION = 'phase-17f-b-disabled-contract'

export const ACCESS_REQUEST_NOT_LIVE_CODE = 'ACCESS_WORKFLOW_NOT_LIVE'

export const ACCESS_REQUEST_ALLOWED_STATUSES = Object.freeze([
  'pending',
  'approved',
  'declined',
  'revoked',
])

export const ACCESS_REQUEST_FIELD_NAMES = Object.freeze([
  'requesterUid',
  'requesterEmail',
  'requestedRole',
  'requestedEventId',
  'status',
  'createdAt',
  'updatedAt',
  'reviewedAt',
  'reviewedBy',
  'notes',
])

export const ACCESS_REQUEST_AUDIT_ACTIONS = Object.freeze([
  'access.request.create',
  'access.request.approve',
  'access.request.decline',
  'access.request.revoke',
  'staff.profile.create',
  'staff.profile.update',
  'staff.assignment.create',
  'staff.assignment.update',
  'staff.assignment.revoke',
])

export const ACCESS_REQUEST_SECURITY_BOUNDARIES = Object.freeze([
  'approvedEmails remains admin-only',
  'requesters cannot self-approve or self-revoke',
  'requesters cannot create staffProfiles',
  'requesters cannot create staffAssignments',
  'auditLogs remain append-only',
  'CPB remains protected and off-limits for QA',
  'no Firestore rules deploy in this phase',
  'no Firestore index deploy in this phase',
])

export const ACCESS_REQUEST_NOT_LIVE_MESSAGE =
  'Phase 17F-B is a disabled contract only. No live access workflow is available.'

export function buildNotLiveAccessWorkflowResult(operation) {
  return Object.freeze({
    ok: false,
    live: false,
    code: ACCESS_REQUEST_NOT_LIVE_CODE,
    operation,
    message: `${ACCESS_REQUEST_NOT_LIVE_MESSAGE} Attempted operation: ${operation}.`,
  })
}

export function createAccessWorkflowNotLiveError(operation) {
  const error = new Error(buildNotLiveAccessWorkflowResult(operation).message)
  error.code = ACCESS_REQUEST_NOT_LIVE_CODE
  error.operation = operation
  return error
}

async function disabledWriteOperation(operation) {
  throw createAccessWorkflowNotLiveError(operation)
}

export async function submitAccessRequest() {
  return disabledWriteOperation('submitAccessRequest')
}

export async function approveAccessRequest() {
  return disabledWriteOperation('approveAccessRequest')
}

export async function declineAccessRequest() {
  return disabledWriteOperation('declineAccessRequest')
}

export async function revokeAccessRequest() {
  return disabledWriteOperation('revokeAccessRequest')
}

export async function createStaffProfileForAccessRequest() {
  return disabledWriteOperation('createStaffProfileForAccessRequest')
}

export async function upsertStaffAssignmentForAccessRequest() {
  return disabledWriteOperation('upsertStaffAssignmentForAccessRequest')
}
