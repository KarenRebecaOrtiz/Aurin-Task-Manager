import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Settings } from 'lucide-react';
import { tableAnimations } from '@/modules/data-views/animations';
import styles from './ColumnVisibilityMenu.module.scss';

export interface ColumnOption {
  id: string;
  label: string;
  visible: boolean;
}

interface ColumnVisibilityMenuProps {
  columns: ColumnOption[];
  onToggleColumn: (columnId: string) => void;
  onResetColumns?: () => void;
  className?: string;
}

export const ColumnVisibilityMenu: React.FC<ColumnVisibilityMenuProps> = ({
  columns,
  onToggleColumn,
  onResetColumns,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const visibleCount = columns.filter((col) => col.visible).length;
  const totalCount = columns.length;

  return (
    <div className={`${styles.columnVisibilityMenu} ${className}`}>
      <motion.button
        className={styles.triggerButton}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Column visibility"
      >
        <Settings size={18} />
        <span className={styles.badge}>{visibleCount}</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.dropdown}
            {...tableAnimations.dropdown}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className={styles.header}>
              <h4 className={styles.title}>Columns</h4>
              {onResetColumns && (
                <motion.button
                  className={styles.resetButton}
                  onClick={onResetColumns}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Reset
                </motion.button>
              )}
            </div>

            <div className={styles.columnList}>
              {columns.map((column) => (
                <motion.label
                  key={column.id}
                  className={styles.columnItem}
                  whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
                >
                  <input
                    type="checkbox"
                    checked={column.visible}
                    onChange={() => onToggleColumn(column.id)}
                    className={styles.checkbox}
                  />
                  <span className={styles.columnLabel}>{column.label}</span>
                  <span className={styles.icon}>
                    {column.visible ? (
                      <Eye size={16} />
                    ) : (
                      <EyeOff size={16} />
                    )}
                  </span>
                </motion.label>
              ))}
            </div>

            <div className={styles.footer}>
              <small className={styles.info}>
                {visibleCount} of {totalCount} visible
              </small>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
