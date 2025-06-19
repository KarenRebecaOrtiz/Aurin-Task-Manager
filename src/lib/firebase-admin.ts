// src/lib/firebase-admin.ts
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { promises as fs } from 'fs';

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

let storage;
let bucket;

export async function initializeFirebase() {
  try {
    let app;
    if (!getApps().length) {
      if (!keyPath) {
        throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
      }
      await fs.access(keyPath, fs.constants.R_OK);
      const serviceAccount = JSON.parse(await fs.readFile(keyPath, 'utf8'));

      app = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'aurin-plattform',
      }, 'aurin-platform-app');
      console.log('[Firebase Admin] Firebase app initialized successfully');
    } else {
      console.log('[Firebase Admin] Reusing existing Firebase app');
      app = getApps().find(app => app.name === 'aurin-platform-app') || getApps()[0]; // Use named app or first app
    }

    storage = getStorage(app); // Specify the app instance
    bucket = storage.bucket();
    const [exists] = await bucket.exists();
    if (!exists) {
      throw new Error('Bucket does not exist or the service account lacks storage.buckets.get permission');
    }
    console.log('[Firebase Admin] Bucket verified:', bucket.name);
    return { storage, bucket };
  } catch (error: unknown) {
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      code: 'code' in error ? error.code : 'Unknown code', // Type-safe way to check for code property
    } : {
      message: String(error),
      stack: 'Unknown stack',
      code: 'Unknown code',
    };
    console.error('[Firebase Admin] Failed to initialize Firebase:', errorDetails);
    throw error;
  }
}

// Initial call to set up storage and bucket (optional, can be handled by routes)
initializeFirebase().catch((error) => {
  console.error('[Firebase Admin] Initialization failed on startup:', error);
});

export { storage, bucket }; // These will be undefined until initialized
