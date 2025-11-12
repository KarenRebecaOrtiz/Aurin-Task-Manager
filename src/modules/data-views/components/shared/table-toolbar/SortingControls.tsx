import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import styles from './SortingControls.module.scss';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortColumn {
  id: string;
  label: string;
  sortable?: boolean;
}

interface SortingControlsProps {
  columns: SortColumn[];
  currentSortKey: string | null;
  currentSortDirection: SortDirection;
  onSort: (columnId: string, direction: SortDirection) => void;
  className?: string;
}

export const SortingControls: React.FC<SortingControlsProps> = ({
  columns,
  currentSortKey,
  currentSortDirection,
  onSort,
  className = '',
}) => {
  const handleColumnClick = (columnId: string) => {
    if (currentSortKey === columnId) {
      // Cycle through: asc -> desc -> null
      if (currentSortDirection === 'asc') {
        onSort(columnId, 'desc');
      } else if (currentSortDirection === 'desc') {
        onSort(columnId, null);
      } else {
        onSort(columnId, 'asc');
      }
    } else {
      // New column, start with asc
      onSort(columnId, 'asc');
    }
  };

  const getSortIcon = (columnId: string) => {
    if (currentSortKey !== columnId) {
      return <ArrowUpDown size={16} className={styles.iconInactive} />;
    }

    if (currentSortDirection === 'asc') {
      return <ArrowUp size={16} className={styles.iconActive} />;
    }

    return <ArrowDown size={16} className={styles.iconActive} />;
  };

  return (
    <div className={`${styles.sortingControls} ${className}`}>
      <div className={styles.sortLabel}>Sort by:</div>
      <div className={styles.columnButtons}>
        {columns
          .filter((col) => col.sortable !== false)
          .map((column) => (
            <motion.button
              key={column.id}
              className={`${styles.sortButton} ${
                currentSortKey === column.id ? styles.active : ''
              }`}
              onClick={() => handleColumnClick(column.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={`Sort by ${column.label}`}
            >
              <span className={styles.buttonLabel}>{column.label}</span>
              {getSortIcon(column.id)}
            </motion.button>
          ))}
      </div>
    </div>
  );
};
