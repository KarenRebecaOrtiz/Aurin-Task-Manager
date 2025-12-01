'use client';

import type { Note } from '../../types';
import { NoteBubble } from '../atoms/NoteBubble';
import { AvatarRing } from '../atoms/AvatarRing';
import { cn } from '@/lib/utils';
import styles from './NoteUserItem.module.scss';

interface NoteUserItemProps {
  note: Note;
  className?: string;
}

export function NoteUserItem({ note, className }: NoteUserItemProps) {
  return (
    <div className={cn(styles.container, className)}>
      {/* Note bubble */}
      {note.content && <NoteBubble content={note.content} />}

      {/* Avatar with gradient ring if has note */}
      <AvatarRing
        src={note.user.avatarUrl}
        alt={note.user.username}
        hasGradient={!!note.content}
        size="lg"
      />

      {/* Username */}
      <span className={styles.username}>
        {note.user.username}
      </span>
    </div>
  );
}
