/**
 * @module config/notification-preferences/hooks
 * @description Hook para gestionar preferencias de notificaciones por entidad
 *
 * Lee/escribe en: {entityType}s/{entityId}/notificationPreferences/{userId}
 */

'use client';

import { useCallback, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useNotificationPreferencesStore } from '../stores';
import type {
  NotificationEntityType,
  TaskNotificationPreferences,
  TeamNotificationPreferences,
} from '../types';
import {
  DEFAULT_TASK_NOTIFICATION_PREFERENCES,
  DEFAULT_TEAM_NOTIFICATION_PREFERENCES,
} from '../types';

/**
 * Type union for preferences
 */
type AnyNotificationPreferences = TaskNotificationPreferences | TeamNotificationPreferences;

/**
 * Get default preferences based on entity type
 */
function getDefaultsForType(type: NotificationEntityType): AnyNotificationPreferences {
  return type === 'team'
    ? DEFAULT_TEAM_NOTIFICATION_PREFERENCES
    : DEFAULT_TASK_NOTIFICATION_PREFERENCES;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Construye la ruta de la subcolección
 */
function getPreferencesDocPath(
  entityType: NotificationEntityType,
  entityId: string,
  userId: string
): string {
  const collection = entityType === 'task' ? 'tasks' : 'teams';
  return `${collection}/${entityId}/notificationPreferences/${userId}`;
}

// ============================================================================
// HOOK
// ============================================================================

export function useNotificationPreferences() {
  const { userId } = useAuth();

  // Selectores individuales
  const isOpen = useNotificationPreferencesStore((s) => s.isOpen);
  const entityType = useNotificationPreferencesStore((s) => s.entityType);
  const entityId = useNotificationPreferencesStore((s) => s.entityId);
  const entityName = useNotificationPreferencesStore((s) => s.entityName);
  const preferences = useNotificationPreferencesStore((s) => s.preferences);
  const hasChanges = useNotificationPreferencesStore((s) => s.hasChanges);
  const isSaving = useNotificationPreferencesStore((s) => s.isSaving);
  const isLoading = useNotificationPreferencesStore((s) => s.isLoading);
  const error = useNotificationPreferencesStore((s) => s.error);

  // Acciones del store
  const open = useNotificationPreferencesStore((s) => s.open);
  const close = useNotificationPreferencesStore((s) => s.close);
  const setOriginalPreferences = useNotificationPreferencesStore((s) => s.setOriginalPreferences);
  const updatePreference = useNotificationPreferencesStore((s) => s.updatePreference);
  const enableAll = useNotificationPreferencesStore((s) => s.enableAll);
  const disableAll = useNotificationPreferencesStore((s) => s.disableAll);
  const resetToOriginal = useNotificationPreferencesStore((s) => s.resetToOriginal);
  const setIsSaving = useNotificationPreferencesStore((s) => s.setIsSaving);
  const setIsLoading = useNotificationPreferencesStore((s) => s.setIsLoading);
  const setError = useNotificationPreferencesStore((s) => s.setError);
  const markAsSaved = useNotificationPreferencesStore((s) => s.markAsSaved);

  /**
   * Carga preferencias desde Firestore
   */
  const loadPreferences = useCallback(async () => {
    if (!userId || !entityType || !entityId) return;

    setIsLoading(true);
    setError(null);

    // Get defaults for this entity type
    const defaults = getDefaultsForType(entityType);

    try {
      const docPath = getPreferencesDocPath(entityType, entityId, userId);
      const docRef = doc(db, docPath);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as AnyNotificationPreferences;
        // Merge con defaults para asegurar que todas las keys existen
        const merged = {
          ...defaults,
          ...data,
        };
        setOriginalPreferences(merged);
      } else {
        // No existe documento: usar defaults (todas ON)
        setOriginalPreferences(defaults);
      }
    } catch (err) {
      console.error('[NotificationPreferences] Error loading:', err);
      setError('Error al cargar preferencias');
      setOriginalPreferences(defaults);
    }
  }, [userId, entityType, entityId, setIsLoading, setError, setOriginalPreferences]);

  /**
   * Guarda preferencias en Firestore
   */
  const save = useCallback(async (): Promise<boolean> => {
    const state = useNotificationPreferencesStore.getState();
    const { entityType: type, entityId: id, preferences: prefs } = state;

    if (!userId || !type || !id) {
      setError('Datos incompletos');
      return false;
    }

    setIsSaving(true);
    setError(null);

    try {
      const docPath = getPreferencesDocPath(type, id, userId);
      const docRef = doc(db, docPath);

      await setDoc(docRef, {
        ...prefs,
        userId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      markAsSaved();
      return true;
    } catch (err) {
      console.error('[NotificationPreferences] Error saving:', err);
      setError('Error al guardar preferencias');
      setIsSaving(false);
      return false;
    }
  }, [userId, setIsSaving, setError, markAsSaved]);

  // Cargar preferencias cuando el diálogo se abre
  useEffect(() => {
    if (isOpen && userId && entityType && entityId) {
      loadPreferences();
    }
  }, [isOpen, userId, entityType, entityId, loadPreferences]);

  return {
    // Estado
    isOpen,
    entityType,
    entityId,
    entityName,
    preferences,
    hasChanges,
    isSaving,
    isLoading,
    error,
    // Acciones UI
    open,
    close,
    updatePreference,
    enableAll,
    disableAll,
    resetToOriginal,
    // Acciones Firestore
    save,
    loadPreferences,
  };
}
