/**
 * Breadcrumb Component
 *
 * Muestra la ruta de navegación actual en el Command Palette.
 * Permite navegar hacia atrás clickeando en niveles anteriores.
 *
 * @module command-palette/components/navigation/Breadcrumb
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import type { NavigationStackItem } from '../../types/commandPalette.types';
import styles from '../../styles/command-palette.module.scss';

export interface BreadcrumbProps {
  stack: NavigationStackItem[];
  onNavigateToIndex: (index: number) => void;
  onBack: () => void;
  canGoBack: boolean;
}

export function Breadcrumb({
  stack,
  onNavigateToIndex,
  onBack,
  canGoBack,
}: BreadcrumbProps) {
  // No mostrar breadcrumb si solo estamos en root
  if (stack.length <= 1) {
    return null;
  }

  return (
    <div className={styles.breadcrumb}>
      {/* Botón volver */}
      <motion.button
        type="button"
        className={styles.backButton}
        onClick={onBack}
        disabled={!canGoBack}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Volver (Backspace)"
      >
        <ChevronLeft size={16} />
      </motion.button>

      {/* Items del breadcrumb */}
      {stack.map((item, index) => {
        const isLast = index === stack.length - 1;
        const isFirst = index === 0;

        return (
          <React.Fragment key={`${item.level}-${index}`}>
            <motion.button
              type="button"
              className={`${styles.breadcrumbItem} ${isLast ? styles.active : ''}`}
              onClick={() => !isLast && onNavigateToIndex(index)}
              disabled={isLast}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              {isFirst && <Home size={12} />}
              <span>{item.title}</span>
            </motion.button>

            {!isLast && (
              <ChevronRight size={12} className={styles.breadcrumbSeparator} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default Breadcrumb;
