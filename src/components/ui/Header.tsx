'use client';
import { useUser, UserButton } from '@clerk/nextjs';
import ThemeToggler from './ThemeToggler';
import styles from './Header.module.scss';
import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface HeaderProps {
  selectedContainer: 'tareas' | 'proyectos' | 'cuentas' | 'miembros';
}

const Header: React.FC<HeaderProps> = ({ selectedContainer }) => {
  const { user } = useUser();
  const userName = user?.firstName || 'Usuario';
  const [isDarkMode, setIsDarkMode] = useState(false);
  const welcomeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Verificar el tema solo en el cliente
    const savedTheme = localStorage.getItem('theme');
    setIsDarkMode(savedTheme === 'dark');
  }, []);

  useEffect(() => {
    // Typewriter para "Te damos la bienvenida de nuevo, {userName}"
    if (welcomeRef.current) {
      const text = `Te damos la bienvenida de nuevo, ${userName}`;
      welcomeRef.current.innerHTML = '';
      // Dividir el texto en caracteres, preservando espacios
      text.split('').forEach((char, index) => {
        const span = document.createElement('span');
        span.innerHTML = char === ' ' ? '&nbsp;' : char; // Usar &nbsp; para espacios
        span.style.opacity = '0';
        span.className = styles.typewriterChar; // Clase para control de estilo
        welcomeRef.current!.appendChild(span);
        gsap.to(span, {
          opacity: 1,
          duration: 0.05,
          delay: index * 0.05,
          ease: 'power1.in',
        });
      });
    }

    return () => {
      gsap.killTweensOf(welcomeRef.current);
    };
  }, [userName]);

  const getSubtitle = () => {
    switch (selectedContainer) {
      case 'tareas':
        return 'Esta es una lista de tus tareas actuales';
      case 'proyectos':
        return 'Aquí puedes gestionar los proyectos asignados a cada cuenta';
      case 'cuentas':
        return 'Aquí puedes ver y gestionar todas las cuentas asociadas a tu organización';
      case 'miembros':
        return 'Aquí puedes consultar y gestionar todos los miembros de tu organización';
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
            ref={welcomeRef}
            className={`${styles.welcome} ${isDarkMode ? styles.dark : ''}`}
          />
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