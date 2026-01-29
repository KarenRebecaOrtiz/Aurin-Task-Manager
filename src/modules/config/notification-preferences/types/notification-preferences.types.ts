/**
 * @module config/notification-preferences/types
 * @description Tipos para preferencias de notificaciones por entidad (tarea/equipo)
 *
 * Las preferencias son específicas por entidad, no globales del usuario.
 * Se almacenan en: {entityType}s/{entityId}/notificationPreferences/{userId}
 */

import type { NotificationType } from '@/modules/mailer/services/notification.service';

// ============================================================================
// ENTITY TYPES
// ============================================================================

/**
 * Tipos de entidad que soportan preferencias de notificaciones
 */
export type NotificationEntityType = 'task' | 'team';

// ============================================================================
// TASK PREFERENCES INTERFACE
// ============================================================================

/**
 * Preferencias de notificaciones por email para una TAREA específica.
 * NO incluye taskCreated porque estas preferencias son POR tarea,
 * no globales. Si estás viendo las preferencias, ya estás en la tarea.
 */
export interface TaskNotificationPreferences {
  /** Notificación de actualizaciones generales */
  updated: boolean;
  /** Notificación de cambios de estado */
  statusChanged: boolean;
  /** Notificación de cambios de prioridad */
  priorityChanged: boolean;
  /** Notificación de cambios de fechas */
  datesChanged: boolean;
  /** Notificación de cambios de asignación/miembros */
  assignmentChanged: boolean;
  /** Notificación cuando se archiva */
  archived: boolean;
  /** Notificación cuando se desarchiva */
  unarchived: boolean;
  /** Notificación cuando se elimina */
  deleted: boolean;
}

// ============================================================================
// TEAM PREFERENCES INTERFACE
// ============================================================================

/**
 * Preferencias de notificaciones por email para un EQUIPO específico.
 * NO incluye team_member_added_you porque esa notificación siempre se envía
 * cuando te agregan a un equipo (no es configurable).
 * Solo 2 preferencias configurables para teams.
 */
export interface TeamNotificationPreferences {
  /** Notificación de nuevos mensajes en el equipo */
  newMessage: boolean;
  /** Notificación cuando se agregan nuevos miembros */
  memberAdded: boolean;
}

// ============================================================================
// UNIFIED TYPE (para compatibilidad)
// ============================================================================

/**
 * Alias para TaskNotificationPreferences (compatibilidad hacia atrás)
 * @deprecated Usar TaskNotificationPreferences o TeamNotificationPreferences según el caso
 */
export type EntityNotificationPreferences = TaskNotificationPreferences;

/**
 * Documento completo en Firestore para tareas
 */
export interface TaskNotificationPreferencesDocument extends TaskNotificationPreferences {
  /** ID del usuario */
  userId: string;
  /** Fecha de creación */
  createdAt?: string;
  /** Última actualización */
  updatedAt: string;
}

/**
 * Documento completo en Firestore para equipos
 */
export interface TeamNotificationPreferencesDocument extends TeamNotificationPreferences {
  /** ID del usuario */
  userId: string;
  /** Fecha de creación */
  createdAt?: string;
  /** Última actualización */
  updatedAt: string;
}

/**
 * @deprecated Usar TaskNotificationPreferencesDocument o TeamNotificationPreferencesDocument
 */
export type NotificationPreferencesDocument = TaskNotificationPreferencesDocument;

// ============================================================================
// DEFAULTS
// ============================================================================

/**
 * Por defecto todas las notificaciones de TAREAS están activadas
 */
export const DEFAULT_TASK_NOTIFICATION_PREFERENCES: TaskNotificationPreferences = {
  updated: true,
  statusChanged: true,
  priorityChanged: true,
  datesChanged: true,
  assignmentChanged: true,
  archived: true,
  unarchived: true,
  deleted: true,
};

/**
 * Por defecto todas las notificaciones de EQUIPOS están activadas
 */
export const DEFAULT_TEAM_NOTIFICATION_PREFERENCES: TeamNotificationPreferences = {
  newMessage: true,
  memberAdded: true,
};

/**
 * @deprecated Usar DEFAULT_TASK_NOTIFICATION_PREFERENCES o DEFAULT_TEAM_NOTIFICATION_PREFERENCES
 */
export const DEFAULT_NOTIFICATION_PREFERENCES = DEFAULT_TASK_NOTIFICATION_PREFERENCES;

// ============================================================================
// MAPPING
// ============================================================================

/**
 * Mapeo de NotificationType del mailer a la key en preferencias de TAREAS
 * Solo los tipos que aplican por tarea (excluye task_created)
 */
export const TASK_NOTIFICATION_TYPE_TO_PREF_KEY: Partial<Record<NotificationType, keyof TaskNotificationPreferences>> = {
  task_updated: 'updated',
  task_status_changed: 'statusChanged',
  task_priority_changed: 'priorityChanged',
  task_dates_changed: 'datesChanged',
  task_assignment_changed: 'assignmentChanged',
  task_archived: 'archived',
  task_unarchived: 'unarchived',
  task_deleted: 'deleted',
};

