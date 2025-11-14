/**
 * Validation Constants
 * Rules and limits for todo validation
 */

export const TODO_VALIDATION = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 100,
  EMPTY_ERROR: 'El todo no puede estar vacío',
  MIN_LENGTH_ERROR: 'El todo debe tener al menos 3 caracteres',
  MAX_LENGTH_ERROR: 'El todo no puede tener más de 100 caracteres',
  DUPLICATE_ERROR: 'Este todo ya existe',
  AUTH_ERROR: 'Usuario no autenticado',
  CREATE_ERROR: 'Error al crear el todo',
  UPDATE_ERROR: 'Error al actualizar el todo',
  DELETE_ERROR: 'Error al eliminar el todo',
  UNDO_ERROR: 'Error al deshacer la tarea completada',
  NO_UNDO_ERROR: 'No hay tareas completadas para deshacer',
  LOAD_ERROR: 'Error cargando todos',
  LOAD_COMPLETED_ERROR: 'Error cargando todos completados',
  FIRESTORE_ERROR: 'No se pudieron cargar los todos. Verifica los índices de Firestore.',
} as const;
