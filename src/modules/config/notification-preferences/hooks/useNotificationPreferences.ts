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
  userId: string,
  channel: 'email' | 'push' = 'email'
): string {
  const collection = entityType === 'task' ? 'tasks' : 'teams';
  const subcollection = channel === 'push' ? 'pushNotificationPreferences' : 'notificationPreferences';
  return `${collection}/${entityId}/${subcollection}/${userId}`;
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
  const activeChannel = useNotificationPreferencesStore((s) => s.activeChannel);
  const preferences = useNotificationPreferencesStore((s) => s.preferences);
  const hasChanges = useNotificationPreferencesStore((s) => s.hasChanges);
  const pushPreferences = useNotificationPreferencesStore((s) => s.pushPreferences);
  const hasPushChanges = useNotificationPreferencesStore((s) => s.hasPushChanges);
  const isSaving = useNotificationPreferencesStore((s) => s.isSaving);
  const isLoading = useNotificationPreferencesStore((s) => s.isLoading);
  const error = useNotificationPreferencesStore((s) => s.error);

  // Acciones del store
  const open = useNotificationPreferencesStore((s) => s.open);
  const close = useNotificationPreferencesStore((s) => s.close);
  const setActiveChannel = useNotificationPreferencesStore((s) => s.setActiveChannel);
  const setOriginalPreferences = useNotificationPreferencesStore((s) => s.setOriginalPreferences);
  const updatePreference = useNotificationPreferencesStore((s) => s.updatePreference);
  const enableAll = useNotificationPreferencesStore((s) => s.enableAll);
  const disableAll = useNotificationPreferencesStore((s) => s.disableAll);
  const setOriginalPushPreferences = useNotificationPreferencesStore((s) => s.setOriginalPushPreferences);
  const updatePushPreference = useNotificationPreferencesStore((s) => s.updatePushPreference);
  const enableAllPush = useNotificationPreferencesStore((s) => s.enableAllPush);
  const disableAllPush = useNotificationPreferencesStore((s) => s.disableAllPush);
  const resetToOriginal = useNotificationPreferencesStore((s) => s.resetToOriginal);
  const setIsSaving = useNotificationPreferencesStore((s) => s.setIsSaving);
  const setIsLoading = useNotificationPreferencesStore((s) => s.setIsLoading);
  const setError = useNotificationPreferencesStore((s) => s.setError);
  const markAsSaved = useNotificationPreferencesStore((s) => s.markAsSaved);
  const markPushAsSaved = useNotificationPreferencesStore((s) => s.markPushAsSaved);

  /**
   * Carga preferencias desde Firestore (email + push)
   */
  const loadPreferences = useCallback(async () => {
    if (!userId || !entityType || !entityId) return;

    setIsLoading(true);
    setError(null);

    // Get defaults for this entity type
    const defaults = getDefaultsForType(entityType);

    try {
      // Load email and push preferences in parallel
      const emailDocPath = getPreferencesDocPath(entityType, entityId, userId, 'email');
      const pushDocPath = getPreferencesDocPath(entityType, entityId, userId, 'push');

      const [emailSnap, pushSnap] = await Promise.all([
        getDoc(doc(db, emailDocPath)),
        getDoc(doc(db, pushDocPath)),
      ]);

      // Email preferences
      if (emailSnap.exists()) {
        const data = emailSnap.data() as AnyNotificationPreferences;
        setOriginalPreferences({ ...defaults, ...data });
      } else {
        setOriginalPreferences(defaults);
      }

      // Push preferences
      if (pushSnap.exists()) {
        const data = pushSnap.data() as AnyNotificationPreferences;
        setOriginalPushPreferences({ ...defaults, ...data });
      } else {
        setOriginalPushPreferences({ ...defaults });
      }
    } catch (err) {
      console.error('[NotificationPreferences] Error loading:', err);
      setError('Error al cargar preferencias');
      setOriginalPreferences(defaults);
      setOriginalPushPreferences({ ...defaults });
    }
  }, [userId, entityType, entityId, setIsLoading, setError, setOriginalPreferences, setOriginalPushPreferences]);

  /**
   * Guarda preferencias de email en Firestore
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
      const docPath = getPreferencesDocPath(type, id, userId, 'email');
      const docRef = doc(db, docPath);

      await setDoc(docRef, {
        ...prefs,
        userId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      markAsSaved();
      return true;
    } catch (err) {
      console.error('[NotificationPreferences] Error saving email prefs:', err);
      setError('Error al guardar preferencias');
      setIsSaving(false);
      return false;
    }
  }, [userId, setIsSaving, setError, markAsSaved]);

  /**
   * Guarda preferencias de push en Firestore
   */
  const savePush = useCallback(async (): Promise<boolean> => {
    const state = useNotificationPreferencesStore.getState();
    const { entityType: type, entityId: id, pushPreferences: prefs } = state;

    if (!userId || !type || !id) {
      setError('Datos incompletos');
      return false;
    }

    setIsSaving(true);
    setError(null);

    try {
      const docPath = getPreferencesDocPath(type, id, userId, 'push');
      const docRef = doc(db, docPath);

      await setDoc(docRef, {
        ...prefs,
        userId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      markPushAsSaved();
      return true;
    } catch (err) {
      console.error('[NotificationPreferences] Error saving push prefs:', err);
      setError('Error al guardar preferencias');
      setIsSaving(false);
      return false;
    }
  }, [userId, setIsSaving, setError, markPushAsSaved]);

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
    activeChannel,
    preferences,
    hasChanges,
    pushPreferences,
    hasPushChanges,
    isSaving,
    isLoading,
    error,
    // Acciones UI
    open,
    close,
    setActiveChannel,
    updatePreference,
    enableAll,
    disableAll,
    updatePushPreference,
    enableAllPush,
    disableAllPush,
    resetToOriginal,
    // Acciones Firestore
    save,
    savePush,
    loadPreferences,
  };
}
