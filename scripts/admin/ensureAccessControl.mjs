/* global process, console */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { PROTECTED_OWNER_EMAIL } from '../../src/config/protectedOwner.js';

const projectId = 'gathervibeshub';
const DEFAULT_ACCESS_TYPE = 'admin';
const DEFAULT_STATUS = 'active';

async function main() {
  const adminEmailsRaw = process.env.ADMIN_EMAILS;
  if (!adminEmailsRaw) {
    console.error('Error: ADMIN_EMAILS environment variable is missing.');
    process.exit(1);
  }

  const newEmails = adminEmailsRaw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);

  if (newEmails.length === 0) {
    console.error('Error: No valid emails provided in ADMIN_EMAILS.');
    process.exit(1);
  }

  const replace = process.argv.includes('--replace');

  let app;
  try {
    app = initializeApp({
      credential: applicationDefault(),
      projectId: projectId,
    });
  } catch (error) {
    console.error('Error: Failed to initialize Firebase Admin SDK. Credentials might be missing.');
    console.error(error.message);
    process.exit(1);
  }

  if (app.options.projectId !== projectId) {
    console.error(`Error: Project ID mismatch. Expected ${projectId}, got ${app.options.projectId}`);
    process.exit(1);
  }

  console.log(`Using Firebase project: ${projectId}`);
  
  const db = getFirestore(app);
  const accessControlRef = db.collection('settings').doc('accessControl');

  let existingEmails = [];
  let existingRolesByEmail = {};
  let existingOrganizerRecords = {};
  try {
    const doc = await accessControlRef.get();
    if (doc.exists) {
      const data = doc.data();
      if (Array.isArray(data.approvedEmails)) {
        existingEmails = data.approvedEmails;
      }
      if (data.rolesByEmail && typeof data.rolesByEmail === 'object') {
        existingRolesByEmail = data.rolesByEmail;
      }
      if (data.approvedOrganizerRecords && typeof data.approvedOrganizerRecords === 'object') {
        existingOrganizerRecords = data.approvedOrganizerRecords;
      }
    }
  } catch (error) {
    console.error('Error: Failed to read settings/accessControl document.');
    console.error(error.message);
    process.exit(1);
  }

  const mergedEmails = replace 
    ? [...new Set(newEmails)] 
    : [...new Set([...existingEmails.map((email) => String(email).trim().toLowerCase()), ...newEmails])];

  const now = new Date();
  const rolesByEmail = replace ? {} : { ...existingRolesByEmail };
  const approvedOrganizerRecords = replace ? {} : { ...existingOrganizerRecords };

  for (const email of mergedEmails) {
    if (email === PROTECTED_OWNER_EMAIL) continue;
    rolesByEmail[email] = rolesByEmail[email] || DEFAULT_ACCESS_TYPE;
    approvedOrganizerRecords[email] = {
      accessType: rolesByEmail[email] || DEFAULT_ACCESS_TYPE,
      status: approvedOrganizerRecords[email]?.status || DEFAULT_STATUS,
      addedAt: approvedOrganizerRecords[email]?.addedAt || now,
      updatedAt: now,
    };
  }

  try {
    await accessControlRef.set({
      approvedEmails: mergedEmails,
      rolesByEmail,
      approvedOrganizerRecords,
      updatedAt: now,
    }, { merge: true });
  } catch (error) {
    console.error('Error: Failed to write to settings/accessControl.');
    console.error(error.message);
    process.exit(1);
  }

  try {
    const verifyDoc = await accessControlRef.get();
    if (!verifyDoc.exists || !Array.isArray(verifyDoc.data().approvedEmails)) {
      throw new Error('Verification failed: Document or array is missing after write.');
    }
    console.log(`Success! Document ${existingEmails.length > 0 ? 'updated' : 'created'}.`);
    const verifyData = verifyDoc.data();
    const missingMetadata = verifyData.approvedEmails.filter((email) => email !== PROTECTED_OWNER_EMAIL && !verifyData.approvedOrganizerRecords?.[email]);
    if (missingMetadata.length > 0) {
      throw new Error(`Verification failed: Missing organizer metadata for ${missingMetadata.join(', ')}`);
    }
    console.log(`Total approved emails configured: ${verifyData.approvedEmails.length}`);
  } catch (error) {
    console.error('Error: Read-back verification failed.');
    console.error(error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error.message);
  process.exit(1);
});
