'use client';

import { useAuth, useUser } from '@clerk/nextjs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/lib/firebaseConfig';
import { useEffect, useState } from 'react';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export default function SyncUserToFirestore() {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!userId || !user || synced) {
      console.log('[SyncUserToFirestore] Skipping sync:', {
        userId,
        hasUser: !!user,
        synced,
      });
      return;
    }

    const syncUser = async () => {
      try {
        console.log('[SyncUserToFirestore] Starting user sync for:', {
          userId,
          clerkUserId: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          publicMetadata: user.publicMetadata,
        });

        const token = await getToken({ template: 'integration_firebase' });
        if (!token) {
          throw new Error('Failed to get Firebase token');
        }
        console.log('[SyncUserToFirestore] Firebase token obtained:', {
          userId,
          tokenLength: token.length,
        });

        const userCredentials = await signInWithCustomToken(auth, token);
        console.log('[SyncUserToFirestore] User authenticated with Firebase:', {
          userId: userCredentials.user.uid,
          email: userCredentials.user.email,
          displayName: userCredentials.user.displayName,
        });

        const email = user.emailAddresses[0]?.emailAddress || 'no-email';
        const displayName = user.firstName || user.lastName ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Usuario';
        const access = user.publicMetadata.access || 'user';
        const profilePhoto = user.imageUrl || '/default-avatar.png'; // Añadir foto de perfil
        const docRef = doc(db, 'users', userId);

        // Obtener el documento existente para verificar si 'status' ya está definido
        const userDoc = await getDoc(docRef);
        const status = userDoc.exists() && userDoc.data().status ? userDoc.data().status : 'Disponible';

        await setDoc(docRef, {
          userId,
          email,
          displayName,
          createdAt: new Date().toISOString(),
          access,
          status,
          profilePhoto, // Guardar foto de perfil inicial
        }, { merge: true });
        console.log('[SyncUserToFirestore] User data stored in Firestore:', {
          userId,
          email,
          displayName,
          access,
          status,
          profilePhoto,
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

        const idToken = await userCredentials.user.getIdToken();
        console.log('[SyncUserToFirestore] Firebase ID token obtained:', {
          userId,
          tokenLength: idToken.length,
        });

        setSynced(true);
      } catch (error) {
        console.error('[SyncUserToFirestore] Firebase sync error:', {
          error: error instanceof Error ? error.message : JSON.stringify(error),
          userId,
        });
      }
    };

    syncUser();
  }, [userId, user, synced, getToken]);

  return null;
}