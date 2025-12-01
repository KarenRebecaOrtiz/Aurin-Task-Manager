import React, { useState, useCallback } from 'react';
import { StackTag } from '../../atoms/StackTag/StackTag';
import { SectionTitle } from '../../atoms/SectionTitle/SectionTitle';
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
    <div className={styles.stackSection}>
      <SectionTitle>Stack de Herramientas</SectionTitle>

      {/* Container de tags sin animación */}
      <div className={styles.stackTags}>
        {visibleTechs.map((tech) => (
          <div key={tech}>
            <StackTag tech={tech} />
          </div>
        ))}

        {/* Botón "Ver más/Ver menos" - Solo si hay más elementos */}
        {hasMoreTechs && (
          <button
            key="view-more-button"
            type="button"
            className={styles.viewMoreButton}
            onClick={handleToggleTechs}
            aria-label={showAllTechs ? 'Ver menos tecnologías' : 'Ver más tecnologías'}
          >
            {showAllTechs ? 'Ver menos' : `+${stack.length - maxVisibleTechs}`}
          </button>
        )}
      </div>
    </div>
  );
};
