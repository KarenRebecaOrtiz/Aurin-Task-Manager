import { useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export interface UseThemeTogglerReturn {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setLightMode: () => void;
  setDarkMode: () => void;
}

/**
 * Hook personalizado para manejar el theme toggler
 * Proporciona funcionalidades adicionales sobre el contexto de tema base
 */
export const useThemeToggler = (onThemeChange?: (isDarkMode: boolean) => void): UseThemeTogglerReturn => {
  const { isDarkMode, toggleTheme: baseToggleTheme } = useTheme();

  const toggleTheme = useCallback(() => {
    baseToggleTheme();
    onThemeChange?.(!isDarkMode);
  }, [baseToggleTheme, isDarkMode, onThemeChange]);

  const setLightMode = useCallback(() => {
    if (isDarkMode) {
      toggleTheme();
    }
  }, [isDarkMode, toggleTheme]);

  const setDarkMode = useCallback(() => {
    if (!isDarkMode) {
      toggleTheme();
    }
  }, [isDarkMode, toggleTheme]);

  return {
    isDarkMode,
    toggleTheme,
    setLightMode,
    setDarkMode,
  };
};
