import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { isProtectedOwnerUser } from '../config/protectedOwner'

export const DEFAULT_INTEGRATIONS = {
  googleFormsReceiver: {
    name: 'Google Forms Receiver',
    status: 'Packaged but Not Deployed',
    setupRequirements: 'Deploy the signed receiver backend, configure the form source, and pass a live intake test before automatic intake can be marked connected.',
    connectionError: 'Receiver backend is not deployed/configured in production.',
  },
  googleSheets: {
    name: 'Google Sheets',
    status: 'Manual CSV/Excel Workflow',
    setupRequirements: 'Use downloaded CSV or Excel files in Import Center. No OAuth or live sync is configured.',
    connectionError: '',
  },
  gmail: {
    name: 'Gmail',
    status: 'Disconnected',
    setupRequirements: 'A secure backend/OAuth flow is required before the app can send mail. Message Builder remains copy-only.',
    connectionError: 'No secure Gmail connection is configured.',
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
