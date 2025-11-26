'use client';

import type { Note } from '../../types';
import { NoteBubble } from '../atoms/NoteBubble';
import { AvatarRing } from '../atoms/AvatarRing';
import { cn } from '@/lib/utils';

interface NoteUserItemProps {
  note: Note;
  className?: string;
}

export function NoteUserItem({ note, className }: NoteUserItemProps) {
  return (
    <div className={cn('flex flex-col items-center gap-1', 'min-w-[80px]', className)}>
      {/* Note bubble */}
      {note.content && <NoteBubble content={note.content} />}

      {/* Avatar with gradient ring if has note */}
      <AvatarRing
        src={note.user.avatarUrl}
        alt={note.user.username}
        hasGradient={!!note.content}
        size="md"
      />

      {/* Username */}
      <span className="max-w-[70px] truncate text-sm text-white font-medium">
        {note.user.username}
      </span>
    </div>
  );
}
