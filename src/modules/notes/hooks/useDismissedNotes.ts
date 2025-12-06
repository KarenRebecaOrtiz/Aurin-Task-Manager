'use client';

import { useState, useCallback, useEffect } from 'react';

const DISMISSED_NOTES_KEY = 'aurin_dismissed_notes';

interface DismissedNote {
  noteId: string;
  dismissedAt: number; // timestamp
}

interface UseDismissedNotesReturn {
  dismissedNoteIds: Set<string>;
  dismissNote: (noteId: string) => void;
  isNoteDismissed: (noteId: string) => boolean;
  clearExpiredDismissals: () => void;
}

/**
 * Hook para manejar notas descartadas en localStorage
 * Las notas descartadas se limpian automáticamente después de 24 horas
 */
export function useDismissedNotes(): UseDismissedNotesReturn {
  const [dismissedNoteIds, setDismissedNoteIds] = useState<Set<string>>(new Set());

  // Cargar notas descartadas desde localStorage al montar
  useEffect(() => {
    const stored = localStorage.getItem(DISMISSED_NOTES_KEY);
    if (stored) {
      try {
        const dismissedNotes: DismissedNote[] = JSON.parse(stored);
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        // Filtrar notas que ya expiraron (más de 24 horas)
        const validNotes = dismissedNotes.filter(
          (note) => now - note.dismissedAt < twentyFourHours
        );
        
        // Si hubo notas expiradas, actualizar localStorage
        if (validNotes.length !== dismissedNotes.length) {
          localStorage.setItem(DISMISSED_NOTES_KEY, JSON.stringify(validNotes));
        }
        
        setDismissedNoteIds(new Set(validNotes.map((n) => n.noteId)));
      } catch {
        // Si hay error al parsear, limpiar localStorage
        localStorage.removeItem(DISMISSED_NOTES_KEY);
        setDismissedNoteIds(new Set());
      }
    }
  }, []);

  // Descartar una nota
  const dismissNote = useCallback((noteId: string) => {
    setDismissedNoteIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(noteId);
      
      // Guardar en localStorage
      const stored = localStorage.getItem(DISMISSED_NOTES_KEY);
      let dismissedNotes: DismissedNote[] = [];
      
      if (stored) {
        try {
          dismissedNotes = JSON.parse(stored);
        } catch {
          dismissedNotes = [];
        }
      }
      
      // Agregar nueva nota descartada si no existe
      if (!dismissedNotes.some((n) => n.noteId === noteId)) {
        dismissedNotes.push({
          noteId,
          dismissedAt: Date.now(),
        });
        localStorage.setItem(DISMISSED_NOTES_KEY, JSON.stringify(dismissedNotes));
      }
      
      return newSet;
    });
  }, []);

  // Verificar si una nota está descartada
  const isNoteDismissed = useCallback(
    (noteId: string) => dismissedNoteIds.has(noteId),
    [dismissedNoteIds]
  );

  // Limpiar descartes expirados manualmente
  const clearExpiredDismissals = useCallback(() => {
    const stored = localStorage.getItem(DISMISSED_NOTES_KEY);
    if (stored) {
      try {
        const dismissedNotes: DismissedNote[] = JSON.parse(stored);
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        const validNotes = dismissedNotes.filter(
          (note) => now - note.dismissedAt < twentyFourHours
        );
        
        localStorage.setItem(DISMISSED_NOTES_KEY, JSON.stringify(validNotes));
        setDismissedNoteIds(new Set(validNotes.map((n) => n.noteId)));
      } catch {
        localStorage.removeItem(DISMISSED_NOTES_KEY);
        setDismissedNoteIds(new Set());
      }
    }
  }, []);

  return {
    dismissedNoteIds,
    dismissNote,
    isNoteDismissed,
    clearExpiredDismissals,
  };
}
