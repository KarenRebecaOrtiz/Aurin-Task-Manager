import { FILE_CONSTRAINTS, STORAGE_KEYS, SESSION_TIMEOUT } from '../constants'
import type { Message, ChatSession } from '../types'
import { nanoid } from 'nanoid'

// Time utilities
export const getCurrentTime = (): string => {
  const now = new Date()
  return now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
}

export const formatMessageTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
}

// File utilities
export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  if (file.size > FILE_CONSTRAINTS.maxSize) {
    return { isValid: false, error: "El archivo debe ser menor a 10MB" }
  }

  if (!FILE_CONSTRAINTS.allowedTypes.includes(file.type)) {
    return { isValid: false, error: "Tipo de archivo no soportado" }
  }

  return { isValid: true }
}

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Session management utilities
export const createSessionId = (): string => {
  return nanoid(16)
}

export const isSessionExpired = (lastActivity: string): boolean => {
  const now = Date.now()
  const lastActivityTime = new Date(lastActivity).getTime()
  return (now - lastActivityTime) > SESSION_TIMEOUT
}

export const saveSession = (session: ChatSession): void => {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, session.sessionId)
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(session.messages))
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, session.lastActivity)
  } catch (error) {
    console.error('Error saving session:', error)
  }
}

export const loadSession = (): ChatSession | null => {
  if (typeof window === 'undefined') return null

  try {
    const sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID)
    const messagesStr = localStorage.getItem(STORAGE_KEYS.MESSAGES)
    const lastActivity = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY)

    if (!sessionId || !lastActivity) return null

    // Check if session is expired
    if (isSessionExpired(lastActivity)) {
      clearSession()
      return null
    }

    const messages: Message[] = messagesStr ? JSON.parse(messagesStr) : []

    return {
      sessionId,
      messages,
      createdAt: lastActivity,
      lastActivity
    }
  } catch (error) {
    console.error('Error loading session:', error)
    return null
  }
}

export const clearSession = (): void => {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION_ID)
    localStorage.removeItem(STORAGE_KEYS.MESSAGES)
    localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY)
  } catch (error) {
    console.error('Error clearing session:', error)
  }
}

export const updateSessionActivity = (sessionId: string, messages: Message[]): void => {
  const now = new Date().toISOString()
  const session: ChatSession = {
    sessionId,
    messages,
    createdAt: now,
    lastActivity: now
  }
  saveSession(session)
}

// Network utilities
export const isOnline = (): boolean => {
  if (typeof window === 'undefined') return true
  return navigator.onLine
}
