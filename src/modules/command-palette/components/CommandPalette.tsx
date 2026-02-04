/**
 * CommandPalette Component
 *
 * Componente principal del Command Palette mejorado.
 * Dropdown expandido con navegación drill-down y acciones rápidas.
 *
 * @module command-palette/components/CommandPalette
 */

'use client';

import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command } from 'lucide-react';
import { useCommandPalette, type UseCommandPaletteProps } from '../hooks/useCommandPalette';
import { SearchInput } from './header/SearchInput';
import { Breadcrumb } from './navigation/Breadcrumb';
import { CommandList } from './lists/CommandList';
import { TaskActions } from './actions/TaskActions';
import { KeyboardHints } from './footer/KeyboardHints';
import { dropdownAnimations } from '@/modules/shared/components/molecules/Dropdown/animations';
import { useDataStore } from '@/stores/dataStore';
import { useMediaQuery } from '@/modules/dialogs/hooks/useMediaQuery';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogTitle,
} from '@/modules/dialogs';
import { getPlatformShortcut, KEYBOARD_SHORTCUTS } from '../constants/shortcuts';
import type { CommandItem, ActionCommandItem } from '../types/commandPalette.types';
import styles from '../styles/command-palette.module.scss';

export interface CommandPaletteProps extends UseCommandPaletteProps {
  placeholder?: string;
  className?: string;
}

