import { useEffect, useCallback, useRef } from 'react';

/**
 * Keyboard shortcut handler function
 */
export type ShortcutHandler = (event: KeyboardEvent) => void;

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  /** Key to trigger (e.g., 'Enter', 'Escape', 'k') */
  key: string;
  /** Requires Ctrl key (default: false) */
  ctrl?: boolean;
  /** Requires Shift key (default: false) */
  shift?: boolean;
  /** Requires Alt/Option key (default: false) */
  alt?: boolean;
  /** Requires Meta/Cmd key (default: false) */
  meta?: boolean;
  /** Handler function */
  handler: ShortcutHandler;
  /** Description for documentation */
  description?: string;
  /** Prevent default behavior (default: true) */
  preventDefault?: boolean;
  /** Stop event propagation (default: false) */
  stopPropagation?: boolean;
}

/**
 * Configuration for keyboard shortcuts
 */
export interface KeyboardShortcutsConfig {
  /** List of keyboard shortcuts */
  shortcuts: KeyboardShortcut[];
  /** Enable shortcuts (default: true) */
  enabled?: boolean;
  /** Disable shortcuts when input is focused (default: true) */
  disableOnInput?: boolean;
}

/**
 * Custom hook for managing keyboard shortcuts
 *
 * Provides a declarative way to handle keyboard shortcuts with modifier keys.
 * Automatically prevents conflicts with input fields.
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts({
 *   shortcuts: [
 *     {
 *       key: 'k',
 *       ctrl: true,
 *       handler: () => openSearchModal(),
 *       description: 'Open search'
 *     },
 *     {
 *       key: 'Escape',
 *       handler: () => closeModal(),
 *       description: 'Close modal'
 *     }
 *   ]
 * });
 * ```
 */
export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  disableOnInput = true,
}: KeyboardShortcutsConfig): void {

  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Check if shortcuts are disabled
    if (!enabled) return;

    // Check if input element is focused
    if (disableOnInput) {
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }
    }

    // Find matching shortcut
    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      return (
        shortcut.key.toLowerCase() === event.key.toLowerCase() &&
        !!shortcut.ctrl === event.ctrlKey &&
        !!shortcut.shift === event.shiftKey &&
        !!shortcut.alt === event.altKey &&
        !!shortcut.meta === event.metaKey
      );
    });

    if (matchingShortcut) {
      if (matchingShortcut.preventDefault !== false) {
        event.preventDefault();
      }
      if (matchingShortcut.stopPropagation) {
        event.stopPropagation();
      }
      matchingShortcut.handler(event);
    }
  }, [enabled, disableOnInput]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

/**
 * Common table keyboard shortcuts
 */
export const TABLE_SHORTCUTS = {
  SEARCH: { key: 'k', ctrl: true, description: 'Focus search' },
  NEW_ITEM: { key: 'n', ctrl: true, description: 'Create new item' },
  ESCAPE: { key: 'Escape', description: 'Close modals/menus' },
  SELECT_ALL: { key: 'a', ctrl: true, description: 'Select all' },
  DELETE: { key: 'Delete', description: 'Delete selected' },
  REFRESH: { key: 'r', ctrl: true, description: 'Refresh data' },
  ARROW_UP: { key: 'ArrowUp', description: 'Navigate up' },
  ARROW_DOWN: { key: 'ArrowDown', description: 'Navigate down' },
  ENTER: { key: 'Enter', description: 'Confirm/Edit' },
} as const;

/**
 * Hook for common table keyboard shortcuts
 *
 * Provides pre-configured shortcuts for common table operations.
 *
 * @example
 * ```tsx
 * useTableKeyboardShortcuts({
 *   onSearch: () => searchInputRef.current?.focus(),
 *   onNew: () => openNewItemModal(),
 *   onEscape: () => closeAllModals(),
 *   onSelectAll: () => selectAllRows(),
 *   onDelete: () => deleteSelected()
 * });
 * ```
 */
export interface TableKeyboardShortcutsConfig {
  /** Handler for Ctrl+K (search) */
  onSearch?: () => void;
  /** Handler for Ctrl+N (new item) */
  onNew?: () => void;
  /** Handler for Escape */
  onEscape?: () => void;
  /** Handler for Ctrl+A (select all) */
  onSelectAll?: () => void;
  /** Handler for Delete */
  onDelete?: () => void;
  /** Handler for Ctrl+R (refresh) */
  onRefresh?: () => void;
  /** Handler for Arrow Up */
  onArrowUp?: () => void;
  /** Handler for Arrow Down */
  onArrowDown?: () => void;
  /** Handler for Enter */
  onEnter?: () => void;
  /** Enable shortcuts (default: true) */
  enabled?: boolean;
}

export function useTableKeyboardShortcuts({
  onSearch,
  onNew,
  onEscape,
  onSelectAll,
  onDelete,
  onRefresh,
  onArrowUp,
  onArrowDown,
  onEnter,
  enabled = true,
}: TableKeyboardShortcutsConfig): void {

  const shortcuts: KeyboardShortcut[] = [];

  if (onSearch) {
    shortcuts.push({
      ...TABLE_SHORTCUTS.SEARCH,
      handler: onSearch,
    });
  }

  if (onNew) {
    shortcuts.push({
      ...TABLE_SHORTCUTS.NEW_ITEM,
      handler: onNew,
    });
  }

  if (onEscape) {
    shortcuts.push({
      ...TABLE_SHORTCUTS.ESCAPE,
      handler: onEscape,
    });
  }

  if (onSelectAll) {
    shortcuts.push({
      ...TABLE_SHORTCUTS.SELECT_ALL,
      handler: onSelectAll,
    });
  }

  if (onDelete) {
    shortcuts.push({
      ...TABLE_SHORTCUTS.DELETE,
      handler: onDelete,
    });
  }

  if (onRefresh) {
    shortcuts.push({
      ...TABLE_SHORTCUTS.REFRESH,
      handler: onRefresh,
    });
  }

  if (onArrowUp) {
    shortcuts.push({
      ...TABLE_SHORTCUTS.ARROW_UP,
      handler: onArrowUp,
      preventDefault: false, // Allow default scroll behavior
    });
  }

  if (onArrowDown) {
    shortcuts.push({
      ...TABLE_SHORTCUTS.ARROW_DOWN,
      handler: onArrowDown,
      preventDefault: false, // Allow default scroll behavior
    });
  }

  if (onEnter) {
    shortcuts.push({
      ...TABLE_SHORTCUTS.ENTER,
      handler: onEnter,
    });
  }

  useKeyboardShortcuts({
    shortcuts,
    enabled,
  });
}
