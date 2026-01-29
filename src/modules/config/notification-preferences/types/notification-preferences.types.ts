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
// PREFERENCES INTERFACE
// ============================================================================

/**
 * Preferencias de notificaciones por email para una entidad específica.
 * NO incluye taskCreated porque estas preferencias son POR tarea/equipo,
 * no globales. Si estás viendo las preferencias, ya estás en la entidad.
 */
export interface EntityNotificationPreferences {
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

/**
 * Documento completo en Firestore
 */
export interface NotificationPreferencesDocument extends EntityNotificationPreferences {
  /** ID del usuario */
  userId: string;
  /** Fecha de creación */
  createdAt: string;
  /** Última actualización */
  updatedAt: string;
}

// ============================================================================
// DEFAULTS
// ============================================================================

/**
 * Por defecto todas las notificaciones están activadas
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: EntityNotificationPreferences = {
  updated: true,
  statusChanged: true,
  priorityChanged: true,
  datesChanged: true,
  assignmentChanged: true,
  archived: true,
  unarchived: true,
  deleted: true,
};

// ============================================================================
// MAPPING
// ============================================================================

/**
 * Mapeo de NotificationType del mailer a la key en preferencias
 * Solo los tipos que aplican por entidad (excluye task_created)
 */
export const NOTIFICATION_TYPE_TO_PREF_KEY: Partial<Record<NotificationType, keyof EntityNotificationPreferences>> = {
  task_updated: 'updated',
  task_status_changed: 'statusChanged',
  task_priority_changed: 'priorityChanged',
  task_dates_changed: 'datesChanged',
  task_assignment_changed: 'assignmentChanged',
  task_archived: 'archived',
  task_unarchived: 'unarchived',
  task_deleted: 'deleted',
};

// ============================================================================
// UI CONFIG
// ============================================================================

/**
 * Configuración de UI para cada preferencia
 */
export interface NotificationPreferenceConfig {
  key: keyof EntityNotificationPreferences;
  label: string;
  description: string;
  category: 'changes' | 'lifecycle';
}

/**
 * Configuración de preferencias para renderizar en UI
 */
export const NOTIFICATION_PREFERENCES_CONFIG: NotificationPreferenceConfig[] = [
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

/**
 * Categorías de preferencias
 */
export const PREFERENCE_CATEGORIES = {
  changes: {
    title: 'Cambios',
    description: 'Notificaciones sobre modificaciones',
  },
  lifecycle: {
    title: 'Ciclo de Vida',
    description: 'Archivado, reactivación y eliminación',
  },
} as const;
