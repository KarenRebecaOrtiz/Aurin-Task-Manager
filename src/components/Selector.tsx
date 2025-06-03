// src/components/ui/Selector.tsx
'use client';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import styles from './Selector.module.scss';

type Container = 'tareas' | 'proyectos' | 'cuentas' | 'miembros';

interface SelectorProps {
  selectedContainer: Container;
  setSelectedContainer: (container: Container) => void;
}

const Selector = ({ selectedContainer, setSelectedContainer }: SelectorProps) => {
  const buttonsRef = useRef<Array<React.MutableRefObject<HTMLButtonElement | null>>>([
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ]);

  useEffect(() => {
    // Animar el botón activo con GSAP
    buttonsRef.current.forEach((ref, index) => {
      const button = ref.current;
      if (button) {
        const isActive = button.dataset.container === selectedContainer;
        gsap.to(button, {
          backgroundColor: isActive ? '#171717' : '#0D0D0D',
          duration: 0.3,
          ease: 'power2.out',
        });
      }
    });
  }, [selectedContainer]);

  const handleClick = (container: Container) => {
    setSelectedContainer(container);
  };

  return (
    <div className={styles.menubar}>
      <div className={styles.wrapper}>
        <button
          ref={buttonsRef.current[0]}
          data-container="tareas"
          className={`${styles.menuItem} ${selectedContainer === 'tareas' ? styles.active : ''}`}
          onClick={() => handleClick('tareas')}
        >
          <div className={styles.text}>
            <div className={styles.tareas}>Tareas</div>
          </div>
        </button>
      </div>
      <div className={styles.wrapper}>
        <button
          ref={buttonsRef.current[1]}
          data-container="proyectos"
          className={`${styles.menuItem} ${selectedContainer === 'proyectos' ? styles.active : ''}`}
          onClick={() => handleClick('proyectos')}
        >
          <div className={styles.text}>
            <div className={styles.proyectos}>Proyectos</div>
          </div>
        </button>
      </div>
      <div className={styles.wrapper}>
        <button
          ref={buttonsRef.current[2]}
          data-container="cuentas"
          className={`${styles.menuItem} ${selectedContainer === 'cuentas' ? styles.active : ''}`}
          onClick={() => handleClick('cuentas')}
        >
          <div className={styles.text}>
            <div className={styles.cuentas}>Cuentas</div>
          </div>
        </button>
      </div>
      <div className={styles.wrapper}>
        <button
          ref={buttonsRef.current[3]}
          data-container="miembros"
          className={`${styles.menuItem} ${selectedContainer === 'miembros' ? styles.active : ''}`}
          onClick={() => handleClick('miembros')}
        >
          <div className={styles.text}>
            <div className={styles.miembros}>Miembros</div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default Selector;