'use client';

import type React from 'react';
import { useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import type { Note } from '../../types';
import { NoteBubble } from '../atoms/NoteBubble';
import { AvatarRing } from '../atoms/AvatarRing';
import { cn } from '@/lib/utils';
import styles from './CurrentUserAction.module.scss';

interface CurrentUserActionProps {
  currentUserNote?: Note | null;
  avatarUrl: string;
  username: string;
  onAddNote?: () => void;
  onDeleteNote?: () => void;
  className?: string;
}

export function CurrentUserAction({
  currentUserNote,
  avatarUrl,
  username,
  onAddNote,
  onDeleteNote,
  className,
}: CurrentUserActionProps) {
  const hasNote = !!currentUserNote?.content;

  const handleClick = useCallback(() => {
    if (!hasNote && onAddNote) {
      onAddNote();
    }
  }, [hasNote, onAddNote]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteNote) {
      onDeleteNote();
    }
  }, [onDeleteNote]);

  return (
    <div className={cn(styles.container, className)}>
      {hasNote && currentUserNote && (
        <div className={styles.bubbleWrapper}>
          <NoteBubble content={currentUserNote.content} />
          {/* Delete button positioned on top-right of bubble */}
          <button
            onClick={handleDelete}
            className={styles.deleteButton}
            aria-label="Eliminar nota"
            type="button"
          >
            <X className={styles.deleteIcon} />
          </button>
        </div>
      )}

      {/* Avatar container with optional add button */}
      <button
        onClick={handleClick}
        className={cn(styles.avatarButton, !hasNote && styles.clickable)}
        disabled={hasNote}
        aria-label={hasNote ? 'Nota activa' : 'Agregar nota'}
        type="button"
      >
        <AvatarRing src={avatarUrl} alt={username} hasGradient={hasNote} size="lg" />

        {/* Plus badge when no note exists */}
        {!hasNote && (
          <div className={styles.plusBadge}>
            <Plus className={styles.plusIcon} />
          </div>
        )}
      </button>

      {/* Username label */}
      <span className={styles.username}>
        {hasNote ? 'Tú' : 'Agregar nota'}
      </span>
    </div>
  );
}
