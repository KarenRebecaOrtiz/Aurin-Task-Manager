/**
 * @module config/notification-preferences/components
 * @description Diálogo para configurar preferencias de notificaciones por entidad
 */

'use client';

import React, { useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, CheckCircle2, XCircle } from 'lucide-react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  DialogActions,
} from '@/modules/dialogs';
import { useMediaQuery } from '@/modules/dialogs/hooks/useMediaQuery';
import { useNotificationPreferences } from '../hooks';
import {
  TASK_NOTIFICATION_PREFERENCES_CONFIG,
  TEAM_NOTIFICATION_PREFERENCES_CONFIG,
  TASK_PREFERENCE_CATEGORIES,
  TEAM_PREFERENCE_CATEGORIES,
} from '../types';
import styles from './NotificationPreferencesDialog.module.scss';

// ============================================================================
// ANIMATIONS
// ============================================================================

const panelVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

// ============================================================================
// SWITCH ROW COMPONENT
// ============================================================================

interface SwitchRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function SwitchRow({ label, description, checked, onChange, disabled }: SwitchRowProps) {
  return (
    <div className={styles.switchRow}>
      <div className={styles.switchContent}>
        <span className={styles.switchLabel}>{label}</span>
        <span className={styles.switchDescription}>{description}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`${styles.switch} ${checked ? styles.switchActive : ''}`}
        onClick={() => onChange(!checked)}
        disabled={disabled}
      >
        <span className={styles.switchThumb} />
      </button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NotificationPreferencesDialog() {
  const isMobile = useMediaQuery('(max-width: 767px)');

  const {
    isOpen,
    entityType,
    preferences,
    hasChanges,
    isSaving,
    isLoading,
    error,
    close,
    updatePreference,
    enableAll,
    disableAll,
    resetToOriginal,
    save,
  } = useNotificationPreferences();

  const handleSave = useCallback(async () => {
    const success = await save();
    if (success) {
      close();
    }
  }, [save, close]);

  const handleCancel = useCallback(() => {
    resetToOriginal();
    close();
  }, [resetToOriginal, close]);

  // Select config based on entity type
  const preferencesConfig = useMemo(() => {
    return entityType === 'team'
      ? TEAM_NOTIFICATION_PREFERENCES_CONFIG
      : TASK_NOTIFICATION_PREFERENCES_CONFIG;
  }, [entityType]);

  const categoriesConfig = useMemo(() => {
    return entityType === 'team'
      ? TEAM_PREFERENCE_CATEGORIES
      : TASK_PREFERENCE_CATEGORIES;
  }, [entityType]);

  // Agrupar preferencias por categoría
  type PreferenceConfig = { key: string; label: string; description: string; category: string };
  const preferencesByCategory = useMemo(() => {
    return (preferencesConfig as PreferenceConfig[]).reduce(
      (acc, config) => {
        if (!acc[config.category]) {
          acc[config.category] = [];
        }
        acc[config.category].push(config);
        return acc;
      },
      {} as Record<string, PreferenceConfig[]>
    );
  }, [preferencesConfig]);

  // Título según tipo de entidad
  const dialogTitle = entityType === 'team'
    ? 'Notificaciones del equipo'
    : 'Notificaciones de esta tarea';

  // ============================================================================
  // FORM CONTENT
  // ============================================================================

  const formContent = (
    <div className={styles.content}>
      {/* Acciones rápidas */}
      <div className={styles.quickActions}>
        <button
          type="button"
          className={styles.quickAction}
          onClick={enableAll}
          disabled={isLoading || isSaving}
        >
          <CheckCircle2 size={14} />
          Activar todas
        </button>
        <button
          type="button"
          className={styles.quickAction}
          onClick={disableAll}
          disabled={isLoading || isSaving}
        >
          <XCircle size={14} />
          Desactivar todas
        </button>
      </div>

      {/* Error */}
      {error && <div className={styles.error}>{error}</div>}

      {/* Loading */}
      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Cargando preferencias...</span>
        </div>
      ) : (
        /* Categorías */
        Object.entries(preferencesByCategory).map(([category, configs]) => (
          <div key={category} className={styles.category}>
            <div className={styles.categoryHeader}>
              <h3 className={styles.categoryTitle}>
                {(categoriesConfig as Record<string, { title: string; description: string }>)[category]?.title || category}
              </h3>
              <p className={styles.categoryDescription}>
                {(categoriesConfig as Record<string, { title: string; description: string }>)[category]?.description || ''}
              </p>
            </div>
            <div className={styles.switchList}>
              {configs.map((config) => (
                <SwitchRow
                  key={config.key}
                  label={config.label}
                  description={config.description}
                  checked={(preferences as unknown as Record<string, boolean>)[config.key] ?? true}
                  onChange={(value) => updatePreference(config.key, value)}
                  disabled={isSaving}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <ResponsiveDialogContent size="md" closeOnOverlayClick={false}>
        {isMobile ? (
          <>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>
                <div className={styles.titleWrapper}>
                  <Mail size={20} className={styles.titleIcon} />
                  {dialogTitle}
                </div>
              </ResponsiveDialogTitle>
            </ResponsiveDialogHeader>
            <ResponsiveDialogBody>{formContent}</ResponsiveDialogBody>
            <ResponsiveDialogFooter>
              <DialogActions
                onCancel={handleCancel}
                onSubmit={handleSave}
                isLoading={isSaving}
                submitDisabled={!hasChanges || isLoading}
                cancelText="Cancelar"
                submitText="Guardar"
              />
            </ResponsiveDialogFooter>
          </>
        ) : (
          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.div
                variants={panelVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <ResponsiveDialogHeader>
                  <ResponsiveDialogTitle>
                    <div className={styles.titleWrapper}>
                      <Mail size={20} className={styles.titleIcon} />
                      {dialogTitle}
                    </div>
                  </ResponsiveDialogTitle>
                </ResponsiveDialogHeader>
                <div className={styles.formContent}>{formContent}</div>
                <div className={styles.footer}>
                  <DialogActions
                    onCancel={handleCancel}
                    onSubmit={handleSave}
                    isLoading={isSaving}
                    submitDisabled={!hasChanges || isLoading}
                    cancelText="Cancelar"
                    submitText="Guardar cambios"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
