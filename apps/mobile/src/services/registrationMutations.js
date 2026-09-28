import { collection, doc, serverTimestamp, writeBatch } from '@react-native-firebase/firestore'
import { firestore } from '@/lib/firebase'
import { normalizePaymentStatus } from '@gsv/contracts/paymentStatus'

export const REGISTRATION_FIELDS = ['fullName', 'buyerName', 'attendeeNames', 'email', 'phone', 'groupName', 'personsAttending', 'paymentStatus', 'priceTier', 'ticketPrice', 'amountDue', 'amountPaid', 'balanceDue', 'paymentMethod', 'paymentReference', 'notes']

function normalizeAttendees(value) { return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : String(value || '').split(/\n|,|;/).map((item) => item.trim()).filter(Boolean) }
function normalized(values, eventId) {
  const fullName = String(values.fullName || '').trim()
  const personsAttending = Number(values.personsAttending || 1)
  if (!fullName) throw new Error('Enter the registration name.')
  if (!Number.isInteger(personsAttending) || personsAttending < 1 || personsAttending > 100) throw new Error('Persons attending must be between 1 and 100.')
  return {
    eventId, fullName, buyerName: String(values.buyerName || '').trim() || null, attendeeNames: normalizeAttendees(values.attendeeNames), email: String(values.email || '').trim().toLowerCase() || null, phone: String(values.phone || '').trim() || null, groupName: String(values.groupName || '').trim() || null, personsAttending, paymentStatus: normalizePaymentStatus(values.paymentStatus), priceTier: String(values.priceTier || '').trim() || null, ticketPrice: values.ticketPrice === '' ? null : Number(values.ticketPrice), amountDue: values.amountDue === '' ? null : Number(values.amountDue), amountPaid: values.amountPaid === '' ? 0 : Number(values.amountPaid), balanceDue: values.balanceDue === '' ? null : Number(values.balanceDue), paymentMethod: String(values.paymentMethod || 'unknown').trim() || 'unknown', paymentReference: String(values.paymentReference || '').trim() || null, notes: String(values.notes || '').trim(),
  }
}
function audit(eventId, action, targetId, user) { const reference = doc(collection(firestore, 'auditLogs')); return { reference, data: { eventId, action, targetType: 'registration', targetId, performedBy: user?.email || user?.uid || 'mobile-user', createdAt: serverTimestamp() } } }
export async function createNativeRegistration(values, eventId, user) { const reference = doc(collection(firestore, 'registrations')); const payload = normalized(values, eventId); const log = audit(eventId, 'registration.create', reference.id, user); const batch = writeBatch(firestore); batch.set(reference, { registrationId: reference.id, ...payload, ticketStatus: 'no-ticket-assigned', ticketCode: null, ticketAssignedAt: null, ticketAssignedBy: null, checkedIn: false, checkInTime: null, checkedInBy: null, attendanceRecordType: 'none', createdAt: serverTimestamp(), updatedAt: serverTimestamp(), source: 'manual' }); batch.set(log.reference, log.data); await batch.commit(); return reference.id }
export async function updateNativeRegistration(registration, values, user) { if (!registration?.registrationId || !registration?.eventId) throw new Error('Registration is required.'); const payload = normalized(values, registration.eventId); const reference = doc(firestore, 'registrations', registration.registrationId); const log = audit(registration.eventId, 'registration.update', registration.registrationId, user); const batch = writeBatch(firestore); batch.update(reference, { ...payload, updatedAt: serverTimestamp() }); batch.set(log.reference, log.data); await batch.commit() }
