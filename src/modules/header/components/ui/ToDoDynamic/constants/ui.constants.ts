/**
 * UI Constants
 * Configuration for UI behavior and dimensions
 */

export const TODO_UI = {
  // Mobile detection
  MOBILE_BREAKPOINT: 768,

  // Drag behavior
  DRAG_THRESHOLD: 100,

  // Timing
  CLICK_OUTSIDE_DELAY: 50,
  INPUT_FOCUS_DELAY: 100,
  TOOLTIP_DELAY: 300,

  // Input
  INPUT_PLACEHOLDER: 'Añadir nuevo todo...',
  INPUT_ADD_BUTTON: '+',

  // Button labels
  BUTTON_LABELS: {
    CLOSE: 'Cerrar todos',
    UNDO: 'Deshacer última tarea completada',
    DELETE: 'Eliminar todo',
    TOGGLE: 'Marcar como completado',
    TOGGLE_UNCOMPLETE: 'Marcar como pendiente',
  },

  // ARIA labels
  ARIA_LABELS: {
    BUTTON: 'Abrir lista de todos',
    CLOSE: 'Cerrar todos',
    UNDO: 'Deshacer última tarea completada',
    DELETE: 'Eliminar todo',
  },

  // Stats
  STATS: {
    REMAINING_LABEL: 'pendientes',
    COMPLETED_LABEL: 'completados hoy',
  },

  // Empty state
  EMPTY_STATE: {
    TITLE: '¡Aún no tienes tareas en tu lista!',
    SUBTITLE: '¿Cómo funciona?',
    DESCRIPTION: 'Añade tus pendientes usando el campo de arriba y el botón +. Marca tus tareas como completadas o elimínalas cuando ya no las necesites.',
    FOOTER: '',
  },

  // Loading state
  LOADING_TEXT: 'Cargando todos...',

  // Tooltip
  TOOLTIP_TEXT: 'Mis To Do',
} as const;
