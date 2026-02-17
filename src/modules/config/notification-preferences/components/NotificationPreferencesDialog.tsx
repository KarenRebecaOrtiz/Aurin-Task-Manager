/**
 * @module config/notification-preferences/components
 * @description Diálogo para configurar preferencias de notificaciones por entidad
 *
 * Diseño con acordeones por categoría:
 * - Master toggle para habilitar/deshabilitar todas las notificaciones
 * - Categorías colapsables con toggle de grupo
 * - Toggles individuales dentro de cada categoría expandida
 * - Auto-save con toast de confirmación
 */

'use client';

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sileo } from 'sileo';
import { ChevronRight, Mail, BellRing, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/modules/push-notifications/client/hooks/usePushNotifications';
import type { NotificationChannel } from '../stores/notificationPreferencesStore';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
} from '@/modules/dialogs';
import { useMediaQuery } from '@/modules/dialogs/hooks/useMediaQuery';
import { useNotificationPreferences } from '../hooks';
import { useNotificationPreferencesStore } from '../stores';
import {
  TASK_NOTIFICATION_PREFERENCES_CONFIG,
  TEAM_NOTIFICATION_PREFERENCES_CONFIG,
  TASK_PREFERENCE_CATEGORIES,
  TEAM_PREFERENCE_CATEGORIES,
} from '../types';
import type {
  TaskNotificationPreferenceConfig,
  TeamNotificationPreferenceConfig,
} from '../types';
import styles from './NotificationPreferencesDialog.module.scss';

// ============================================================================
// TYPES
// ============================================================================

type AnyPreferenceConfig = TaskNotificationPreferenceConfig | TeamNotificationPreferenceConfig;

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
  channel: NotificationChannel;
}

