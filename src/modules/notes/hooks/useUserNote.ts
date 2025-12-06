'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Note } from '../types';
import { NOTES_COLLECTION } from '../lib/constants';

interface UseUserNoteReturn {
  note: Note | null;
  isLoading: boolean;
}

/**
 * Hook para obtener la nota activa de un usuario específico
 * @param userId - ID del usuario del cual obtener la nota
 * @returns La nota del usuario o null si no tiene
 */
export function useUserNote(userId: string | undefined): UseUserNoteReturn {
  const [note, setNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setNote(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Query for the specific user's note
    const q = query(
      collection(db, NOTES_COLLECTION),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const now = Timestamp.now().toMillis();
        let userNote: Note | null = null;

        snapshot.forEach((doc) => {
          const data = doc.data() as Note;
          
          // Only include non-expired notes
          if (data.expiresAt.toMillis() > now) {
            userNote = { ...data, id: doc.id };
          }
        });

        setNote(userNote);
        setIsLoading(false);
      },
      (error) => {
        // eslint-disable-next-line no-console
        console.error('Error fetching user note:', error);
        setNote(null);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { note, isLoading };
}
