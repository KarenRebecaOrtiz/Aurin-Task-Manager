import { useState, useEffect, useCallback, useMemo } from 'react';

export const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Función para detectar el tema actual
    const detectTheme = () => {
      const savedTheme = localStorage.getItem('theme');
      const isDark = savedTheme === 'dark' || document.body.classList.contains('dark');
      setIsDarkMode(isDark);
    };

    // Detectar tema inicial
    detectTheme();

    // Escuchar cambios en localStorage
    const handleStorageChange = () => {
      detectTheme();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // También escuchar cambios en el DOM
    const observer = new MutationObserver(() => {
      detectTheme();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      observer.disconnect();
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => !prev);
  }, []);

  const themeValue = useMemo(() => ({
    isDarkMode,
    toggleTheme,
  }), [isDarkMode, toggleTheme]);

  return themeValue;
}; 