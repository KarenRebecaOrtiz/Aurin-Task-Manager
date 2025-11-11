import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PersonalLocations } from '@/modules/config';

export const usePersonalLocations = () => {
  const { user } = useUser();
  const [personalLocations, setPersonalLocations] = useState<PersonalLocations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setPersonalLocations(null);
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', user.id);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPersonalLocations(data.personalLocations || null);
        } else {
          setPersonalLocations(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching personal locations:', error);
        setPersonalLocations(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.id]);

  return { personalLocations, loading };
}; 