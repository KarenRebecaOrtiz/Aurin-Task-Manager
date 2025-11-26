"use client"

import { useState } from "react"
import { useNotes } from "@/hooks/use-notes"
import { CurrentUserAction } from "@/components/molecules/current-user-action"
import { NoteUserItem } from "@/components/molecules/note-user-item"
import { DeleteNoteDialog } from "@/components/molecules/delete-note-dialog"
import { cn } from "@/lib/utils"

interface NotesTrayProps {
  className?: string
}

export function NotesTray({ className }: NotesTrayProps) {
  const { notes, currentUserNote, currentUser, addNote, removeNote } = useNotes()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleAddNote = () => {
    const content = prompt("Leave a note (max 120 chars):")
    if (content) {
      addNote({ content: content.slice(0, 120) })
    }
  }

  const handleDeleteRequest = () => {
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = () => {
    removeNote()
  }

  return (
    <>
      <div
        className={cn(
          "flex flex-wrap gap-4 px-4 py-3",
          "cursor-grab overflow-x-auto active:cursor-grabbing",
          "scrollbar-hide",
          "[&::-webkit-scrollbar]:hidden",
          "[-ms-overflow-style:none]",
          "[scrollbar-width:none]",
          className,
        )}
      >
        {/* Current user is always first */}
        <CurrentUserAction
          currentUserNote={currentUserNote}
          avatarUrl={currentUser.avatarUrl}
          username={currentUser.username}
          onAddNote={handleAddNote}
          onDeleteNote={handleDeleteRequest}
        />

        {/* Other users' notes - removed onReply */}
        {notes.map((note) => (
          <NoteUserItem key={note.id} note={note} />
        ))}
      </div>

      <DeleteNoteDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog} onConfirm={handleConfirmDelete} />
    </>
  )
}

export { NotesTray as InstagramNotesTray }
