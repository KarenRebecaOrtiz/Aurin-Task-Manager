'use client';
import { useUser, UserButton } from '@clerk/nextjs';
import ThemeToggler from './ThemeToggler';
import styles from './Header.module.scss';
import { useState, useEffect } from 'react';

interface HeaderProps {
  selectedContainer: 'tareas' | 'clientes' | 'miembros';
}

const Header: React.FC<HeaderProps> = ({ selectedContainer }) => {
  const { user } = useUser();
  const userName = user?.firstName || 'Usuario';
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Verificar el tema solo en el cliente
    const savedTheme = localStorage.getItem('theme');
    setIsDarkMode(savedTheme === 'dark');
  }, []);

  const getSubtitle = () => {
    switch (selectedContainer) {
      case 'tareas':
        return 'Esta es una lista de tus tareas actuales';
      case 'clientes':
        return 'Aquí puedes ver y gestionar todos los clientes asociadas a tu organización.';
      case 'miembros':
        return 'Aquí puedes consultar y gestionar todos los miembros de tu organización.';
      default:
        return 'Esta es una lista de tus tareas actuales';
    }
  };

  return (
    <div
      data-layer="Wrapper"
      className={`${styles.wrapper} ${isDarkMode ? styles.dark : ''}`}
    >
      <div
        data-layer="Frame 14"
        className={styles.frame14}
      >
        <div
          data-layer="Title"
          className={styles.title}
        >
          <div
            data-layer="Te damos la bienvenida de nuevo"
            className={`${styles.welcome} ${isDarkMode ? styles.dark : ''}`}
          >
            Te damos la bienvenida de nuevo, {userName}
          </div>
        </div>
        <div
          data-layer="Text"
          className={styles.text}
        >
          <div
            data-layer="Subtitle"
            className={`${styles.subtitle} ${isDarkMode ? styles.dark : ''}`}
          >
            {getSubtitle()}
          </div>
        </div>
      </div>
      <div
        data-layer="Frame 2147225819"
        className={styles.frame2147225819}
      >
        <ThemeToggler />
        <UserButton />
      </div>
    </div>
  );
};

export default Header;