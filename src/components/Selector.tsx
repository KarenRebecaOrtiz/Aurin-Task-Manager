'use client';

import { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import styles from './Selector.module.scss';

type Container = 'tareas' | 'cuentas' | 'miembros' | null;

interface SelectorProps {
  selectedContainer: Container | null;
  setSelectedContainer: (c: Container | null) => void;
  options: { value: string; label: string }[];
}

export default function Selector({
  selectedContainer,
  setSelectedContainer,
  options,
}: SelectorProps) {
  /* ---------------- refs ---------------- */
  const btnRefs = useRef<HTMLButtonElement[]>([]);
  const addRef = (el: HTMLButtonElement | null) => {
    if (el && !btnRefs.current.includes(el)) btnRefs.current.push(el);
  };

  const menubarRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  /* ------------- tema (oscuro / claro) ------------ */
  const [isDark, setIsDark] = useState(false);

  // Ocultar el indicador inicialmente si no hay selección
  useEffect(() => {
    if (indicatorRef.current && !selectedContainer) {
      indicatorRef.current.style.display = 'none';
      indicatorRef.current.style.opacity = '0';
      indicatorRef.current.style.transform = 'scale(0)';
    }
  }, []);

  useEffect(() => {
    const computeDark = () =>
      document.documentElement.classList.contains('dark') ||
      document.body.classList.contains('dark');
    setIsDark(computeDark());

    const obs = new MutationObserver(() => setIsDark(computeDark()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    const storageListener = () => setIsDark(computeDark());
    window.addEventListener('storage', storageListener);

    return () => {
      obs.disconnect();
      window.removeEventListener('storage', storageListener);
    };
  }, []);

  /* ------------- GSAP: “liquid glass” slide ------------- */
  useLayoutEffect(() => {
    if (!menubarRef.current || !indicatorRef.current) return;
    
    // Si no hay elemento seleccionado, ocultar completamente el indicador
    if (!selectedContainer) {
      gsap.to(indicatorRef.current, {
        opacity: 0,
        scale: 0,
        duration: 0.3,
        ease: 'power2.out',
        onComplete: () => {
          if (indicatorRef.current) {
            indicatorRef.current.style.display = 'none';
          }
        }
      });
      return;
    }
    
    const activeBtn = btnRefs.current.find(b => b.dataset.container === selectedContainer);
    if (!activeBtn) {
      // Si no se encuentra el botón activo, ocultar el indicador
      gsap.to(indicatorRef.current, {
        opacity: 0,
        scale: 0,
        duration: 0.3,
        ease: 'power2.out',
        onComplete: () => {
          if (indicatorRef.current) {
            indicatorRef.current.style.display = 'none';
          }
        }
      });
      return;
    }

    // Mostrar el indicador antes de animarlo
    if (indicatorRef.current) {
      indicatorRef.current.style.display = 'block';
    }

    const btnRect = activeBtn.getBoundingClientRect();
    const barRect = menubarRef.current.getBoundingClientRect();

    const x = btnRect.left - barRect.left;
    const y = btnRect.top - barRect.top;
    const w = btnRect.width;
    const h = btnRect.height;

    gsap.to(indicatorRef.current, {
      x,
      y,
      width: w,
      height: h,
      opacity: 1,
      scale: 1,
      duration: 0.45,
      ease: 'power3.out',
      borderRadius: 12,
    });
  }, [selectedContainer]);

  /* ------------- colour tween (texto / bg fallback) ------------- */
  useLayoutEffect(() => {
    const inactive = 'transparent';
    const active = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
    const color   = isDark ? '#ffffff' : '#09090b';

    btnRefs.current.forEach(btn => {
      const isActive = selectedContainer && btn.dataset.container === selectedContainer;
      gsap.to(btn, {
        backgroundColor: isActive ? active : inactive,
        color,
        duration: 0.25,
        ease: 'power2.out',
      });
    });
  }, [selectedContainer, isDark]);

  /* ---------------- render ---------------- */
  return (
    <div ref={menubarRef} className={styles.menubar}>
      {/* cristal deslizante */}
      <div ref={indicatorRef} className={styles.indicator} />

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
