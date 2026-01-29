/**
 * @module config/notification-preferences/stores
 * @description Store Zustand para preferencias de notificaciones por entidad
 */

import { create } from 'zustand';
import type { EntityNotificationPreferences, NotificationEntityType } from '../types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface NotificationPreferencesState {
  isOpen: boolean;
  entityType: NotificationEntityType | null;
  entityId: string | null;
  preferences: EntityNotificationPreferences;
  originalPreferences: EntityNotificationPreferences;
  hasChanges: boolean;
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;
}

interface NotificationPreferencesActions {
  open: (entityType: NotificationEntityType, entityId: string) => void;
  close: () => void;
  setPreferences: (prefs: EntityNotificationPreferences) => void;
  setOriginalPreferences: (prefs: EntityNotificationPreferences) => void;
  updatePreference: (key: keyof EntityNotificationPreferences, value: boolean) => void;
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

const calculateHasChanges = (
  current: EntityNotificationPreferences,
  original: EntityNotificationPreferences
): boolean => {
  return Object.keys(current).some(
    (key) => current[key as keyof EntityNotificationPreferences] !== original[key as keyof EntityNotificationPreferences]
  );
};

const createAllPreferences = (value: boolean): EntityNotificationPreferences => ({
  updated: value,
  statusChanged: value,
  priorityChanged: value,
  datesChanged: value,
  assignmentChanged: value,
  archived: value,
  unarchived: value,
  deleted: value,
});

// ============================================================================
// STORE
// ============================================================================

export const useNotificationPreferencesStore = create<NotificationPreferencesStore>((set, get) => ({
  // Initial state
  isOpen: false,
  entityType: null,
  entityId: null,
  preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
  originalPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
  hasChanges: false,
  isSaving: false,
  isLoading: false,
  error: null,

  // Actions
  open: (entityType, entityId) => set({
    isOpen: true,
    entityType,
    entityId,
    error: null,
    // Reset to defaults until loaded from Firestore
    preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
    originalPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
    hasChanges: false,
  }),

  close: () => {
    set({
      isOpen: false,
      entityType: null,
      entityId: null,
      preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
      originalPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
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
    const newPreferences = { ...preferences, [key]: value };
    set({
      preferences: newPreferences,
      hasChanges: calculateHasChanges(newPreferences, originalPreferences),
    });
  },

  enableAll: () => {
    const { originalPreferences } = get();
    const allEnabled = createAllPreferences(true);
    set({
      preferences: allEnabled,
      hasChanges: calculateHasChanges(allEnabled, originalPreferences),
    });
  },

  disableAll: () => {
    const { originalPreferences } = get();
    const allDisabled = createAllPreferences(false);
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
