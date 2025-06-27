import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Función para detectar el tema actual
    const detectTheme = () => {
      const isDark = document.body.classList.contains('dark');
      setIsDarkMode(isDark);
    };

    // Detectar tema inicial
    detectTheme();

    // Observer para detectar cambios en la clase del body
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          detectTheme();
        }
      });
    });

    // Observar cambios en el body
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Cleanup
    return () => observer.disconnect();
  }, []);

  return { isDarkMode };
}; 