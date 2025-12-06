'use client';

import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Note } from '../../types';
import styles from './NoteCard.module.scss';

interface NoteCardProps {
  note: Note;
  onDismiss?: (noteId: string) => void;
  isCurrentUser?: boolean;
  className?: string;
}

/**
 * NoteCard Component
 * 
 * Card pequeña que muestra una nota con:
 * - Mensaje de la nota
 * - Avatar pequeño con nombre del usuario
 * - Botón de descartar (ocultar de la interfaz)
 */
export function NoteCard({ note, onDismiss, isCurrentUser = false, className }: NoteCardProps) {
  const handleDismiss = useCallback(() => {
    onDismiss?.(note.id);
  }, [onDismiss, note.id]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(styles.card, className)}
    >
      {/* Dismiss button */}
      {onDismiss && !isCurrentUser && (
        <button
          onClick={handleDismiss}
          className={styles.dismissButton}
          aria-label="Descartar nota"
          type="button"
        >
          <X size={12} />
        </button>
      )}

      {/* Note content */}
      <p className={styles.content}>{note.content}</p>

      {/* User info */}
      <div className={styles.userInfo}>
        <div className={styles.avatar}>
          {note.user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={note.user.avatarUrl}
              alt={note.user.username}
              className={styles.avatarImage}
            />
          ) : (
            <span className={styles.avatarFallback}>
              {note.user.username.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <span className={styles.username}>
          {isCurrentUser ? 'Tú' : note.user.username.split(' ')[0]}
        </span>
      </div>
    </motion.div>
  );
}
