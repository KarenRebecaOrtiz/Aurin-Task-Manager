// src/lib/firebase-admin.ts
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import type { ServiceAccount } from 'firebase-admin/app';

let storage;
let bucket;
let adminDb: ReturnType<typeof getFirestore> | null = null;

export async function initializeFirebase() {
  try {
    let app;
    if (!getApps().length) {
      if (!process.env.GCP_PRIVATE_KEY || !process.env.GCP_PROJECT_ID || !process.env.GCP_SERVICE_ACCOUNT_EMAIL) {
        throw new Error('[Firebase Admin] Missing required environment variables: GCP_PRIVATE_KEY, GCP_PROJECT_ID, GCP_SERVICE_ACCOUNT_EMAIL');
      }

      // Usar variables de entorno para credenciales
      const serviceAccount: ServiceAccount = {
        projectId: process.env.GCP_PROJECT_ID,
        clientEmail: process.env.GCP_SERVICE_ACCOUNT_EMAIL,
        privateKey: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };
      console.log('[Firebase Admin] Using environment variables for credentials');

      console.log('[Firebase Admin] Initializing with projectId:', serviceAccount.projectId);

      app = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'aurin-plattform.firebasestorage.app',
      }, 'aurin-platform-app');

      console.log('[Firebase Admin] Firebase app initialized successfully');
    } else {
      console.log('[Firebase Admin] Reusing existing Firebase app');
      app = getApps().find(app => app.name === 'aurin-platform-app') || getApps()[0];
    }

    storage = getStorage(app);
    bucket = storage.bucket();

    // Try to verify bucket, but don't fail initialization if it doesn't work
    try {
      const [exists] = await bucket.exists();
      if (exists) {
        console.log('[Firebase Admin] Bucket verified:', bucket.name);
      } else {
        console.warn('[Firebase Admin] Bucket does not exist, but continuing initialization');
      }
    } catch (bucketError) {
      console.warn('[Firebase Admin] Could not verify bucket (permissions may be missing), but continuing initialization:', bucketError instanceof Error ? bucketError.message : bucketError);
    }

    // Initialize Firestore Admin
    adminDb = getFirestore(app);
    console.log('[Firebase Admin] Firestore initialized successfully');

    return { storage, bucket, adminDb };
  } catch (error) {
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      code: 'code' in error ? error.code : 'Unknown code',
    } : {
      message: String(error),
      stack: 'Unknown stack',
      code: 'Unknown code',
    };
    console.error('[Firebase Admin] Failed to initialize Firebase:', errorDetails);
    throw error;
  }
}

// Inicialización opcional al cargar el módulo
initializeFirebase().catch((error) => {
  console.error('[Firebase Admin] Initialization failed on startup:', error);
});

// Helper function to get admin db (lazy initialization)
export function getAdminDb() {
  if (!adminDb) {
    // Try to get existing app
    let app = getApps().find(app => app.name === 'aurin-platform-app') || getApps()[0];

    // If no app exists, initialize synchronously with environment variables
    if (!app) {
      console.log('[Firebase Admin] No app found, initializing synchronously...');

      // Use environment variables for credentials
      if (!process.env.GCP_PRIVATE_KEY || !process.env.GCP_PROJECT_ID || !process.env.GCP_SERVICE_ACCOUNT_EMAIL) {
        throw new Error('[Firebase Admin] Missing required environment variables: GCP_PRIVATE_KEY, GCP_PROJECT_ID, GCP_SERVICE_ACCOUNT_EMAIL');
      }

      const serviceAccount: ServiceAccount = {
        projectId: process.env.GCP_PROJECT_ID,
        clientEmail: process.env.GCP_SERVICE_ACCOUNT_EMAIL,
        privateKey: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };

      console.log('[Firebase Admin] Initializing with projectId:', serviceAccount.projectId);

      app = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'aurin-plattform.firebasestorage.app',
      }, 'aurin-platform-app');

      console.log('[Firebase Admin] Firebase app initialized successfully (sync)');
    }

    adminDb = getFirestore(app);
    console.log('[Firebase Admin] Firestore Admin DB initialized');
  }
  return adminDb;
}

export { storage, bucket, adminDb };