function MasterToggle({ enabled, onChange, disabled, channel }: MasterToggleProps) {
  const label = channel === 'push'
    ? 'Recibir notificaciones push'
    : 'Recibir notificaciones por correo';

  return (
    <div className={styles.masterToggle}>
      <div className={styles.masterToggleContent}>
        <span className={styles.masterToggleLabel}>
          {label}
        </span>
        <span className={styles.masterToggleDescription}>
          Activa o desactiva todas las notificaciones de un solo paso
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
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
// CATEGORY ACCORDION COMPONENT
// ============================================================================

interface CategoryAccordionProps {
  categoryKey: string;
  title: string;
  description: string;
  items: AnyPreferenceConfig[];
  preferences: Record<string, boolean>;
  isExpanded: boolean;
  onExpandToggle: () => void;
  onPreferenceChange: (key: string, value: boolean) => void;
  onCategoryToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

function CategoryAccordion({
  title,
  description,
  items,
  preferences,
  isExpanded,
  onExpandToggle,
  onPreferenceChange,
  onCategoryToggle,
  disabled,
}: CategoryAccordionProps) {
  const allOn = items.every((item) => preferences[item.key] === true);
  const allOff = items.every((item) => preferences[item.key] === false);
  const isIndeterminate = !allOn && !allOff;

  const handleGroupToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    // If indeterminate or all off → enable all; if all on → disable all
    onCategoryToggle(!allOn);
  };

  return (
    <div className={styles.categorySection}>
      {/* Header */}
      <button
        type="button"
        className={styles.categoryHeader}
        onClick={onExpandToggle}
        aria-expanded={isExpanded}
      >
        <ChevronRight
          size={16}
          className={`${styles.categoryChevron} ${isExpanded ? styles.categoryChevronExpanded : ''}`}
        />
        <div className={styles.categoryMeta}>
          <div className={styles.categoryTitleRow}>
            <span className={styles.categoryTitle}>{title}</span>
            <span className={styles.categoryCount}>{items.length}</span>
          </div>
          <span className={styles.categoryDescription}>{description}</span>
        </div>
        {/* Group toggle */}
        <div
          role="switch"
          aria-checked={isIndeterminate ? 'mixed' : allOn}
          aria-label={`${title} - todas`}
          className={`${styles.switch} ${allOn ? styles.switchActive : ''} ${isIndeterminate ? styles.switchIndeterminate : ''}`}
          onClick={handleGroupToggle}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleGroupToggle(e as unknown as React.MouseEvent);
            }
          }}
        >
          <span className={styles.switchThumb}>
            {isIndeterminate && <span className={styles.switchIndeterminateMark} />}
          </span>
        </div>
      </button>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className={styles.categoryBodyWrapper}
          >
            <div className={styles.categoryBody}>
              {items.map((item, index) => (
                <SwitchRow
                  key={item.key}
                  label={item.label}
                  description={item.description}
                  checked={preferences[item.key] ?? true}
                  onChange={(value) => onPreferenceChange(item.key, value)}
                  disabled={disabled}
                  isLast={index === items.length - 1}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NotificationPreferencesDialog() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const { isSubscribed: pushIsSubscribed, isDenied: pushIsDenied, subscribe: pushSubscribe, isLoading: pushActivating } = usePushNotifications();

  const {
    isOpen,
    entityType,
    entityName,
    activeChannel,
    preferences,
    pushPreferences,
    isSaving,
    isLoading,
    error,
    close,
    setActiveChannel,
    updatePreference,
    enableAll,
    disableAll,
    updatePushPreference,
    enableAllPush,
    disableAllPush,
    save,
    savePush,
  } = useNotificationPreferences();

  // Reset expanded state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setExpandedCategories(new Set());
    }
  }, [isOpen]);

  // Select config and categories based on entity type
  const preferencesConfig = useMemo(() => {
    return entityType === 'team'
      ? TEAM_NOTIFICATION_PREFERENCES_CONFIG
      : TASK_NOTIFICATION_PREFERENCES_CONFIG;
  }, [entityType]);

  const categoriesMeta = useMemo(() => {
    return entityType === 'team'
      ? TEAM_PREFERENCE_CATEGORIES
      : TASK_PREFERENCE_CATEGORIES;
  }, [entityType]);

  // Group preferences by category
  const groupedPreferences = useMemo(() => {
    const grouped = new Map<string, AnyPreferenceConfig[]>();

    for (const item of preferencesConfig) {
      const group = grouped.get(item.category) || [];
      group.push(item);
      grouped.set(item.category, group);
    }

    return grouped;
  }, [preferencesConfig]);

  // Preferences as record for easy access (channel-aware)
  const currentPreferences = activeChannel === 'push' ? pushPreferences : preferences;
  const prefsRecord = currentPreferences as unknown as Record<string, boolean>;

  // Calculate if all notifications are enabled (for master toggle)
  const allEnabled = useMemo(() => {
    return Object.values(prefsRecord).every((value) => value === true);
  }, [prefsRecord]);

  // Auto-save function with debounce (channel-aware)
  const triggerAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const channel = useNotificationPreferencesStore.getState().activeChannel;
      const saveFn = channel === 'push' ? savePush : save;
      const success = await saveFn();
      if (success) {
        sileo.success({ title: 'Preferencias guardadas', description: 'Tus notificaciones se ajustaron correctamente.', duration: 3000 });
      }
    }, 500);
  }, [save, savePush]);

  // Handle preference change with auto-save (channel-aware)
  const handlePreferenceChange = useCallback((key: string, value: boolean) => {
    if (activeChannel === 'push') {
      updatePushPreference(key, value);
    } else {
      updatePreference(key, value);
    }
    triggerAutoSave();
  }, [activeChannel, updatePreference, updatePushPreference, triggerAutoSave]);

  // Handle category group toggle (channel-aware)
  const handleCategoryToggle = useCallback((items: AnyPreferenceConfig[], enabled: boolean) => {
    const updateFn = activeChannel === 'push' ? updatePushPreference : updatePreference;
    for (const item of items) {
      updateFn(item.key, enabled);
    }
    triggerAutoSave();
  }, [activeChannel, updatePreference, updatePushPreference, triggerAutoSave]);

  // Handle master toggle with auto-save (channel-aware)
  const handleMasterToggle = useCallback((enabled: boolean) => {
    if (activeChannel === 'push') {
      enabled ? enableAllPush() : disableAllPush();
    } else {
      enabled ? enableAll() : disableAll();
    }
    triggerAutoSave();
  }, [activeChannel, enableAll, disableAll, enableAllPush, disableAllPush, triggerAutoSave]);

  // Handle channel tab switch
  const handleChannelSwitch = useCallback((channel: NotificationChannel) => {
    // Save pending changes before switching
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setActiveChannel(channel);
  }, [setActiveChannel]);

  // Toggle accordion expansion
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

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
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    close();
  }, [close]);

  const dialogTitle = 'Preferencias de notificaciones';

  const dialogSubtitle = entityName
    ? `Decide qué notificaciones quieres recibir sobre la actividad en ${entityName}`
    : entityType === 'team'
      ? 'Decide qué notificaciones quieres recibir sobre la actividad de este equipo'
      : 'Decide qué notificaciones quieres recibir sobre la actividad de esta tarea';

  // ============================================================================
  // FORM CONTENT
  // ============================================================================

  const formContent = (
    <div className={styles.content}>
      {error && <div className={styles.error}>{error}</div>}

      {/* Channel Tabs */}
      <div className={styles.channelTabs}>
        <button
          type="button"
          className={`${styles.channelTab} ${activeChannel === 'email' ? styles.channelTabActive : ''}`}
          onClick={() => handleChannelSwitch('email')}
        >
          <Mail size={14} />
          <span>Correo</span>
        </button>
        <button
          type="button"
          className={`${styles.channelTab} ${activeChannel === 'push' ? styles.channelTabActive : ''}`}
          onClick={() => handleChannelSwitch('push')}
        >
          <BellRing size={14} />
          <span>Push</span>
        </button>
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Cargando preferencias...</span>
        </div>
      ) : activeChannel === 'push' && !pushIsSubscribed ? (
        /* ── Empty state: Push not active ── */
        <div className={styles.pushEmptyState}>
          <div className={styles.pushEmptyIcon}>
            {pushIsDenied ? <BellOff size={28} /> : <BellRing size={28} />}
          </div>
          <h3 className={styles.pushEmptyTitle}>
            {pushIsDenied ? 'Notificaciones bloqueadas' : 'Activa las notificaciones push'}
          </h3>
          <p className={styles.pushEmptyDescription}>
            {pushIsDenied
              ? 'Tu navegador bloqueo las notificaciones. Para activarlas, ve a la configuracion de tu navegador y permite notificaciones para este sitio.'
              : 'Recibe alertas instantaneas en tu dispositivo cuando ocurra algo importante. Despues podras elegir cuales recibir.'}
          </p>
          {!pushIsDenied && (
            <button
              type="button"
              className={styles.pushEmptyButton}
              onClick={async () => { await pushSubscribe(); }}
              disabled={pushActivating}
            >
              {pushActivating ? 'Activando...' : 'Activar notificaciones push'}
            </button>
          )}
        </div>
      ) : (
        <>
          <MasterToggle
            enabled={allEnabled}
            onChange={handleMasterToggle}
            disabled={isSaving}
            channel={activeChannel}
          />

          <div className={styles.divider} />

          <div className={styles.categoriesList}>
            {Array.from(groupedPreferences.entries()).map(([categoryKey, items]) => {
              const meta = (categoriesMeta as Record<string, { title: string; description: string }>)[categoryKey];
              if (!meta) return null;

              return (
                <CategoryAccordion
                  key={categoryKey}
                  categoryKey={categoryKey}
                  title={meta.title}
                  description={meta.description}
                  items={items}
                  preferences={prefsRecord}
                  isExpanded={expandedCategories.has(categoryKey)}
                  onExpandToggle={() => toggleCategory(categoryKey)}
                  onPreferenceChange={handlePreferenceChange}
                  onCategoryToggle={(enabled) => handleCategoryToggle(items, enabled)}
                  disabled={isSaving}
                />
              );
            })}
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
                    {dialogTitle}
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
