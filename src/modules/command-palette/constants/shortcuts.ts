/**
 * Command Palette - Keyboard Shortcuts
 *
 * Definición de atajos de teclado para el Command Palette.
 * @module command-palette/constants/shortcuts
 */

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

export const KEYBOARD_SHORTCUTS = {
  // Abrir/Cerrar
  TOGGLE: ['Meta+k', 'Control+k'],
  CLOSE: ['Escape'],

  // Navegación en lista
  NAVIGATE_UP: ['ArrowUp'],
  NAVIGATE_DOWN: ['ArrowDown'],
  SELECT: ['Enter'],
  BACK: ['Backspace'],

  // Filtros rápidos (cuando el palette está abierto)
  FILTER_PROJECT: ['Alt+p'],
  FILTER_TASK: ['Alt+t'],
  FILTER_MEMBER: ['Alt+m'],
  FILTER_TEAM: ['Alt+e'],
  FILTER_STATUS: ['Alt+s'],
  FILTER_PRIORITY: ['Alt+r'],

  // Limpiar
  CLEAR_FILTERS: ['Alt+c'],

  // Acciones sobre tarea seleccionada
  ADD_TIME: ['Alt+Shift+t'],
  SHARE_TASK: ['Alt+Shift+s'],
  EDIT_TASK: ['Alt+Shift+e'],

  // IA
  AI_PROMPT: ['Tab'],
} as const;

// ============================================================================
// SHORTCUT DISPLAY HELPERS
// ============================================================================

/**
 * Convierte un shortcut interno a formato legible para UI
 */
export const formatShortcutForDisplay = (shortcut: string): string => {
  return shortcut
    .replace('Meta+', '⌘')
    .replace('Control+', 'Ctrl+')
    .replace('Alt+', '⌥')
    .replace('Shift+', '⇧')
    .replace('ArrowUp', '↑')
    .replace('ArrowDown', '↓')
    .replace('ArrowLeft', '←')
    .replace('ArrowRight', '→')
    .replace('Enter', '↵')
    .replace('Escape', 'Esc')
    .replace('Backspace', '⌫')
    .replace('Tab', 'Tab');
};

/**
 * Detecta si el usuario está en Mac para mostrar ⌘ vs Ctrl
 */
export const isMac = (): boolean => {
  if (typeof window === 'undefined') return false;
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
};

/**
 * Obtiene el shortcut correcto según la plataforma
 */
export const getPlatformShortcut = (shortcuts: readonly string[]): string => {
  const preferMeta = isMac();
  const shortcut = shortcuts.find((s) =>
    preferMeta ? s.includes('Meta') : s.includes('Control')
  ) || shortcuts[0];
  return formatShortcutForDisplay(shortcut);
};

// ============================================================================
// SHORTCUT MATCHERS
// ============================================================================

/**
 * Verifica si un evento de teclado coincide con un shortcut
 */
export const matchesShortcut = (
  event: KeyboardEvent,
  shortcuts: readonly string[]
): boolean => {
  // Guard against undefined event.key
  if (!event.key) return false;

  return shortcuts.some((shortcut) => {
    const parts = shortcut.toLowerCase().split('+');
    const key = parts[parts.length - 1];
    const requiresMeta = parts.includes('meta');
    const requiresControl = parts.includes('control');
    const requiresAlt = parts.includes('alt');
    const requiresShift = parts.includes('shift');

    const keyMatches = event.key.toLowerCase() === key;
    const metaMatches = requiresMeta ? event.metaKey : !event.metaKey;
    const controlMatches = requiresControl ? event.ctrlKey : !event.ctrlKey;
    const altMatches = requiresAlt ? event.altKey : !event.altKey;
    const shiftMatches = requiresShift ? event.shiftKey : !event.shiftKey;

    // Para Meta+k o Control+k, aceptar cualquiera de los dos
    if (requiresMeta || requiresControl) {
      return keyMatches && (event.metaKey || event.ctrlKey) && altMatches && shiftMatches;
    }

    return keyMatches && metaMatches && controlMatches && altMatches && shiftMatches;
  });
};
