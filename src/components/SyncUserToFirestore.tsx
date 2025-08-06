'use client';

import { useAuth as useClerkAuth, useUser } from '@clerk/nextjs';
import { signInWithCustomToken } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useEffect, useState } from 'react';

export default function SyncUserToFirestore() {
  const { getToken, userId } = useClerkAuth();
  const { user } = useUser();
  const [synced, setSynced] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    if (!userId || !user || synced || retryCount > maxRetries) {
      // Skipping sync
      return;
    }

    const syncUser = async () => {
      try {
        // Starting user sync

        const token = await getToken({ template: 'integration_firebase' });
        if (!token) {
          throw new Error('Failed to get Firebase token');
        }
        // Firebase token obtained

        // Add a small delay to ensure Clerk is ready
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const userCredentials = await signInWithCustomToken(auth, token);
        console.log('[SyncUserToFirestore] User authenticated with Firebase:', {
          userId: userCredentials.user.uid,
          email: userCredentials.user.email,
          displayName: userCredentials.user.displayName,
        });

        const email = user.emailAddresses[0]?.emailAddress || 'no-email';
        const displayName = user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Usuario';
        const profilePhoto = user.imageUrl || '';
        const docRef = doc(db, 'users', userId);

        // Get existing user data from Firestore
        const userDoc = await getDoc(docRef);
        const existingData = userDoc.exists() ? userDoc.data() : {};
        
        // Prepare user data for Firestore (excluding admin status which is handled by Clerk)
        const userData = {
          userId,
          email,
          displayName,
          profilePhoto,
          // Preserve existing Firestore data
          ...existingData,
          // Update with Clerk data
          lastUpdated: new Date().toISOString(),
        };

        await setDoc(docRef, userData, { merge: true });
        console.log('[SyncUserToFirestore] User data stored in Firestore:', {
          userId,
          email,
          displayName,
          profilePhoto,
          preservedFields: Object.keys(existingData).length,
        });

        const updatedUserDoc = await getDoc(docRef);
        if (updatedUserDoc.exists()) {
          console.log('[SyncUserToFirestore] Verified user document:', {
            userId,
            docData: updatedUserDoc.data(),
          });
        } else {
          console.error('[SyncUserToFirestore] User document not found after sync:', userId);
        }

        await userCredentials.user.getIdToken();
        // Firebase ID token obtained

        setSynced(true);
        setRetryCount(0);
      } catch (error) {
        console.error('[SyncUserToFirestore] Firebase sync error:', {
          error: error instanceof Error ? error.message : JSON.stringify(error),
          userId,
          retryCount,
        });
        if (retryCount < maxRetries) {
          console.log('[SyncUserToFirestore] Retrying sync attempt:', retryCount + 1);
          setRetryCount((prev) => prev + 1);
        } else {
          console.error('[SyncUserToFirestore] Max retries reached, sync failed:', userId);
        }
      }
    };

    syncUser();
  }, [userId, user, synced, getToken, retryCount]);

  return null;
}