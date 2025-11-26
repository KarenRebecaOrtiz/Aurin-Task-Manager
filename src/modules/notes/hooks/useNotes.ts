'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  collection,
  onSnapshot,
  query,
  Timestamp,
  doc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useFirestoreUser } from '@/modules/header/hooks/useFirestoreUser';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import type { Note, CreateNotePayload } from '../types';
import {
  NOTE_MAX_LENGTH,
  NOTE_EXPIRY_MS,
  NOTES_COLLECTION,
  VALIDATION_MESSAGES,
  SUCCESS_MESSAGES,
} from '../lib/constants';

interface UseNotesReturn {
  notes: Note[];
  currentUserNote: Note | null;
  currentUserAvatar: string;
  currentUserName: string;
  isLoading: boolean;
  isCreating: boolean;
  isDeleting: boolean;
  addNote: (payload: CreateNotePayload) => Promise<void>;
  removeNote: () => Promise<void>;
  error: string | null;
}

export function useNotes(): UseNotesReturn {
  const { user } = useUser();
  const { firestoreUser } = useFirestoreUser();
  const { success, error: showError } = useSonnerToast();

  const [notes, setNotes] = useState<Note[]>([]);
  const [currentUserNote, setCurrentUserNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch active notes (not expired)
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const now = Timestamp.now();
    // Consulta simple sin filtro de expiración (se filtra en el cliente)
    const q = query(collection(db, NOTES_COLLECTION));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedNotes: Note[] = [];
        let userNote: Note | null = null;
        const nowMs = now.toMillis();

        snapshot.forEach((doc) => {
          const data = doc.data() as Note;
          const noteWithId = { ...data, id: doc.id };

          // Filtrar notas expiradas en el cliente
          if (data.expiresAt.toMillis() <= nowMs) {
            return; // Saltar notas expiradas
          }

          if (data.userId === user.id) {
            userNote = noteWithId;
          } else {
            fetchedNotes.push(noteWithId);
          }
        });

        setNotes(fetchedNotes);
        setCurrentUserNote(userNote);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error('Error fetching notes:', err);
        setError(VALIDATION_MESSAGES.ERROR_FETCHING);
        setIsLoading(false);
        showError(VALIDATION_MESSAGES.ERROR_FETCHING);
      }
    );

    return () => unsubscribe();
  }, [user?.id, showError]);

  // Add note
  const addNote = useCallback(
    async (payload: CreateNotePayload) => {
      if (!user?.id || !firestoreUser) {
        showError('Usuario no autenticado');
        return;
      }

      const { content } = payload;

      // Validation
      if (!content || content.trim().length === 0) {
        showError(VALIDATION_MESSAGES.EMPTY_NOTE);
        return;
      }

      if (content.length > NOTE_MAX_LENGTH) {
        showError(VALIDATION_MESSAGES.NOTE_TOO_LONG);
        return;
      }

      // Check if user already has an active note
      if (currentUserNote) {
        showError(VALIDATION_MESSAGES.ALREADY_HAS_NOTE);
        return;
      }

      setIsCreating(true);
      setError(null);

      try {
        const noteId = doc(collection(db, NOTES_COLLECTION)).id;
        const now = Timestamp.now();
        const expiresAt = new Timestamp(
          now.seconds + NOTE_EXPIRY_MS / 1000,
          now.nanoseconds
        );

        const newNote: Note = {
          id: noteId,
          userId: user.id,
          content: content.trim(),
          createdAt: now,
          expiresAt,
          user: {
            userId: user.id,
            username: firestoreUser.fullName || user.firstName || 'Usuario',
            avatarUrl: firestoreUser.profilePhoto || '',
            isCurrentUser: true,
          },
        };

        await setDoc(doc(db, NOTES_COLLECTION, noteId), newNote);
        setCurrentUserNote(newNote);
        success(SUCCESS_MESSAGES.NOTE_CREATED);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error creating note:', err);
        const errorMsg = err instanceof Error ? err.message : VALIDATION_MESSAGES.ERROR_CREATING;
        setError(errorMsg);
        showError(errorMsg);
      } finally {
        setIsCreating(false);
      }
    },
    [user?.id, user?.firstName, firestoreUser, currentUserNote, success, showError]
  );

  // Remove note
  const removeNote = useCallback(async () => {
    if (!currentUserNote) {
      showError('No hay nota activa para eliminar');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteDoc(doc(db, NOTES_COLLECTION, currentUserNote.id));
      setCurrentUserNote(null);
      success(SUCCESS_MESSAGES.NOTE_DELETED);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error deleting note:', err);
      const errorMsg = err instanceof Error ? err.message : VALIDATION_MESSAGES.ERROR_DELETING;
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  }, [currentUserNote, success, showError]);

  // Filter active notes (exclude current user's note)
  const activeNotes = useMemo(() => {
    return notes.filter((note) => note.userId !== user?.id);
  }, [notes, user?.id]);

  return {
    notes: activeNotes,
    currentUserNote,
    currentUserAvatar: firestoreUser?.profilePhoto || '',
    currentUserName: firestoreUser?.fullName || user?.firstName || 'Usuario',
    isLoading,
    isCreating,
    isDeleting,
    addNote,
    removeNote,
    error,
  };
}
