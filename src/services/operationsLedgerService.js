import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { createAuditLogWrite } from './auditService'
import { parseMoney } from '../utils/financeUtils'

export const LEDGER_ENTRY_TYPES = ['income', 'expense', 'adjustment', 'refund']
export const LEDGER_STATUSES = ['expected', 'received', 'paid', 'pending', 'cancelled']

function requireDatabase() {
  if (!db) throw new Error('Firebase is not configured')
  return db
}

function cleanText(value, fallback = '') {
  return String(value || fallback).trim()
}

function normalizeEntry(values = {}, eventId, existing = {}) {
  const amount = parseMoney(values.amount)
  return {
    eventId,
    entryType: LEDGER_ENTRY_TYPES.includes(values.entryType) ? values.entryType : 'income',
    category: cleanText(values.category, 'General').slice(0, 120),
    label: cleanText(values.label, 'Ledger entry').slice(0, 180),
    amount: amount ?? 0,
    paymentMethod: cleanText(values.paymentMethod || 'unknown').slice(0, 80),
    paymentReference: cleanText(values.paymentReference).slice(0, 180) || null,
    paidByOrPaidTo: cleanText(values.paidByOrPaidTo).slice(0, 180) || null,
    date: cleanText(values.date) || new Date().toISOString().slice(0, 10),
    status: LEDGER_STATUSES.includes(values.status) ? values.status : 'pending',
    notes: cleanText(values.notes).slice(0, 1000),
    createdBy: existing.createdBy || values.createdBy || null,
  }
}

export function subscribeToOperationsLedger(eventId, onRows, onError) {
  if (!eventId) return () => {}
  const firestore = requireDatabase()
  const ledgerQuery = query(
    collection(firestore, 'operationsLedger'),
    where('eventId', '==', eventId),
    orderBy('date', 'desc'),
  )

  return onSnapshot(
    ledgerQuery,
    (snapshot) => onRows(snapshot.docs.map((entryDocument) => ({
      ...entryDocument.data(),
      ledgerEntryId: entryDocument.data().ledgerEntryId || entryDocument.id,
    }))),
    onError,
  )
}

export async function createLedgerEntry(values, eventId, user) {
  const firestore = requireDatabase()
  const entryRef = doc(collection(firestore, 'operationsLedger'))
  const payload = normalizeEntry({ ...values, createdBy: user?.email || user?.uid || 'unknown-admin' }, eventId)
  const audit = createAuditLogWrite({
    eventId,
    action: 'operation.create',
    targetType: 'operation',
    targetId: entryRef.id,
    performedBy: user,
    details: { label: payload.label, entryType: payload.entryType, amount: payload.amount },
  })
  const batch = writeBatch(firestore)

  batch.set(entryRef, {
    ledgerEntryId: entryRef.id,
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  batch.set(audit.ref, audit.data)
  await batch.commit()
  return entryRef.id
}

export async function updateLedgerEntry(entry, values, user) {
  const firestore = requireDatabase()
  const payload = normalizeEntry(values, entry.eventId, entry)
  const entryRef = doc(firestore, 'operationsLedger', entry.ledgerEntryId)
  const audit = createAuditLogWrite({
    eventId: entry.eventId,
    action: 'operation.update',
    targetType: 'operation',
    targetId: entry.ledgerEntryId,
    performedBy: user,
    details: { label: payload.label, entryType: payload.entryType, amount: payload.amount },
  })
  const batch = writeBatch(firestore)

  batch.update(entryRef, {
    ...payload,
    updatedAt: serverTimestamp(),
  })
  batch.set(audit.ref, audit.data)
  await batch.commit()
}

export async function cancelLedgerEntry(entry, user) {
  const firestore = requireDatabase()
  const entryRef = doc(firestore, 'operationsLedger', entry.ledgerEntryId)
  const audit = createAuditLogWrite({
    eventId: entry.eventId,
    action: 'operation.cancel',
    targetType: 'operation',
    targetId: entry.ledgerEntryId,
    performedBy: user,
    details: { label: entry.label, entryType: entry.entryType, amount: entry.amount },
  })
  const batch = writeBatch(firestore)

  batch.update(entryRef, {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  })
  batch.set(audit.ref, audit.data)
  await batch.commit()
}

export function buildOperationsTotals(entries = []) {
  return entries.reduce((totals, entry) => {
    if (entry.status === 'cancelled') return totals
    const amount = Number(entry.amount) || 0
    if (entry.entryType === 'income') totals.income += amount
    if (entry.entryType === 'expense') totals.expenses += amount
    if (entry.entryType === 'refund') totals.refunds += amount
    if (entry.entryType === 'adjustment') totals.adjustments += amount
    totals.net = totals.income + totals.adjustments - totals.expenses - totals.refunds
    return totals
  }, {
    income: 0,
    expenses: 0,
    refunds: 0,
    adjustments: 0,
    net: 0,
  })
}
