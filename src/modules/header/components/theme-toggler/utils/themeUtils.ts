/**
 * Utilidades para el manejo de temas
 */

export const THEME_STORAGE_KEY = 'theme';
export const THEME_CLASSES = {
  DARK: 'dark',
  LIGHT: 'light',
} as const;

export type ThemeMode = 'light' | 'dark';

/**
 * Obtiene el tema guardado en localStorage
 */
export const getSavedTheme = (): ThemeMode | null => {
  if (typeof window === 'undefined') return null;
  
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : null;
};

/**
 * Guarda el tema en localStorage
 */
export const saveTheme = (theme: ThemeMode): void => {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(THEME_STORAGE_KEY, theme);
};

/**
 * Detecta si el usuario prefiere el modo oscuro
 */
export const getSystemThemePreference = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Aplica el tema al documento
 */
export const applyThemeToDocument = (theme: ThemeMode): void => {
  if (typeof document === 'undefined') return;
  
  if (theme === 'dark') {
    document.body.classList.add(THEME_CLASSES.DARK);
    document.body.classList.remove(THEME_CLASSES.LIGHT);
  } else {
    document.body.classList.add(THEME_CLASSES.LIGHT);
    document.body.classList.remove(THEME_CLASSES.DARK);
  }
};

/**
 * Obtiene el tema inicial considerando localStorage y preferencias del sistema
 */
export const getInitialTheme = (): ThemeMode => {
  const savedTheme = getSavedTheme();
  if (savedTheme) return savedTheme;
  
  return getSystemThemePreference();
};
