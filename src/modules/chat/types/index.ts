/**
 * Chat Module - Type Definitions
 *
 * Tipos centralizados para el módulo de chat, compatibles con el sistema principal
 * pero organizados de forma modular para mejor mantenibilidad.
 */

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// MESSAGE TYPES
// ============================================================================

/**
 * Interfaz principal para mensajes del chat
 * Compatible con src/types/index.ts pero extendida para el módulo de chat
 */
export interface Message {
  id: string;
  senderId: string;
  receiverId?: string; // Opcional para task messages, requerido para mensajes privados
  senderName: string;
  text?: string | null;
  timestamp: Timestamp | Date | null;
  read: boolean;

  // Time tracking
  hours?: number;
  dateString?: string; // Fecha del time entry

  // File attachments
  imageUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  filePath?: string | null;

  // UI states (Optimistic UI)
  isPending?: boolean;
  hasError?: boolean;
  clientId: string; // ID temporal para optimistic updates

  // Reply functionality
  replyTo?: {
    id: string;
    senderName: string;
    text: string | null;
    imageUrl?: string | null;
  } | null;

  // Special message types
  isDatePill?: boolean; // Separador de fecha
  isSummary?: boolean; // Resumen de IA
  isLoading?: boolean; // Estado de carga (para operaciones IA)
}

/**
 * Tipos de acciones disponibles para mensajes
 */
export type MessageAction = 'copy' | 'edit' | 'delete' | 'reply' | 'download';

/**
 * Agrupación de mensajes por fecha
 */
export interface MessageGroup {
  date: Date;
  messages: Message[];
}

// ============================================================================
// USER TYPES
// ============================================================================

/**
 * Usuario básico para el chat
 * Simplificado de src/types/index.ts User
 */
export interface ChatUser {
  id: string;
  fullName: string;
  firstName?: string;
  imageUrl: string;
  isOnline?: boolean;
  status?: string;
}

// ============================================================================
// TASK TYPES
// ============================================================================

/**
 * Task interface compatible con src/types/index.ts
 * Incluye campos adicionales necesarios para el chat sidebar
 */
export interface Task {
  id: string;
  clientId: string;
  project: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string;
  endDate: string;
  LeadedBy: string[];
  AssignedTo: string[];
  CreatedBy?: string;
  createdAt?: string; // Opcional para compatibilidad
  lastActivity?: string;
  hasUnreadUpdates?: boolean;
  lastViewedBy?: { [userId: string]: string };
}

// ============================================================================
// CHAT STORE TYPES
// ============================================================================

/**
 * Estado de mensajes por tarea
 * Soporte multi-task para poder cambiar entre tareas sin perder estado
 */
export interface TaskMessages {
  messages: Message[];
  hasMore: boolean;
  isLoading: boolean;
  lastDoc: any; // QueryDocumentSnapshot de Firestore
}

/**
 * Estado global del chat store
 */
export interface ChatState {
  // Multi-task support
  messagesByTask: Record<string, TaskMessages>;
  currentTaskId: string | null;

  // UI state
  editingMessageId: string | null;
  replyingTo: Message | null;
}

/**
 * Acciones del chat store
 */
export interface ChatActions {
  // Task management
  setCurrentTask: (taskId: string) => void;
  initializeTask: (taskId: string) => void;

  // Message CRUD
  addMessage: (taskId: string, message: Message) => void;
  updateMessage: (taskId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (taskId: string, messageId: string) => void;
  setMessages: (taskId: string, messages: Message[]) => void;
  prependMessages: (taskId: string, messages: Message[]) => void;

  // Pagination
  setHasMore: (taskId: string, hasMore: boolean) => void;
  setIsLoading: (taskId: string, isLoading: boolean) => void;
  setLastDoc: (taskId: string, lastDoc: any) => void;

  // UI actions
  setEditingId: (id: string | null) => void;
  setReplyingTo: (message: Message | null) => void;
  clearActions: () => void;

  // Getters
  getCurrentMessages: () => Message[];
  getCurrentHasMore: () => boolean;
  getCurrentIsLoading: () => boolean;
}

/**
 * Store completo de chat
 */
export type ChatStore = ChatState & ChatActions;

// ============================================================================
// SIDEBAR TYPES
// ============================================================================

/**
 * Estado del chat sidebar
 * Gestiona qué tarea está abierta y su información
 */
export interface ChatSidebarState {
  currentTask: Task | null;
  clientName: string;
  isOpen: boolean;
}

/**
 * Props para el componente ChatSidebar
 */
export interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  users: ChatUser[];
}

// ============================================================================
// TIMER TYPES
// ============================================================================

/**
 * Estado del timer por usuario/tarea
 */
export interface TimerState {
  taskId: string;
  userId: string;
  seconds: number;
  isRunning: boolean;
  startedAt: number | null;
  lastTick: number | null;
}

/**
 * Store de timers (soporte multi-timer)
 */
export interface TimerStoreState {
  timers: Map<string, TimerState>; // key: `${taskId}_${userId}`
}

// ============================================================================
// ENCRYPTION TYPES
// ============================================================================

/**
 * Resultado de operaciones de encriptación
 */
export interface EncryptionResult {
  success: boolean;
  data?: string;
  error?: Error;
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export type {
  // Re-export de Firestore para conveniencia
  Timestamp,
};
