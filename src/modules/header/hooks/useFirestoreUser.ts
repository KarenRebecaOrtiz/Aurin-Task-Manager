
import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface FirestoreUser extends DocumentData {
  fullName: string;
  profilePhoto: string;
}

export const useFirestoreUser = () => {
  const { user, isLoaded } = useUser();
  const [firestoreUser, setFirestoreUser] = useState<FirestoreUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !isLoaded) {
      setLoading(!isLoaded);
      return;
    }

    setLoading(true);
    const userDocRef = doc(db, 'users', user.id);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data() as FirestoreUser;
          setFirestoreUser(userData);

          // Opcional: Mantener Clerk sincronizado si es necesario
          if (user.fullName !== userData.fullName || user.imageUrl !== userData.profilePhoto) {
            user.update({
              firstName: userData.fullName.split(' ')[0],
              lastName: userData.fullName.split(' ').slice(1).join(' '),
              imageUrl: userData.profilePhoto,
            }).catch(() => {
              // Manejar error de actualización de Clerk silenciosamente
            });
          }
        } else {
          setFirestoreUser(null);
        }
        setLoading(false);
      },
      () => {
        setFirestoreUser(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, isLoaded]);

  return { firestoreUser, loading };
};
