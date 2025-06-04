'use client';

import { useUser, UserButton } from '@clerk/nextjs';
import ThemeToggler from './ThemeToggler';
import styles from './Header.module.scss';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface HeaderProps {
  selectedContainer: 'tareas' | 'proyectos' | 'cuentas' | 'miembros';
}

const Header: React.FC<HeaderProps> = ({ selectedContainer }) => {
  const { user } = useUser();
  const userName = user?.firstName || 'Usuario';
  const welcomeRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

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

  // Typewriter para bienvenida
  useEffect(() => {
    if (welcomeRef.current) {
      const text = `Te damos la bienvenida de nuevo, ${userName}`;
      welcomeRef.current.innerHTML = '';
      text.split('').forEach((char, index) => {
        const span = document.createElement('span');
        span.innerHTML = char === ' ' ? '&nbsp;' : char;
        span.style.opacity = '0';
        span.className = styles.typewriterChar;
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

  // Animación GSAP del ícono
  useEffect(() => {
    if (iconRef.current) {
      gsap.fromTo(
        iconRef.current,
        { scale: 0, rotate: 0 },
        {
          scale: 1,
          rotate: 0,
          duration: 0.6,
          ease: 'elastic.out(1, 0.6)',
        }
      );
    }
  }, []);

  return (
    <div
      ref={wrapperRef}
      data-layer="Wrapper"
      className={styles.wrapper}
    >
      <div data-layer="Frame 14" className={styles.frame14}>
        <div data-layer="Title" className={styles.title}>
          <div
            data-layer="Te damos la bienvenida de nuevo"
            ref={welcomeRef}
            className={styles.welcome}
          />
        </div>
        <div data-layer="Text" className={styles.text}>
          <div data-layer="Subtitle" className={styles.subtitle}>
            {getSubtitle()}
          </div>
        </div>
      </div>
      <div data-layer="Frame 2147225819" className={styles.frame2147225819}>
        <div
          ref={iconRef}
          className={styles.sunMoonWrapper}
        >
          <ThemeToggler />
        </div>
        <UserButton
          appearance={{
            elements: {
              userButtonAvatarBox: {
                width: '60px',
                height: '60px',
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default Header;