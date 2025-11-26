"use client"

import type { Note } from "@/types/notes"
import { NoteBubble } from "@/components/atoms/note-bubble"
import { AvatarRing } from "@/components/atoms/avatar-ring"
import { cn } from "@/lib/utils"

interface NoteUserItemProps {
  note: Note
  className?: string
}

export function NoteUserItem({ note, className }: NoteUserItemProps) {
  return (
    <div className={cn("flex flex-col items-center gap-1", "min-w-[80px]", className)}>
      {/* Note bubble - no interaction needed */}
      {note.content && <NoteBubble content={note.content} />}

      {/* Avatar with gradient ring if has note */}
      <AvatarRing src={note.user.avatarUrl} alt={note.user.username} hasGradient={!!note.content} size="md" />

      {/* Username */}
      <span className="max-w-[70px] truncate text-xs text-muted-foreground">{note.user.username}</span>
    </div>
  )
}
