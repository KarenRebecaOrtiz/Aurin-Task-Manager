'use client';

import React from 'react';
import { SearchInput } from '@/modules/shared/components/atoms/Input';
import styles from './TableToolbar.module.scss';

export interface TableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;
  filters?: React.ReactNode;
  className?: string;
}

/**
 * TableToolbar - Barra de herramientas reutilizable para tablas
 * 
 * Composición:
 * - Acciones izquierda (botones de navegación)
 * - Búsqueda
 * - Filtros
 * - Acciones derecha (botones de acción)
 */
export const TableToolbar: React.FC<TableToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  leftActions,
  rightActions,
  filters,
  className = '',
}) => {
  return (
    <div className={`${styles.toolbar} ${className}`}>
      <div className={styles.searchSection}>
        {leftActions && <div className={styles.leftActions}>{leftActions}</div>}
        <SearchInput
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
        />
      </div>

      <div className={styles.actionsSection}>
        {filters && <div className={styles.filters}>{filters}</div>}
        {rightActions && <div className={styles.rightActions}>{rightActions}</div>}
      </div>
    </div>
  );
};
