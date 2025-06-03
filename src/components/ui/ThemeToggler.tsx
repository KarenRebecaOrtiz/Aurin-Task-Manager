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
        onClick={toggleTheme}
        className={`${styles.button} ${styles.themeToggler} ${isDarkMode ? styles.dark : ''}`}
      >
        <Image
          src="/sun-moon.svg"
          alt="Theme Toggler"
          width={17.5}
          height={17.5}
        />
      </button>
    </div>
  );
};

export default ThemeToggler;