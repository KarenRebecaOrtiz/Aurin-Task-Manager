import React, { useState, useCallback } from 'react';
import { StackTag } from '../../atoms/StackTag/StackTag';
import { SectionTitle } from '../../atoms/SectionTitle/SectionTitle';
import styles from './StackSection.module.scss';

interface StackSectionProps {
  stack: string[];
}

const MAX_VISIBLE_TECHS = 5;

export const StackSection: React.FC<StackSectionProps> = ({ stack }) => {
  const [showAllTechs, setShowAllTechs] = useState(false);

  const visibleTechs = showAllTechs ? stack : stack.slice(0, MAX_VISIBLE_TECHS);
  const hasMoreTechs = stack.length > MAX_VISIBLE_TECHS;

  const handleToggleTechs = useCallback(() => {
    setShowAllTechs(prev => !prev);
  }, []);

  if (!stack || stack.length === 0) {
    return null;
  }

  return (
    <div className={styles.stackSection}>
      <SectionTitle>Stack de Herramientas</SectionTitle>

      <div className={styles.stackTags}>
        {visibleTechs.map((tech) => (
          <div key={tech}>
            <StackTag tech={tech} />
          </div>
        ))}

        {hasMoreTechs && (
          <button
            type="button"
            className={styles.viewMoreButton}
            onClick={handleToggleTechs}
            aria-label={showAllTechs ? 'Ver menos tecnologías' : 'Ver más tecnologías'}
          >
            {showAllTechs ? 'Ver menos' : `+${stack.length - MAX_VISIBLE_TECHS}`}
          </button>
        )}
      </div>
    </div>
  );
};
