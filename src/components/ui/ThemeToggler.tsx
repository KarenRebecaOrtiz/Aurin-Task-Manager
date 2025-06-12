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
     className='togglerDark'
        onClick={toggleTheme}
        style={{
          width: '64px',
          height: '64px',
          padding: '24px',
          background: isDarkMode ? '#1E1E1E' : '#F1F5F9',
          borderRadius: '24px',
          display: 'inline-flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          border: 'none',
          cursor: 'pointer',
          boxShadow: isDarkMode
            ? '8px 8px 16px rgba(0, 0, 0, 0.6), -8px -8px 16px rgba(255, 255, 255, 0.05)'
            : '-8px -8px 16px white, 8px 8px 16px rgba(0, 0, 0, 0.10)',
          transition: 'all 0.3s ease',
        }}
      >
        <Image
          src="/sun-moon.svg"
          alt="Theme Toggler"
          width={27.5}
          height={27.5}
          style={{
            filter: isDarkMode ? 'invert(100%) brightness(130%)' : 'none',
            transition: 'filter 0.3s ease',
          }}
        />
      </button>

    </div>
  );
};

export default ThemeToggler;