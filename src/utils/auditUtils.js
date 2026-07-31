export function safeAuditChanges(before = {}, after = {}, fields = []) {
  return fields
    .filter((field) => before?.[field] !== after?.[field])
    .map((field) => ({
      field,
      before: before?.[field] ?? null,
      after: after?.[field] ?? null,
    }))
}
