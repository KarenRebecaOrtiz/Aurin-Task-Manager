/**
 * Notes Module
 * 
 * Módulo para notas públicas tipo Instagram.
 * Todos los usuarios pueden crear una nota pública que expira en 24 horas.
 */

// Components
export {
  // Atoms
  AvatarRing,
  NoteBubble,
  // Molecules
  CurrentUserAction,
  NoteUserItem,
  NoteCard,
  DeleteNoteDialog,
  // Organisms
  NotesTray,
} from './components';

// Hooks
export { useNotes } from './hooks';
export { useUserNote } from './hooks';
export { useDismissedNotes } from './hooks';

// Types
export type { Note, NoteUser, CreateNotePayload, CreateNoteResponse } from './types';

// Constants
export {
  NOTE_MAX_LENGTH,
  NOTE_EXPIRY_HOURS,
  NOTE_EXPIRY_MS,
  NOTES_COLLECTION,
  VALIDATION_MESSAGES,
  SUCCESS_MESSAGES,
} from './lib';
