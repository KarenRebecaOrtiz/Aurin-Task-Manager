/**
 * @module config/notification-preferences/components
 * @description Diálogo para configurar preferencias de notificaciones por entidad
 *
 * Diseño minimalista con:
 * - Master toggle para habilitar/deshabilitar todas las notificaciones
 * - Lista plana con dividers sutiles
 * - Auto-save con toast de confirmación
 */

'use client';

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
} from '@/modules/dialogs';
import { useMediaQuery } from '@/modules/dialogs/hooks/useMediaQuery';
import { useNotificationPreferences } from '../hooks';
import {
  TASK_NOTIFICATION_PREFERENCES_CONFIG,
  TEAM_NOTIFICATION_PREFERENCES_CONFIG,
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
  isLast?: boolean;
}

function SwitchRow({ label, description, checked, onChange, disabled, isLast }: SwitchRowProps) {
  return (
    <div className={`${styles.switchRow} ${isLast ? styles.switchRowLast : ''}`}>
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
// MASTER TOGGLE COMPONENT
// ============================================================================

interface MasterToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

function MasterToggle({ enabled, onChange, disabled }: MasterToggleProps) {
  return (
    <div className={styles.masterToggle}>
      <div className={styles.masterToggleContent}>
        <span className={styles.masterToggleLabel}>
          Recibir notificaciones por correo
        </span>
        <span className={styles.masterToggleDescription}>
          Activa o desactiva todas las notificaciones de un solo paso
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Recibir notificaciones por correo"
        className={`${styles.switch} ${styles.switchLarge} ${enabled ? styles.switchActive : ''}`}
        onClick={() => onChange(!enabled)}
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
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    isOpen,
    entityType,
    entityName,
    preferences,
    isSaving,
    isLoading,
    error,
    close,
    updatePreference,
    enableAll,
    disableAll,
    save,
  } = useNotificationPreferences();

  // Select config based on entity type
  const preferencesConfig = useMemo(() => {
    return entityType === 'team'
      ? TEAM_NOTIFICATION_PREFERENCES_CONFIG
      : TASK_NOTIFICATION_PREFERENCES_CONFIG;
  }, [entityType]);

  // Calculate if all notifications are enabled (for master toggle)
  const allEnabled = useMemo(() => {
    const prefsRecord = preferences as unknown as Record<string, boolean>;
    return Object.values(prefsRecord).every((value) => value === true);
  }, [preferences]);

  // Auto-save function with debounce
  const triggerAutoSave = useCallback(() => {
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set a new timeout to save after 500ms
    saveTimeoutRef.current = setTimeout(async () => {
      const success = await save();
      if (success) {
        toast.success('Cambios guardados', {
          duration: 2000,
        });
      }
    }, 500);
  }, [save]);

  // Handle preference change with auto-save
  const handlePreferenceChange = useCallback((key: string, value: boolean) => {
    updatePreference(key, value);
    triggerAutoSave();
  }, [updatePreference, triggerAutoSave]);

  // Handle master toggle with auto-save
  const handleMasterToggle = useCallback((enabled: boolean) => {
    if (enabled) {
      enableAll();
    } else {
      disableAll();
    }
    triggerAutoSave();
  }, [enableAll, disableAll, triggerAutoSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    // Clear any pending save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    close();
  }, [close]);

  // Title based on entity type
  const dialogTitle = 'Preferencias de correo';

  // Subtitle with entity name
  const dialogSubtitle = entityName
    ? `Decide qué correos quieres recibir sobre la actividad en ${entityName}`
    : entityType === 'team'
      ? 'Decide qué correos quieres recibir sobre la actividad de este equipo'
      : 'Decide qué correos quieres recibir sobre la actividad de esta tarea';

  // ============================================================================
  // FORM CONTENT
  // ============================================================================

  const formContent = (
    <div className={styles.content}>
      {/* Error */}
      {error && <div className={styles.error}>{error}</div>}

      {/* Loading */}
      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Cargando preferencias...</span>
        </div>
      ) : (
        <>
          {/* Master Toggle */}
          <MasterToggle
            enabled={allEnabled}
            onChange={handleMasterToggle}
            disabled={isSaving}
          />

          {/* Divider */}
          <div className={styles.divider} />

          {/* Flat list of preferences */}
          <div className={styles.preferencesList}>
            {preferencesConfig.map((config, index) => (
              <SwitchRow
                key={config.key}
                label={config.label}
                description={config.description}
                checked={(preferences as unknown as Record<string, boolean>)[config.key] ?? true}
                onChange={(value) => handlePreferenceChange(config.key, value)}
                disabled={isSaving}
                isLast={index === preferencesConfig.length - 1}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <ResponsiveDialogContent size="md" closeOnOverlayClick>
        {isMobile ? (
          <>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>
                {dialogTitle}
              </ResponsiveDialogTitle>
              <p className={styles.subtitle}>{dialogSubtitle}</p>
            </ResponsiveDialogHeader>
            <ResponsiveDialogBody>{formContent}</ResponsiveDialogBody>
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
                  <p className={styles.subtitle}>{dialogSubtitle}</p>
                </ResponsiveDialogHeader>
                <div className={styles.formContent}>{formContent}</div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
