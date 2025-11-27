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
    <div className={cn('flex flex-col items-center gap-2', 'min-w-[100px]', className)}>
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
      <span className="max-w-[90px] truncate text-base text-white font-medium">
        {note.user.username}
      </span>
    </div>
  );
}
