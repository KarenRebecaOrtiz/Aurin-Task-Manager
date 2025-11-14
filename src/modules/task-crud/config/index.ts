/**
 * Configuration and Constants for Task CRUD
 * Centralized configuration for dropdowns, animations, and UI constants
 */

import { TaskStatus, TaskPriority } from '../types/domain';

// Status options for dropdown
export const STATUS_OPTIONS: { label: string; value: TaskStatus }[] = [
  { label: 'Por Iniciar', value: 'Por Iniciar' },
  { label: 'En Proceso', value: 'En Proceso' },
  { label: 'Backlog', value: 'Backlog' },
  { label: 'Por Finalizar', value: 'Por Finalizar' },
  { label: 'Finalizado', value: 'Finalizado' },
  { label: 'Cancelado', value: 'Cancelado' },
];

// Priority options for dropdown
export const PRIORITY_OPTIONS: { label: string; value: TaskPriority }[] = [
  { label: 'Baja', value: 'Baja' },
  { label: 'Media', value: 'Media' },
  { label: 'Alta', value: 'Alta' },
];

// Animation duration constants
export const ANIMATION_CONFIG = {
  DURATION: {
    FAST: 0.2,
    NORMAL: 0.3,
    SLOW: 0.5,
  },
  EASE: {
    IN_OUT: 'power2.inOut',
    OUT: 'power2.out',
    IN: 'power2.in',
  },
  STAGGER: 0.05,
};

// Dropdown animation config
export const DROPDOWN_ANIMATION = {
  initial: { opacity: 0, y: -10, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.95 },
  transition: { duration: ANIMATION_CONFIG.DURATION.FAST },
};

// UI Constants
export const UI_CONSTANTS = {
  DEBOUNCE_DELAY: 100,
  SCROLL_DEBOUNCE_DELAY: 200,
  INPUT_FOCUS_DELAY: 100,
  SUCCESS_ALERT_DURATION: 2000,
  POPUP_LOADER_DURATION: 3000,
  POPUP_LOADER_EDIT_DURATION: 2500,
};

// Form persistence keys
export const FORM_PERSISTENCE_KEYS = {
  CREATE: 'create-task-wizard',
  EDIT: (taskId: string) => `edit-task-wizard-${taskId}`,
};

// Wizard configuration
export const WIZARD_CONFIG = {
  TOTAL_STEPS: 3,
  STEP_LABELS: ['Cliente', 'Información Básica', 'Equipo'],
};

// Toast messages
export const TOAST_MESSAGES = {
  SESSION_EXPIRED: {
    title: '🔒 Acceso Requerido',
    description: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente para continuar.',
  },
  DATE_ERROR: {
    title: '⚠️ Error en las Fechas',
    description: 'La fecha de inicio debe ser anterior a la fecha de finalización. Por favor, verifica las fechas seleccionadas.',
  },
  REQUIRED_FIELDS: {
    title: '⚠️ Campos Requeridos',
    description: 'Hay algunos campos obligatorios que necesitan ser completados. Revisa los campos marcados en rojo y completa la información faltante.',
  },
  PERMISSION_ERROR: {
    title: '🔒 Sin Permisos',
    description: 'No tienes permisos para realizar esta acción. Contacta a tu administrador.',
  },
  NETWORK_ERROR: {
    title: '🌐 Problema de Conexión',
    description: 'Hay un problema con tu conexión a internet. Verifica tu conexión e intenta nuevamente.',
  },
};

// Placeholder texts
export const PLACEHOLDERS = {
  CLIENT: 'Ej: Nombre de la cuenta',
  PROJECT: 'Seleccionar una Carpeta',
  TASK_NAME: 'Ej: Crear wireframe',
  DESCRIPTION: 'Ej: Diseñar wireframes para la nueva app móvil',
  OBJECTIVES: 'Ej: Aumentar la usabilidad del producto en un 20%',
  DATE: 'Selecciona una fecha',
  LEADER: 'Ej: John Doe',
  COLLABORATOR: 'Ej: John Doe',
};

// Empty messages
export const EMPTY_MESSAGES = {
  NO_CLIENTS_ADMIN: 'No hay coincidencias. Crea una nueva cuenta.',
  NO_CLIENTS_USER: 'No hay coincidencias. Pide a un administrador que cree una cuenta.',
  NO_PROJECTS_ADMIN: 'No hay carpetas disponibles. ¡Crea una nueva para organizar tus tareas!',
  NO_PROJECTS_USER: 'No hay carpetas disponibles. Pide a un administrador que añada una para tu proyecto.',
  NO_USERS_ADMIN: 'No hay coincidencias. Invita a nuevos colaboradores.',
  NO_USERS_USER: 'No hay coincidencias. Pide a un administrador que invite a más colaboradores.',
};