/**
 * Mapeo de NotificationType del mailer a la key en preferencias de EQUIPOS
 * Solo los tipos configurables (excluye team_member_added_you que siempre se envía)
 */
export const TEAM_NOTIFICATION_TYPE_TO_PREF_KEY: Partial<Record<NotificationType, keyof TeamNotificationPreferences>> = {
  team_new_message: 'newMessage',
  team_member_added: 'memberAdded',
};

/**
 * @deprecated Usar TASK_NOTIFICATION_TYPE_TO_PREF_KEY o TEAM_NOTIFICATION_TYPE_TO_PREF_KEY
 */
export const NOTIFICATION_TYPE_TO_PREF_KEY = TASK_NOTIFICATION_TYPE_TO_PREF_KEY;

// ============================================================================
// UI CONFIG - TASKS
// ============================================================================

/**
 * Configuración de UI para cada preferencia de TAREA
 */
export interface TaskNotificationPreferenceConfig {
  key: keyof TaskNotificationPreferences;
  label: string;
  description: string;
  category: 'changes' | 'lifecycle';
}

/**
 * Configuración de preferencias de TAREAS para renderizar en UI
 */
export const TASK_NOTIFICATION_PREFERENCES_CONFIG: TaskNotificationPreferenceConfig[] = [
  // Cambios
  {
    key: 'updated',
    label: 'Actualizaciones generales',
    description: 'Cambios generales en esta tarea',
    category: 'changes',
  },
  {
    key: 'statusChanged',
    label: 'Cambios de estado',
    description: 'Cuando cambia el estado (ej: en proceso → finalizado)',
    category: 'changes',
  },
  {
    key: 'priorityChanged',
    label: 'Cambios de prioridad',
    description: 'Cuando cambia la prioridad',
    category: 'changes',
  },
  {
    key: 'datesChanged',
    label: 'Cambios de fechas',
    description: 'Cuando se modifican las fechas de inicio o fin',
    category: 'changes',
  },
  {
    key: 'assignmentChanged',
    label: 'Cambios de equipo',
    description: 'Cuando se agregan o quitan miembros',
    category: 'changes',
  },
  // Ciclo de vida
  {
    key: 'archived',
    label: 'Archivado',
    description: 'Cuando se archiva esta tarea',
    category: 'lifecycle',
  },
  {
    key: 'unarchived',
    label: 'Reactivado',
    description: 'Cuando se desarchiva esta tarea',
    category: 'lifecycle',
  },
  {
    key: 'deleted',
    label: 'Eliminado',
    description: 'Cuando se elimina esta tarea',
    category: 'lifecycle',
  },
];

// ============================================================================
// UI CONFIG - TEAMS
// ============================================================================

/**
 * Configuración de UI para cada preferencia de EQUIPO
 */
export interface TeamNotificationPreferenceConfig {
  key: keyof TeamNotificationPreferences;
  label: string;
  description: string;
  category: 'activity';
}

/**
 * Configuración de preferencias de EQUIPOS para renderizar en UI
 */
export const TEAM_NOTIFICATION_PREFERENCES_CONFIG: TeamNotificationPreferenceConfig[] = [
  {
    key: 'newMessage',
    label: 'Mensajes del equipo',
    description: 'Recibe un correo cada vez que alguien publique en el chat',
    category: 'activity',
  },
  {
    key: 'memberAdded',
    label: 'Cambios en los miembros',
    description: 'Avísame cuando alguien se una o salga del equipo',
    category: 'activity',
  },
];

// ============================================================================
// CATEGORIES
// ============================================================================

/**
 * Categorías de preferencias para TAREAS
 */
export const TASK_PREFERENCE_CATEGORIES = {
  changes: {
    title: 'Cambios',
    description: 'Notificaciones sobre modificaciones',
  },
  lifecycle: {
    title: 'Ciclo de Vida',
    description: 'Archivado, reactivación y eliminación',
  },
} as const;

/**
 * Categorías de preferencias para EQUIPOS
 */
export const TEAM_PREFERENCE_CATEGORIES = {
  activity: {
    title: 'Actividad',
    description: 'Notificaciones sobre actividad en el equipo',
  },
} as const;

// ============================================================================
// ALIASES (compatibilidad hacia atrás)
// ============================================================================

/**
 * @deprecated Usar TaskNotificationPreferenceConfig
 */
export type NotificationPreferenceConfig = TaskNotificationPreferenceConfig;

/**
 * @deprecated Usar TASK_NOTIFICATION_PREFERENCES_CONFIG
 */
export const NOTIFICATION_PREFERENCES_CONFIG = TASK_NOTIFICATION_PREFERENCES_CONFIG;

/**
 * @deprecated Usar TASK_PREFERENCE_CATEGORIES
 */
export const PREFERENCE_CATEGORIES = TASK_PREFERENCE_CATEGORIES;
