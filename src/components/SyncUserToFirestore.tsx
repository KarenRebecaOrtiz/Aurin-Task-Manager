'use client';
import { useAuth, useUser } from '@clerk/nextjs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
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
    if (!userId || !user || synced) return;

    const syncUser = async () => {
      try {
        const token = await getToken({ template: 'integration_firebase' });
        const userCredentials = await signInWithCustomToken(auth, token || '');
        console.log('User authenticated with Firebase:', userCredentials.user);

        const email = user.emailAddresses[0]?.emailAddress || 'no-email';
        await setDoc(doc(db, 'users', userId), {
          userId,
          email,
          createdAt: new Date().toISOString()
        }, { merge: true });
        console.log('User data stored in Firestore:', { userId, email });
        setSynced(true);
      } catch (error) {
        console.error('Firebase sync error:', error);
      }
    };

    syncUser();
  }, [userId, user, synced]);

  return null;
}