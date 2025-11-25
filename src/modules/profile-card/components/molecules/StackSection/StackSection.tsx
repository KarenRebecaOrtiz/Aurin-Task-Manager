// TODO: Sección de stack con lógica de expand/collapse
// TODO: Props: stack (string[])
// TODO: Incluir useRef y useState para overflow detection
// TODO: Usar StackTag atom para renderizar cada tecnología
// TODO: Usar SectionTitle atom para el título
// TODO: Toggle "Ver más/Ver menos" con animación
// TODO: Aplicar motion para animación de expansión

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { StackTag } from '../../atoms/StackTag/StackTag';
import { SectionTitle } from '../../atoms/SectionTitle/SectionTitle';
import { itemVariants } from '@/modules/dialog';
import styles from './StackSection.module.scss';

interface StackSectionProps {
  stack: string[];
}

export const StackSection: React.FC<StackSectionProps> = ({ stack }) => {
  const [showAllTechs, setShowAllTechs] = useState(false);
  const stackContainerRef = useRef<HTMLDivElement>(null);
  const [isStackOverflowing, setIsStackOverflowing] = useState(false);

  // TODO: Detectar si el contenido desborda para mostrar el botón toggle
  useEffect(() => {
    const checkOverflow = () => {
      const container = stackContainerRef.current;
      if (container) {
        const isOverflowing = container.scrollHeight > 40; // Approx height for one row
        setIsStackOverflowing(isOverflowing);
      }
    };

    // Check on mount and on window resize
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [stack]);

  // TODO: No renderizar si no hay stack
  if (!stack || stack.length === 0) {
    return null;
  }

  return (
    <motion.div className={styles.stackSection} variants={itemVariants}>
      <SectionTitle>Stack de Herramientas</SectionTitle>

      {/* TODO: Container animado con maxHeight dinámico */}
      <motion.div
        ref={stackContainerRef}
        className={styles.stackTags}
        initial={false}
        animate={{ maxHeight: showAllTechs ? '1000px' : '40px' }}
        transition={{ duration: 0.5, ease: [0.04, 0.62, 0.23, 0.98] }}
      >
        {/* TODO: Mapear stack array usando StackTag atom */}
        {stack.map(tech => (
          <StackTag key={tech} tech={tech} />
        ))}
      </motion.div>

      {/* TODO: Botón toggle solo si hay overflow */}
      {isStackOverflowing && (
        <button
          onClick={() => setShowAllTechs(!showAllTechs)}
          className={styles.toggleTechsButton}
        >
          {showAllTechs ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </motion.div>
  );
};
