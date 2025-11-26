"use client"

import { useState, useCallback, useMemo } from "react"
import type { Note, CreateNotePayload } from "@/types/notes"

// Mock data simulating Firestore documents
const MOCK_NOTES: Note[] = [
  {
    id: "note-1",
    userId: "user-2",
    content: "Working on something exciting! 🚀",
    createdAt: Date.now() - 1000 * 60 * 30,
    expiresAt: Date.now() + 1000 * 60 * 60 * 23.5,
    user: {
      username: "sarah_dev",
      avatarUrl: "/woman-developer-avatar.png",
      isCurrentUser: false,
    },
  },
  {
    id: "note-2",
    userId: "user-3",
    content: "Coffee time ☕",
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    expiresAt: Date.now() + 1000 * 60 * 60 * 22,
    user: {
      username: "john_codes",
      avatarUrl: "/man-programmer-avatar.jpg",
      isCurrentUser: false,
    },
  },
  {
    id: "note-3",
    userId: "user-4",
    content: "Just shipped a new feature!",
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
    expiresAt: Date.now() + 1000 * 60 * 60 * 19,
    user: {
      username: "alex_ui",
      avatarUrl: "/diverse-designer-avatars.png",
      isCurrentUser: false,
    },
  },
  {
    id: "note-4",
    userId: "user-5",
    content: "",
    createdAt: 0,
    expiresAt: 0,
    user: {
      username: "mike_eng",
      avatarUrl: "/engineer-avatar.png",
      isCurrentUser: false,
    },
  },
  {
    id: "note-5",
    userId: "user-6",
    content: "Learning TypeScript today 📘",
    createdAt: Date.now() - 1000 * 60 * 60 * 8,
    expiresAt: Date.now() + 1000 * 60 * 60 * 16,
    user: {
      username: "emma_tech",
      avatarUrl: "/tech-woman-avatar.jpg",
      isCurrentUser: false,
    },
  },
]

const CURRENT_USER = {
  userId: "user-1",
  username: "you",
  avatarUrl: "/current-user-avatar.png",
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>(MOCK_NOTES)
  const [currentUserNote, setCurrentUserNote] = useState<Note | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Filter notes to only show those with content and not expired
  const activeNotes = useMemo(() => {
    const now = Date.now()
    return notes.filter((note) => note.content && note.expiresAt > now)
  }, [notes])

  const addNote = useCallback((payload: CreateNotePayload) => {
    const { content } = payload

    if (!content || content.length > 120) {
      console.error("[v0] Note content must be 1-120 characters")
      return
    }

    const newNote: Note = {
      id: `note-${Date.now()}`,
      userId: CURRENT_USER.userId,
      content: content.trim(),
      createdAt: Date.now(),
      expiresAt: Date.now() + 1000 * 60 * 60 * 24, // 24 hours
      user: {
        username: CURRENT_USER.username,
        avatarUrl: CURRENT_USER.avatarUrl,
        isCurrentUser: true,
      },
    }

    setCurrentUserNote(newNote)
  }, [])

  const removeNote = useCallback(() => {
    setCurrentUserNote(null)
  }, [])

  return {
    notes: activeNotes,
    currentUserNote,
    currentUser: CURRENT_USER,
    isLoading,
    addNote,
    removeNote,
  }
}
