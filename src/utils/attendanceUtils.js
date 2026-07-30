export const ATTENDANCE_RECORD_TYPES = [
  'none',
  'scanner-confirmed',
  'manual-live',
  'organizer-confirmed-historical',
]

export const ATTENDANCE_RECORD_LABELS = {
  none: 'No attendance record',
  'scanner-confirmed': 'Scanner-confirmed check-in',
  'manual-live': 'Manually confirmed live check-in',
  'organizer-confirmed-historical': 'Organizer-confirmed historical attendance',
}

export function normalizeAttendanceRecordType(value) {
  const normalized = String(value || '').trim().toLowerCase()
  return ATTENDANCE_RECORD_TYPES.includes(normalized) ? normalized : 'none'
}

export function deriveAttendanceRecordType(registration = {}) {
  const explicitType = normalizeAttendanceRecordType(registration.attendanceRecordType)
  if (explicitType !== 'none') return explicitType
  if (registration.checkedIn) return 'scanner-confirmed'
  return 'none'
}

export function attendanceRecordLabel(registration = {}) {
  return ATTENDANCE_RECORD_LABELS[deriveAttendanceRecordType(registration)]
}

export function attendanceRecordHelp(registration = {}) {
  const type = deriveAttendanceRecordType(registration)
  if (type === 'organizer-confirmed-historical') {
    return 'This is organizer-confirmed historical attendance, not a QR scan or live system check-in.'
  }
  if (type === 'manual-live') {
    return 'This is a manually confirmed live check-in, not a QR scan.'
  }
  if (type === 'scanner-confirmed') {
    return 'This attendance was recorded through the live check-in workflow.'
  }
  return 'No scanner, manual live, or historical attendance evidence is recorded.'
}

export function historicalAttendancePayload(note = '', performedBy = '') {
  return {
    attendanceRecordType: 'organizer-confirmed-historical',
    attendanceConfirmedBy: performedBy || 'unknown-admin',
    attendanceEvidenceNote: String(note || '').trim(),
  }
}
