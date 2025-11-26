/**
 * Note interface compatible with Firestore
 * All timestamps are in milliseconds (Unix epoch)
 */
export interface NoteUser {
  username: string
  avatarUrl: string
  isCurrentUser: boolean
}

export interface Note {
  id: string
  userId: string
  content: string // max 120 chars
  createdAt: number // timestamp in ms
  expiresAt: number // timestamp in ms (24h from creation)
  user: NoteUser
}

export interface CreateNotePayload {
  content: string
}
