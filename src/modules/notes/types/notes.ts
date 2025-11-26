import { Timestamp } from 'firebase/firestore';

/**
 * Representa un usuario que tiene una nota
 */
export interface NoteUser {
  userId: string;
  username: string;
  avatarUrl: string;
  isCurrentUser: boolean;
}

/**
 * Representa una nota pública en el sistema
 * Todos los usuarios pueden crear notas (sin permisos especiales)
 * Las notas expiran después de 24 horas
 */
export interface Note {
  id: string;
  userId: string;
  content: string; // max 120 chars
  createdAt: Timestamp;
  expiresAt: Timestamp; // 24h from creation
  user: NoteUser;
}

/**
 * Payload para crear una nueva nota
 */
export interface CreateNotePayload {
  content: string;
}

/**
 * Respuesta de la API al crear una nota
 */
export interface CreateNoteResponse {
  success: boolean;
  note?: Note;
  error?: string;
}
