/**
 * Configuración del módulo de notas
 */

/** Máximo de caracteres permitidos en una nota */
export const NOTE_MAX_LENGTH = 120;

/** Duración de una nota en horas */
export const NOTE_EXPIRY_HOURS = 24;

/** Duración de una nota en milisegundos */
export const NOTE_EXPIRY_MS = NOTE_EXPIRY_HOURS * 60 * 60 * 1000;

/** Colección de Firestore donde se almacenan las notas */
export const NOTES_COLLECTION = 'notes';

/** Mensajes de validación */
export const VALIDATION_MESSAGES = {
  EMPTY_NOTE: 'La nota no puede estar vacía',
  NOTE_TOO_LONG: `La nota no puede exceder ${NOTE_MAX_LENGTH} caracteres`,
  ALREADY_HAS_NOTE: 'Ya tienes una nota activa. Elimina la actual antes de crear una nueva.',
  ERROR_CREATING: 'Error al crear la nota',
  ERROR_DELETING: 'Error al eliminar la nota',
  ERROR_FETCHING: 'Error al cargar las notas',
} as const;

/** Mensajes de éxito */
export const SUCCESS_MESSAGES = {
  NOTE_CREATED: 'Nota creada exitosamente',
  NOTE_DELETED: 'Nota eliminada',
} as const;
