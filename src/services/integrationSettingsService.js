import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { isProtectedOwnerUser } from '../config/protectedOwner'

export const DEFAULT_INTEGRATIONS = {
  googleFormsReceiver: {
    name: 'Google Forms Receiver',
    status: 'Backend Foundation Ready',
    setupRequirements: 'Deploy the signed receiver backend, configure the form source, and pass a live intake test before automatic intake can be marked connected.',
    connectionError: 'Receiver deployment and live form authorization are still required.',
  },
  googleSheets: {
    name: 'Google Sheets',
    status: 'Authorization Required',
    setupRequirements: 'Manual CSV/Excel import remains available. The backend Sheets OAuth and preview foundation is ready, but Google Cloud authorization is still required.',
    connectionError: 'No authorized Google Sheets connection is configured.',
  },
  gmail: {
    name: 'Gmail',
    status: 'Authorization Required',
    setupRequirements: 'A secure backend/OAuth flow now exists in source, but Google Cloud authorization and mailbox consent are still required. Message Builder remains copy-only until connected.',
    connectionError: 'No authorized Gmail connection is configured.',
  },
  outlook: {
    name: 'Microsoft Outlook',
    status: 'Authorization Required',
    setupRequirements: 'A secure Microsoft Graph backend foundation now exists in source, but Entra tenant authorization and mailbox consent are still required.',
    connectionError: 'No authorized Microsoft Outlook connection is configured.',
  },
  messageBuilder: {
    name: 'Message Builder',
    status: 'Copy-only',
    setupRequirements: 'Create, preview, personalize, and copy messages for external sending. No delivery status is tracked.',
    connectionError: '',
  },
  pdf: {
    name: 'PDF',
    status: 'Text/table PDFs only',
    setupRequirements: 'Readable text/table PDFs can be used where supported. Scanned PDFs and OCR are not supported.',
    connectionError: '',
  },
}

function requireDb() {
  if (!db) throw new Error('Firebase is not configured.')
  return db
}

function actor(user) {
  return user?.email || user?.uid || 'unknown'
}

export function subscribeIntegrationSettings(onData, onError) {
  return onSnapshot(doc(requireDb(), 'settings', 'integrations'), (snapshot) => {
    const data = snapshot.exists() ? snapshot.data() : {}
    onData({
      integrations: { ...DEFAULT_INTEGRATIONS, ...(data.integrations || {}) },
      updatedAt: data.updatedAt || null,
      updatedBy: data.updatedBy || '',
    })
  }, onError)
}

export async function recordIntegrationCheck(integrationId, user, result) {
  if (!isProtectedOwnerUser(user)) throw new Error('Only the Protected Owner can change app-wide integration settings.')
  const base = DEFAULT_INTEGRATIONS[integrationId]
  if (!base) throw new Error('Unknown integration.')
  const safeStatus = result?.status || base.status
  const safeError = result?.connectionError || base.connectionError || ''
  await setDoc(doc(requireDb(), 'settings', 'integrations'), {
    integrations: {
      [integrationId]: {
        ...base,
        status: safeStatus,
        connectionError: safeError,
        lastCheckedAt: serverTimestamp(),
        lastChangedAt: serverTimestamp(),
        lastChangedBy: actor(user),
      },
    },
    updatedAt: serverTimestamp(),
    updatedBy: actor(user),
  }, { merge: true })
  await setDoc(doc(collection(requireDb(), 'settings', 'integrations', 'history')), {
    integrationId,
    action: 'integration.check',
    status: safeStatus,
    changedAt: serverTimestamp(),
    changedBy: actor(user),
    changedByUid: user?.uid || '',
    details: safeError || 'Status checked without changing connection state.',
  })
}
