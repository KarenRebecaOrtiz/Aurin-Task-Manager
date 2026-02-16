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
import { ChevronRight } from 'lucide-react';
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

  // Preferences as record for easy access
  const prefsRecord = preferences as unknown as Record<string, boolean>;

  // Calculate if all notifications are enabled (for master toggle)
  const allEnabled = useMemo(() => {
    return Object.values(prefsRecord).every((value) => value === true);
  }, [prefsRecord]);

  // Auto-save function with debounce
  const triggerAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const success = await save();
      if (success) {
        sileo.success({ title: 'Preferencias guardadas', description: 'Tus notificaciones se ajustaron correctamente.', duration: 3000 });
      }
    }, 500);
  }, [save]);

  // Handle preference change with auto-save
  const handlePreferenceChange = useCallback((key: string, value: boolean) => {
    updatePreference(key, value);
    triggerAutoSave();
  }, [updatePreference, triggerAutoSave]);

  // Handle category group toggle
  const handleCategoryToggle = useCallback((items: AnyPreferenceConfig[], enabled: boolean) => {
    for (const item of items) {
      updatePreference(item.key, enabled);
    }
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

  const dialogTitle = 'Preferencias de correo';

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
      {error && <div className={styles.error}>{error}</div>}

      {isLoading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Cargando preferencias...</span>
        </div>
      ) : (
        <>
          <MasterToggle
            enabled={allEnabled}
            onChange={handleMasterToggle}
            disabled={isSaving}
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
