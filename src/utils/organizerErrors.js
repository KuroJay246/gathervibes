export function isPermissionDeniedError(error = {}) {
  const code = String(error?.code || '').toLowerCase()
  const message = String(error?.message || '').toLowerCase()
  return code.includes('permission-denied') || message.includes('permission') || message.includes('insufficient')
}

export function organizerSaveErrorMessage(error, noun = 'record') {
  if (isPermissionDeniedError(error)) {
    return `Could not save this ${noun}. Confirm you are signed in as an approved organizer, the correct Working Event is selected, and System QA shows Protected Owner = PASS.`
  }

  return `Could not save this ${noun}. Review the highlighted fields and try again.`
}
