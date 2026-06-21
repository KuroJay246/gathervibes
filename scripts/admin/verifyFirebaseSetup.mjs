/* global process, console */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = 'gathervibeshub';

async function main() {
  let app;
  try {
    app = initializeApp({
      credential: applicationDefault(),
      projectId: projectId,
    });
  } catch (error) {
    console.error('Error: Failed to initialize Firebase Admin SDK.');
    console.error(error.message);
    process.exit(1);
  }

  if (app.options.projectId !== projectId) {
    console.error(`Error: Project ID mismatch. Expected ${projectId}, got ${app.options.projectId}`);
    process.exit(1);
  }

  console.log(`Using Firebase project: ${projectId}`);
  const db = getFirestore(app);
  
  try {
    const accessControlRef = db.collection('settings').doc('accessControl');
    const doc = await accessControlRef.get();
    
    if (!doc.exists) {
      console.error('Error: settings/accessControl does not exist.');
      process.exit(1);
    }
    
    const data = doc.data();
    if (!Array.isArray(data.approvedEmails)) {
      console.error('Error: approvedEmails is not an array.');
      process.exit(1);
    }
    
    if (data.approvedEmails.length === 0) {
      console.error('Error: approvedEmails is empty.');
      process.exit(1);
    }

    const uppercaseEmails = data.approvedEmails.filter(email => email !== email.toLowerCase());
    if (uppercaseEmails.length > 0) {
      console.error('Error: approvedEmails contains uppercase characters.');
      process.exit(1);
    }

    console.log(`Verified: settings/accessControl exists with ${data.approvedEmails.length} lowercase emails.`);
    console.log('NOTE: This script uses admin credentials. Live client testing is still required to prove Firestore Security Rules work correctly.');
  } catch (error) {
    console.error('Verification failed:', error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error.message);
  process.exit(1);
});
