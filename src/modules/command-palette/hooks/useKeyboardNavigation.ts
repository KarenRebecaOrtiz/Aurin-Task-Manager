/**
 * useKeyboardNavigation Hook
 *
 * Maneja la navegación por teclado en el Command Palette.
 * Soporta flechas arriba/abajo, Enter, Escape, y atajos personalizados.
 *
 * @module command-palette/hooks/useKeyboardNavigation
 */

import { useCallback, useEffect, useRef } from 'react';
import { KEYBOARD_SHORTCUTS, matchesShortcut } from '../constants/shortcuts';
import type { SearchCategory } from '../types/commandPalette.types';

// ============================================================================
// TYPES
// ============================================================================

export interface UseKeyboardNavigationProps {
  /** Si el Command Palette está abierto */
  isOpen: boolean;
  /** Índice seleccionado actualmente */
  selectedIndex: number;
  /** Total de items en la lista actual */
  itemCount: number;
  /** Si hay una búsqueda activa (para comportamiento de Backspace) */
  hasSearchQuery: boolean;

  // Callbacks
  onOpen: () => void;
  onClose: () => void;
  onNavigateUp: () => void;
  onNavigateDown: () => void;
  onSelect: () => void;
  onBack: () => void;
  onCategoryFilter: (category: SearchCategory) => void;
  onClearFilters: () => void;
  onAIPrompt: () => void;
}

export interface UseKeyboardNavigationReturn {
  /** Ref para el contenedor que debe recibir los eventos */
  containerRef: React.RefObject<HTMLDivElement>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useKeyboardNavigation({
  isOpen,
  selectedIndex,
  itemCount,
  hasSearchQuery,
  onOpen,
  onClose,
  onNavigateUp,
  onNavigateDown,
  onSelect,
  onBack,
  onCategoryFilter,
  onClearFilters,
  onAIPrompt,
}: UseKeyboardNavigationProps): UseKeyboardNavigationReturn {
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Handler global para abrir/cerrar con Cmd+K / Ctrl+K
   */
  const handleGlobalKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Toggle con Cmd+K o Ctrl+K
      if (matchesShortcut(event, KEYBOARD_SHORTCUTS.TOGGLE)) {
        event.preventDefault();
        event.stopPropagation();
        if (isOpen) {
          onClose();
        } else {
          onOpen();
        }
        return;
      }

      // Si no está abierto, no procesar otros shortcuts
      if (!isOpen) return;

      // Escape para cerrar
      if (matchesShortcut(event, KEYBOARD_SHORTCUTS.CLOSE)) {
        event.preventDefault();
        onClose();
        return;
      }

      // Navegación arriba
      if (matchesShortcut(event, KEYBOARD_SHORTCUTS.NAVIGATE_UP)) {
        event.preventDefault();
        onNavigateUp();
        return;
      }

      // Navegación abajo
      if (matchesShortcut(event, KEYBOARD_SHORTCUTS.NAVIGATE_DOWN)) {
        event.preventDefault();
        onNavigateDown();
        return;
      }

      // Seleccionar item actual
      if (matchesShortcut(event, KEYBOARD_SHORTCUTS.SELECT)) {
        event.preventDefault();
        onSelect();
        return;
      }

      // Volver atrás (solo si no hay búsqueda)
      if (matchesShortcut(event, KEYBOARD_SHORTCUTS.BACK) && !hasSearchQuery) {
        event.preventDefault();
        onBack();
        return;
      }

      // Filtros por categoría
      if (matchesShortcut(event, KEYBOARD_SHORTCUTS.FILTER_PROJECT)) {
        event.preventDefault();
        onCategoryFilter('project');
        return;
      }

      if (matchesShortcut(event, KEYBOARD_SHORTCUTS.FILTER_TASK)) {
        event.preventDefault();
        onCategoryFilter('task');
        return;
      }

      if (matchesShortcut(event, KEYBOARD_SHORTCUTS.FILTER_MEMBER)) {
        event.preventDefault();
        onCategoryFilter('member');
        return;
      }

      if (matchesShortcut(event, KEYBOARD_SHORTCUTS.FILTER_TEAM)) {
        event.preventDefault();
        onCategoryFilter('team');
        return;
      }

      // Limpiar filtros
      if (matchesShortcut(event, KEYBOARD_SHORTCUTS.CLEAR_FILTERS)) {
        event.preventDefault();
        onClearFilters();
        return;
      }

      // AI Prompt (Tab)
      if (matchesShortcut(event, KEYBOARD_SHORTCUTS.AI_PROMPT)) {
        event.preventDefault();
        onAIPrompt();
        return;
      }
    },
    [
      isOpen,
      hasSearchQuery,
      onOpen,
      onClose,
      onNavigateUp,
      onNavigateDown,
      onSelect,
      onBack,
      onCategoryFilter,
      onClearFilters,
      onAIPrompt,
    ]
  );

  /**
   * Registrar listener global de teclado
   */
  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [handleGlobalKeyDown]);

  /**
   * Scroll al item seleccionado cuando cambia
   */
  useEffect(() => {
    if (!isOpen || selectedIndex < 0) return;

    const container = containerRef.current;
    if (!container) return;

    const selectedItem = container.querySelector(
      `[data-command-index="${selectedIndex}"]`
    );

    if (selectedItem) {
      selectedItem.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [isOpen, selectedIndex]);

  return {
    containerRef,
  };
}

export default useKeyboardNavigation;
