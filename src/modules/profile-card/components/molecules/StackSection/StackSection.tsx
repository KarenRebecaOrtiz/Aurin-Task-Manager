import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StackTag } from '../../atoms/StackTag/StackTag';
import { SectionTitle } from '../../atoms/SectionTitle/SectionTitle';
import { itemVariants } from '@/modules/dialog';
import styles from './StackSection.module.scss';

interface StackSectionProps {
  stack: string[];
}

export const StackSection: React.FC<StackSectionProps> = ({ stack }) => {
  const [showAllTechs, setShowAllTechs] = useState(false);

  // Configuración de límite de elementos visibles
  const maxVisibleTechs = 5;
  const visibleTechs = showAllTechs ? stack : stack.slice(0, maxVisibleTechs);
  const hasMoreTechs = stack.length > maxVisibleTechs;

  // Handler para toggle con useCallback
  const handleToggleTechs = useCallback(() => {
    setShowAllTechs(prev => !prev);
  }, []);

  // No renderizar si no hay stack
  if (!stack || stack.length === 0) {
    return null;
  }

  return (
    <motion.div className={styles.stackSection} variants={itemVariants}>
      <SectionTitle>Stack de Herramientas</SectionTitle>

      {/* Container de tags con animación suave */}
      <motion.div className={styles.stackTags} layout>
        <AnimatePresence mode="popLayout">
          {visibleTechs.map((tech) => (
            <motion.div
              key={tech}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <StackTag tech={tech} />
            </motion.div>
          ))}

          {/* Botón "Ver más/Ver menos" - Solo si hay más elementos */}
          {hasMoreTechs && (
            <motion.button
              key="view-more-button"
              type="button"
              className={styles.viewMoreButton}
              onClick={handleToggleTechs}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              aria-label={showAllTechs ? 'Ver menos tecnologías' : 'Ver más tecnologías'}
            >
              {showAllTechs ? 'Ver menos' : `+${stack.length - maxVisibleTechs}`}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};
