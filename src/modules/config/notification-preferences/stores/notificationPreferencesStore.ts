/**
 * @module config/notification-preferences/stores
 * @description Store Zustand para preferencias de notificaciones por entidad
 */

import { create } from 'zustand';
import type {
  NotificationEntityType,
  TaskNotificationPreferences,
  TeamNotificationPreferences,
} from '../types';
import {
  DEFAULT_TASK_NOTIFICATION_PREFERENCES,
  DEFAULT_TEAM_NOTIFICATION_PREFERENCES,
} from '../types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Union type for all notification preferences
 */
type AnyNotificationPreferences = TaskNotificationPreferences | TeamNotificationPreferences;

interface NotificationPreferencesState {
  isOpen: boolean;
  entityType: NotificationEntityType | null;
  entityId: string | null;
  entityName: string | null;
  preferences: AnyNotificationPreferences;
  originalPreferences: AnyNotificationPreferences;
  hasChanges: boolean;
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;
}

interface NotificationPreferencesActions {
  open: (entityType: NotificationEntityType, entityId: string, entityName?: string) => void;
  close: () => void;
  setPreferences: (prefs: AnyNotificationPreferences) => void;
  setOriginalPreferences: (prefs: AnyNotificationPreferences) => void;
  updatePreference: (key: string, value: boolean) => void;
  enableAll: () => void;
  disableAll: () => void;
  resetToOriginal: () => void;
  setIsSaving: (value: boolean) => void;
  setIsLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
  markAsSaved: () => void;
}

type NotificationPreferencesStore = NotificationPreferencesState & NotificationPreferencesActions;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get default preferences based on entity type
 */
const getDefaultPreferences = (entityType: NotificationEntityType | null): AnyNotificationPreferences => {
  if (entityType === 'team') {
    return { ...DEFAULT_TEAM_NOTIFICATION_PREFERENCES };
  }
  return { ...DEFAULT_TASK_NOTIFICATION_PREFERENCES };
};

const calculateHasChanges = (
  current: AnyNotificationPreferences,
  original: AnyNotificationPreferences
): boolean => {
  const currentRecord = current as unknown as Record<string, boolean>;
  const originalRecord = original as unknown as Record<string, boolean>;
  return Object.keys(currentRecord).some(
    (key) => currentRecord[key] !== originalRecord[key]
  );
};

/**
 * Create all task preferences with a value
 */
const createAllTaskPreferences = (value: boolean): TaskNotificationPreferences => ({
  updated: value,
  statusChanged: value,
  priorityChanged: value,
  datesChanged: value,
  assignmentChanged: value,
  archived: value,
  unarchived: value,
  deleted: value,
});

/**
 * Create all team preferences with a value
 */
const createAllTeamPreferences = (value: boolean): TeamNotificationPreferences => ({
  newMessage: value,
  memberAdded: value,
});

// ============================================================================
// STORE
// ============================================================================

export const useNotificationPreferencesStore = create<NotificationPreferencesStore>((set, get) => ({
  // Initial state
  isOpen: false,
  entityType: null,
  entityId: null,
  entityName: null,
  preferences: { ...DEFAULT_TASK_NOTIFICATION_PREFERENCES },
  originalPreferences: { ...DEFAULT_TASK_NOTIFICATION_PREFERENCES },
  hasChanges: false,
  isSaving: false,
  isLoading: false,
  error: null,

  // Actions
  open: (entityType, entityId, entityName) => {
    const defaults = getDefaultPreferences(entityType);
    set({
      isOpen: true,
      entityType,
      entityId,
      entityName: entityName || null,
      error: null,
      // Reset to defaults for this entity type until loaded from Firestore
      preferences: defaults,
      originalPreferences: defaults,
      hasChanges: false,
    });
  },

  close: () => {
    set({
      isOpen: false,
      entityType: null,
      entityId: null,
      entityName: null,
      preferences: { ...DEFAULT_TASK_NOTIFICATION_PREFERENCES },
      originalPreferences: { ...DEFAULT_TASK_NOTIFICATION_PREFERENCES },
      hasChanges: false,
      error: null,
    });
  },

  setPreferences: (prefs) => {
    const { originalPreferences } = get();
    set({
      preferences: prefs,
      hasChanges: calculateHasChanges(prefs, originalPreferences),
    });
  },

  setOriginalPreferences: (prefs) => set({
    originalPreferences: prefs,
    preferences: prefs,
    hasChanges: false,
    isLoading: false,
  }),

  updatePreference: (key, value) => {
    const { preferences, originalPreferences } = get();
    const newPreferences = { ...preferences, [key]: value } as AnyNotificationPreferences;
    set({
      preferences: newPreferences,
      hasChanges: calculateHasChanges(newPreferences, originalPreferences),
    });
  },

  enableAll: () => {
    const { entityType, originalPreferences } = get();
    const allEnabled = entityType === 'team'
      ? createAllTeamPreferences(true)
      : createAllTaskPreferences(true);
    set({
      preferences: allEnabled,
      hasChanges: calculateHasChanges(allEnabled, originalPreferences),
    });
  },

  disableAll: () => {
    const { entityType, originalPreferences } = get();
    const allDisabled = entityType === 'team'
      ? createAllTeamPreferences(false)
      : createAllTaskPreferences(false);
    set({
      preferences: allDisabled,
      hasChanges: calculateHasChanges(allDisabled, originalPreferences),
    });
  },

  resetToOriginal: () => {
    const { originalPreferences } = get();
    set({
      preferences: { ...originalPreferences },
      hasChanges: false,
      error: null,
    });
  },

  setIsSaving: (value) => set({ isSaving: value }),
  setIsLoading: (value) => set({ isLoading: value }),
  setError: (error) => set({ error }),

  markAsSaved: () => {
    const { preferences } = get();
    set({
      originalPreferences: { ...preferences },
      hasChanges: false,
      isSaving: false,
    });
  },
}));
