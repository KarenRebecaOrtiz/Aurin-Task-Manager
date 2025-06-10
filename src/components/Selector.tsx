'use client';

import { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import styles from './Selector.module.scss';

type Container = 'tareas' | 'cuentas' | 'miembros';

interface SelectorProps {
  selectedContainer: Container;
  setSelectedContainer: (container: Container) => void;
  options: { value: string; label: string }[]; // Added options prop
}

export default function Selector({
  selectedContainer,
  setSelectedContainer,
  options,
}: SelectorProps) {
  /* ---------- refs dinámicos ---------- */
  const btnRefs = useRef<HTMLButtonElement[]>([]);
  const addRef = (el: HTMLButtonElement | null) => {
    if (el && !btnRefs.current.includes(el)) btnRefs.current.push(el);
  };

  /* ---------- estado del tema ---------- */
  const [isDark, setIsDark] = useState(false); // siempre seguro en SSR

  useEffect(() => {
    if (typeof window === 'undefined') return; // evita SSR

    /* helper para saber si el doc está en dark */
    const computeDark = () =>
      document.documentElement.classList.contains('dark') ||
      document.body.classList.contains('dark');

    /* estado inicial tras montar */
    setIsDark(computeDark());

    /* observa cambios de clase "dark" */
    const observer = new MutationObserver(() => setIsDark(computeDark()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });

    /* escucha cambios vía localStorage (toggle en otra pestaña) */
    const storageListener = () => setIsDark(computeDark());
    window.addEventListener('storage', storageListener);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', storageListener);
    };
  }, []);

  /* ---------- animación GSAP ---------- */
  useLayoutEffect(() => {
    if (btnRefs.current.length === 0) return;

    const inactiveBg = isDark ? '#0D0D0D' : '#FFFFFF';
    const activeBg = isDark ? '#171717' : '#F4F4F5';
    const textColor = isDark ? '#FFFFFF' : '#09090B';

    btnRefs.current.forEach((btn) => {
      const isActive = btn.dataset.container === selectedContainer;
      gsap.to(btn, {
        backgroundColor: isActive ? activeBg : inactiveBg,
        color: textColor,
        duration: 0.3,
        ease: 'power2.out',
      });
    });
  }, [selectedContainer, isDark]);

  /* ---------- render ---------- */
  return (
    <div className={styles.menubar}>
      {options.map(({ value, label }) => (
        <div key={value} className={styles.wrapper}>
          <button
            ref={addRef}
            data-container={value}
            className={`${styles.menuItem} ${
              selectedContainer === value ? styles.active : ''
            }`}
            onClick={() => setSelectedContainer(value as Container)}
          >
            <span className={styles.text}>{label}</span>
          </button>
        </div>
      ))}
    </div>
  );
}