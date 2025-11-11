import type { Timestamp } from "firebase/firestore"

export interface Message {
  id: string
  senderId: string
  senderName: string
  senderAvatarUrl?: string
  text: string | null
  timestamp: Timestamp
  imageUrl?: string
  fileUrl?: string
  fileName?: string
  replyTo?: Message
  isPending?: boolean
  hasError?: boolean
  isAISummary?: boolean
  hours?: number
}

export interface User {
  id: string
  name: string
  avatarUrl?: string
  isOnline?: boolean
}

export type MessageAction = "copy" | "edit" | "delete" | "reply"
