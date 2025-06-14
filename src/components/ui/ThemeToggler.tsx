'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import styles from './Button.module.scss';

const ThemeToggler = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Cargar el tema desde localStorage al montar el componente
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.body.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    // Actualizar el tema en el body y localStorage
    if (isDarkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div
      data-layer="sun-moon"
      className={styles.sunMoon}
    >
    <button
  className="togglerDark"
  onClick={toggleTheme}
  aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
  style={{
    width: '64px',
    height: '64px',
    padding: '24px',
    background: isDarkMode ? 'rgba(30, 30, 30, 0.7)' : 'rgba(241, 245, 249, 0.7)',
    borderRadius: '24px',
    display: 'inline-flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)', // Safari support
    boxShadow: isDarkMode
      ? '8px 8px 16px rgba(0, 0, 0, 0.6), -8px -8px 16px rgba(255, 255, 255, 0.05), inset -4px -4px 8px rgba(0, 0, 0, 0.4), inset 4px 4px 8px rgba(255, 255, 255, 0.03)'
      : '-8px -8px 16px rgba(255, 255, 255, 0.9), 8px 8px 16px rgba(0, 0, 0, 0.08), inset -4px -4px 8px rgba(255, 255, 255, 0.5), inset 4px 4px 8px rgba(209, 217, 230, 0.3)',
    transition: 'all 0.3s ease',
    // Hover effect (using :hover in inline styles is not possible, so suggest managing via SCSS or JS if needed)
    // For now, we'll rely on transition for smooth changes
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
    e.currentTarget.style.background = isDarkMode ? 'rgba(30, 30, 30, 0.85)' : 'rgba(241, 245, 249, 0.85)';
    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
    e.currentTarget.style.boxShadow = isDarkMode
      ? '10px 10px 20px rgba(0, 0, 0, 0.65), -10px -10px 20px rgba(255, 255, 255, 0.07), inset -6px -6px 12px rgba(0, 0, 0, 0.45), inset 6px 6px 12px rgba(255, 255, 255, 0.04)'
      : '-10px -10px 20px rgba(255, 255, 255, 0.95), 10px 10px 20px rgba(0, 0, 0, 0.12), inset -6px -6px 12px rgba(255, 255, 255, 0.6), inset 6px 6px 12px rgba(209, 217, 230, 0.4)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.background = isDarkMode ? 'rgba(30, 30, 30, 0.7)' : 'rgba(241, 245, 249, 0.7)';
    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    e.currentTarget.style.boxShadow = isDarkMode
      ? '8px 8px 16px rgba(0, 0, 0, 0.6), -8px -8px 16px rgba(255, 255, 255, 0.05), inset -4px -4px 8px rgba(0, 0, 0, 0.4), inset 4px 4px 8px rgba(255, 255, 255, 0.03)'
      : '-8px -8px 16px rgba(255, 255, 255, 0.9), 8px 8px 16px rgba(0, 0, 0, 0.08), inset -4px -4px 8px rgba(255, 255, 255, 0.5), inset 4px 4px 8px rgba(209, 217, 230, 0.3)';
  }}
  onMouseDown={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.background = isDarkMode ? 'rgba(30, 30, 30, 0.6)' : 'rgba(241, 245, 249, 0.6)';
    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    e.currentTarget.style.boxShadow = isDarkMode
      ? '4px 4px 8px rgba(0, 0, 0, 0.45), -4px -4px 8px rgba(255, 255, 255, 0.04), inset -2px -2px 4px rgba(0, 0, 0, 0.35), inset 2px 2px 4px rgba(255, 255, 255, 0.02)'
      : '-4px -4px 8px rgba(255, 255, 255, 0.85), 4px 4px 8px rgba(0, 0, 0, 0.06), inset -2px -2px 4px rgba(255, 255, 255, 0.4), inset 2px 2px 4px rgba(209, 217, 230, 0.2)';
  }}
  onMouseUp={(e) => {
    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
    e.currentTarget.style.background = isDarkMode ? 'rgba(30, 30, 30, 0.85)' : 'rgba(241, 245, 249, 0.85)';
    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
    e.currentTarget.style.boxShadow = isDarkMode
      ? '10px 10px 20px rgba(0, 0, 0, 0.65), -10px -10px 20px rgba(255, 255, 255, 0.07), inset -6px -6px 12px rgba(0, 0, 0, 0.45), inset 6px 6px 12px rgba(255, 255, 255, 0.04)'
      : '-10px -10px 20px rgba(255, 255, 255, 0.95), 10px 10px 20px rgba(0, 0, 0, 0.12), inset -6px -6px 12px rgba(255, 255, 255, 0.6), inset 6px 6px 12px rgba(209, 217, 230, 0.4)';
  }}
>
  <Image
    src="/sun-moon.svg"
    alt="Theme Toggler"
    width={27.5}
    height={27.5}
    style={{
      filter: isDarkMode
        ? 'invert(100%) brightness(130%) drop-shadow(0 0 4px rgba(255, 255, 255, 0.2))'
        : 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.3))',
      transition: 'filter 0.3s ease',
    }}
  />
</button>

    </div>
  );
};

export default ThemeToggler;