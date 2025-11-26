"use client"

import type React from "react"

import { Plus, X } from "lucide-react"
import type { Note } from "@/types/notes"
import { NoteBubble } from "@/components/atoms/note-bubble"
import { AvatarRing } from "@/components/atoms/avatar-ring"
import { cn } from "@/lib/utils"

interface CurrentUserActionProps {
  currentUserNote?: Note | null
  avatarUrl: string
  username: string
  onAddNote?: () => void
  onDeleteNote?: () => void
  className?: string
}

export function CurrentUserAction({
  currentUserNote,
  avatarUrl,
  username,
  onAddNote,
  onDeleteNote,
  className,
}: CurrentUserActionProps) {
  const hasNote = !!currentUserNote?.content

  const handleClick = () => {
    if (!hasNote && onAddNote) {
      onAddNote()
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDeleteNote) {
      onDeleteNote()
    }
  }

  return (
    <div className={cn("flex flex-col items-center gap-1", "min-w-[80px]", className)}>
      {hasNote && currentUserNote && (
        <div className="relative">
          <NoteBubble content={currentUserNote.content} />
          {/* Delete button positioned on top-right of bubble */}
          <button
            onClick={handleDelete}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm transition-transform hover:scale-110 active:scale-95"
            aria-label="Delete note"
          >
            <X className="h-3 w-3" strokeWidth={3} />
          </button>
        </div>
      )}

      {/* Avatar container with optional add button */}
      <button
        onClick={handleClick}
        className={cn("relative", !hasNote && "cursor-pointer transition-transform hover:scale-105 active:scale-95")}
        disabled={hasNote}
      >
        <AvatarRing src={avatarUrl} alt={username} hasGradient={hasNote} size="md" />

        {/* Plus badge when no note exists */}
        {!hasNote && (
          <div className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm">
            <Plus className="h-3.5 w-3.5" strokeWidth={3} />
          </div>
        )}
      </button>

      {/* Username label */}
      <span className="max-w-[70px] truncate text-xs text-muted-foreground">{hasNote ? "Your note" : "Add note"}</span>
    </div>
  )
}
