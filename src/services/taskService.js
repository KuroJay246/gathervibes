import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { createAuditLogWrite, safeAuditChanges } from './auditService.js'
import { normalizeTask } from '../utils/taskWorkflow.js'
import { isTestEvent } from '../utils/eventPlanning.js'

function requireDatabase() {
  if (!db) throw new Error('Firebase is not configured')
  return db
}

function performedBy(user) {
  return user?.email || user?.uid || 'unknown-admin'
}

function cleanString(value, fallback = '') {
  return String(value ?? fallback).trim()
}

function taskRef(eventId, taskId) {
  return doc(requireDatabase(), 'events', eventId, 'tasks', taskId)
}

function tasksCollection(eventId) {
  return collection(requireDatabase(), 'events', eventId, 'tasks')
}

const TASK_AUDIT_FIELDS = [
  'title',
  'notes',
  'category',
  'dueDate',
  'followUpDate',
  'priority',
  'status',
  'responsibleType',
  'responsibleUserId',
  'responsibleLabel',
  'waitingOn',
  'blockerReason',
]

function sanitizeTaskPayload(values = {}, event, user, existingTask = null) {
  const normalized = normalizeTask(values)
  const status = normalized.status
  return {
    eventId: event.eventId,
    eventName: cleanString(event.eventName),
    isTestEvent: isTestEvent(event),
    title: normalized.title,
    notes: normalized.notes,
    category: normalized.category,
    dueDate: normalized.dueDate,
    followUpDate: normalized.followUpDate,
    priority: normalized.priority,
    status,
    responsibleType: normalized.responsibleType,
    responsibleUserId: normalized.responsibleUserId,
    responsibleLabel: normalized.responsibleLabel,
    waitingOn: status === 'Waiting on Someone' ? normalized.waitingOn : '',
    blockerReason: status === 'Blocked' ? normalized.blockerReason : '',
    createdAt: existingTask?.createdAt || serverTimestamp(),
    createdBy: cleanString(existingTask?.createdBy || performedBy(user)),
    updatedAt: serverTimestamp(),
    updatedBy: performedBy(user),
    completedAt: status === 'Completed' ? (existingTask?.completedAt || serverTimestamp()) : null,
    cancelledAt: status === 'Cancelled' ? (existingTask?.cancelledAt || serverTimestamp()) : null,
  }
}

function auditDetails(before, after, action) {
  return {
    taskTitle: after?.title || before?.title || 'Untitled task',
    action,
    changes: safeAuditChanges(before || {}, after || {}, TASK_AUDIT_FIELDS),
  }
}

export function subscribeToTasks(eventId, onTasks, onError) {
  if (!eventId) return () => {}
  return onSnapshot(
    tasksCollection(eventId),
    (snapshot) => onTasks(snapshot.docs.map((taskDocument) => normalizeTask({
      ...taskDocument.data(),
      taskId: taskDocument.id,
    }))),
    onError,
  )
}

export async function createTask(event, values, user) {
  const firestore = requireDatabase()
  const ref = doc(tasksCollection(event.eventId))
  const payload = {
    taskId: ref.id,
    ...sanitizeTaskPayload(values, event, user),
  }
  const audit = createAuditLogWrite({
    eventId: event.eventId,
    action: 'task.create',
    targetType: 'task',
    targetId: ref.id,
    performedBy: user,
    details: auditDetails(null, payload, 'created'),
  })
  const batch = writeBatch(firestore)
  batch.set(ref, payload)
  batch.set(audit.ref, audit.data)
  await batch.commit()
  return ref.id
}

export async function updateTask(event, existingTask, values, user, action = 'task.update') {
  const firestore = requireDatabase()
  const normalizedExisting = normalizeTask(existingTask)
  const ref = taskRef(event.eventId, normalizedExisting.taskId)
  const payload = sanitizeTaskPayload({ ...normalizedExisting, ...values, taskId: normalizedExisting.taskId }, event, user, normalizedExisting)
  const after = { ...normalizedExisting, ...payload, taskId: normalizedExisting.taskId }
  const audit = createAuditLogWrite({
    eventId: event.eventId,
    action,
    targetType: 'task',
    targetId: normalizedExisting.taskId,
    performedBy: user,
    details: auditDetails(normalizedExisting, after, action.replace('task.', '')),
  })
  const batch = writeBatch(firestore)
  batch.update(ref, payload)
  batch.set(audit.ref, audit.data)
  await batch.commit()
}

export async function updateTaskStatus(event, task, status, user) {
  const actionMap = {
    'In Progress': 'task.status',
    'Waiting on Someone': 'task.waiting',
    Blocked: 'task.blocked',
    Completed: 'task.completed',
    'Not Started': 'task.reopened',
    Cancelled: 'task.cancelled',
  }
  await updateTask(event, task, { status }, user, actionMap[status] || 'task.status')
}

export async function deleteTask(event, task, user) {
  const firestore = requireDatabase()
  const normalized = normalizeTask(task)
  const audit = createAuditLogWrite({
    eventId: event.eventId,
    action: 'task.delete',
    targetType: 'task',
    targetId: normalized.taskId,
    performedBy: user,
    details: auditDetails(normalized, null, 'deleted'),
  })
  const batch = writeBatch(firestore)
  batch.delete(taskRef(event.eventId, normalized.taskId))
  batch.set(audit.ref, audit.data)
  await batch.commit()
}

export async function saveTaskDraft(event, values, user, existingTask = null) {
  if (existingTask?.taskId) return updateTask(event, existingTask, values, user)
  return createTask(event, values, user)
}
