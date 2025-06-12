'use client';

import { useLayoutEffect, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import styles from './Selector.module.scss';

type Container = 'tareas' | 'cuentas' | 'miembros';

interface SelectorProps {
  selectedContainer: Container;
  setSelectedContainer: (c: Container) => void;
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
    const activeBtn = btnRefs.current.find(b => b.dataset.container === selectedContainer);
    if (!activeBtn) return;

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
      const isActive = btn.dataset.container === selectedContainer;
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
