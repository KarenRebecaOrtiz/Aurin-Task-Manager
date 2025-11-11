import type { Message } from "./message.types"

export interface Task {
  id: string
  name: string
  description: string
  project: string
  clientName: string
  status: "pending" | "in-progress" | "completed" | "on-hold"
  team: { id: string; name: string; avatarUrl?: string }[]
  startDate: string
  endDate: string
  totalTimeLogged?: number
}

export interface ChatState {
  messages: Message[]
  editingMessageId: string | null
  replyingTo: Message | null
  hasMoreMessages: boolean
  isLoadingMore: boolean
}

export interface ChatActions {
  addMessage: (message: Message) => void
  updateMessage: (id: string, updates: Partial<Message>) => void
  deleteMessage: (id: string) => void
  setEditingId: (id: string | null) => void
  setReplyingTo: (message: Message | null) => void
  setMessages: (messages: Message[]) => void
  setHasMoreMessages: (hasMore: boolean) => void
  setIsLoadingMore: (isLoading: boolean) => void
}