export function CommandPalette({
  placeholder = 'Buscar proyectos, tareas o miembros...',
  className = '',
  ...hookProps
}: CommandPaletteProps) {
  const {
    // State
    isOpen,
    isLoading,
    navigationState,
    navigationStack,
    activeFilters,
    selectedIndex,
    searchQuery,
    showAIPrompt,
    canGoBack,

    // Data
    currentItems,

    // Actions
    open,
    close,
    toggle,
    setSearchQuery,
    navigateTo,
    navigateBack,
    navigateToRoot,
    navigateToStackIndex,
    setSelectedIndex,
    selectItem,
    selectCurrentItem,
    toggleCategory,
    clearFilters,
    toggleAIPrompt,

    // Refs
    containerRef,
  } = useCommandPalette(hookProps);

  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!isOpen || isMobile) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isMobile, close]);

  // Handle item click
  const handleItemClick = useCallback(
    (item: CommandItem, index: number) => {
      setSelectedIndex(index);
      selectItem(item);
    },
    [setSelectedIndex, selectItem]
  );

  // Handle action click (para TaskActions)
  const handleActionClick = useCallback(
    (action: ActionCommandItem, index: number) => {
      setSelectedIndex(index);
      action.action();
    },
    [setSelectedIndex]
  );


  // Placeholder dinámico según nivel
  const getDynamicPlaceholder = () => {
    switch (navigationState.level) {
      case 'workspace':
        return `Buscar en ${navigationState.workspaceName || 'cuenta'}...`;
      case 'project':
        return `Buscar en ${navigationState.projectName || 'proyecto'}...`;
      case 'member':
        return `Tareas de ${navigationState.memberName || 'miembro'}...`;
      case 'task':
        return 'Seleccionar acción...';
      default:
        return placeholder;
    }
  };

  // Obtener tareas del store para encontrar el clientId
  const tasks = useDataStore((state) => state.tasks);

  // Obtener el clientId de la tarea actual (si estamos en nivel task)
  const currentTaskClientId = useMemo(() => {
    if (navigationState.level !== 'task' || !navigationState.taskId) return null;
    const task = tasks.find((t) => t.id === navigationState.taskId);
    return task?.clientId || null;
  }, [navigationState.level, navigationState.taskId, tasks]);

  // Renderizar contenido del panel
  const renderContent = () => {
    // Si estamos en nivel tarea, mostrar acciones
    if (navigationState.level === 'task' && navigationState.taskId) {
      return (
        <TaskActions
          taskId={navigationState.taskId}
          selectedIndex={selectedIndex}
          baseIndex={0}
          onView={hookProps.onTaskSelect ? () => {
            hookProps.onTaskSelect?.(navigationState.taskId!);
            close();
          } : undefined}
          onAddManualTime={hookProps.onAddManualTime ? () => hookProps.onAddManualTime?.(navigationState.taskId!) : undefined}
          onEdit={hookProps.onEditTask ? () => {
            hookProps.onEditTask?.(navigationState.taskId!);
            close();
          } : undefined}
          onDelete={hookProps.onDeleteTask ? () => {
            hookProps.onDeleteTask?.(navigationState.taskId!);
            close();
          } : undefined}
          onShare={hookProps.onShareTask ? () => hookProps.onShareTask?.(navigationState.taskId!) : undefined}
          onEditClient={hookProps.onEditClient && currentTaskClientId ? () => {
            hookProps.onEditClient?.(currentTaskClientId);
            close();
          } : undefined}
          onActionClick={handleActionClick}
        />
      );
    }

    // Lista normal
    return (
      <CommandList
        level={navigationState.level}
        items={currentItems}
        selectedIndex={selectedIndex}
        onItemClick={handleItemClick}
        isLoading={isLoading}
        searchQuery={searchQuery}
      />
    );
  };

  // Mobile: usar ResponsiveDialog (drawer)
  if (isMobile) {
    return (
      <div className={`${styles.container} ${className}`}>
        {/* Trigger */}
        <button
          ref={triggerRef}
          type="button"
          className={`${styles.trigger} ${isOpen ? styles.focused : ''}`}
          onClick={toggle}
        >
          <div className={styles.triggerContent}>
            <Search className={styles.triggerIcon} size={16} />
            <span className={styles.triggerPlaceholder}>{placeholder}</span>
          </div>
        </button>

        {/* Mobile Dialog */}
        <ResponsiveDialog open={isOpen} onOpenChange={(open) => (open ? null : close())}>
          <ResponsiveDialogContent className={styles.panel}>
            <ResponsiveDialogHeader className={styles.header}>
              <ResponsiveDialogTitle className="sr-only">
                Búsqueda
              </ResponsiveDialogTitle>
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={getDynamicPlaceholder()}
                autoFocus
              />
              {canGoBack && (
                <Breadcrumb
                  stack={navigationStack}
                  onNavigateToIndex={navigateToStackIndex}
                  onBack={navigateBack}
                  canGoBack={canGoBack}
                />
              )}
            </ResponsiveDialogHeader>

            <ResponsiveDialogBody>
              {renderContent()}
            </ResponsiveDialogBody>

            <KeyboardHints showBackHint={canGoBack} />
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      </div>
    );
  }

  // Manejar cambio en el input del trigger
  const handleTriggerInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (!isOpen) {
      open();
    }
  }, [isOpen, open, setSearchQuery]);

  // Manejar focus en el input del trigger
  const handleTriggerFocus = useCallback(() => {
    if (!isOpen) {
      open();
    }
  }, [isOpen, open]);

  // Desktop: dropdown expandido
  return (
    <div className={`${styles.container} ${className}`} ref={containerRef}>
      {/* Trigger Input - Funcional directamente */}
      <div
        ref={triggerRef}
        className={`${styles.trigger} ${isOpen ? styles.focused : ''}`}
        onClick={handleTriggerFocus}
      >
        <div className={styles.triggerContent}>
          <Search className={styles.triggerIcon} size={16} />
          <input
            type="text"
            className={styles.triggerInput}
            value={searchQuery}
            onChange={handleTriggerInputChange}
            onFocus={handleTriggerFocus}
            placeholder={placeholder}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>
        <div className={styles.triggerShortcut}>
          <span className={styles.shortcutKey}>
            <Command size={11} />
          </span>
          <span className={styles.shortcutKey}>K</span>
        </div>
      </div>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            className={styles.panel}
            role="listbox"
            {...dropdownAnimations.menu}
          >
            {/* Header: Solo Breadcrumb (el input está en el trigger) */}
            {canGoBack && (
              <div className={styles.header}>
                <Breadcrumb
                  stack={navigationStack}
                  onNavigateToIndex={navigateToStackIndex}
                  onBack={navigateBack}
                  canGoBack={canGoBack}
                />
              </div>
            )}

            {/* Content */}
            {renderContent()}

            {/* Footer */}
            <KeyboardHints showBackHint={canGoBack} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CommandPalette;
