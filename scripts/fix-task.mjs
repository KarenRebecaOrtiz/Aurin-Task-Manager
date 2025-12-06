import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';

// Load env vars
config({ path: '.env.local' });

// Initialize if not already
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = getFirestore();

async function fixTask() {
  const taskRef = db.collection('tasks').doc('IqCyFCVvaoQPGM062jsG');
  await taskRef.update({
    clientId: 'LIBCSBfUHRFh2uPv47Gd', // Correct Aurin client ID
    updatedAt: new Date().toISOString()
  });
  console.log('✅ Task updated successfully! clientId fixed to LIBCSBfUHRFh2uPv47Gd');
}

fixTask().catch(console.error);
