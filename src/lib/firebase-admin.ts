// src/lib/firebase-admin.ts
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import type { ServiceAccount } from 'firebase-admin/app';

let storage;
let bucket;

export async function initializeFirebase() {
  try {
    let app;
    if (!getApps().length) {
      // Configuración de credenciales
      const serviceAccount: ServiceAccount = process.env.GCP_PRIVATE_KEY
        ? {
            projectId: process.env.GCP_PROJECT_ID!,
            clientEmail: process.env.GCP_SERVICE_ACCOUNT_EMAIL!,
            privateKey: process.env.GCP_PRIVATE_KEY!.replace(/\\n/g, '\n'), // Reemplaza \n para Vercel
          }
        : await import('../config/Aurin Plattform Uploader.json').then(
            module => ({
              projectId: module.default.project_id,
              clientEmail: module.default.client_email,
              privateKey: module.default.private_key,
            })
          ); // Importación dinámica para desarrollo local

      app = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'aurin-plattform',
      }, 'aurin-platform-app');
      console.log('[Firebase Admin] Firebase app initialized successfully');
    } else {
      console.log('[Firebase Admin] Reusing existing Firebase app');
      app = getApps().find(app => app.name === 'aurin-platform-app') || getApps()[0];
    }

    storage = getStorage(app);
    bucket = storage.bucket();
    const [exists] = await bucket.exists();
    if (!exists) {
      throw new Error('Bucket does not exist or the service account lacks storage.buckets.get permission');
    }
    console.log('[Firebase Admin] Bucket verified:', bucket.name);
    return { storage, bucket };
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

export { storage, bucket };