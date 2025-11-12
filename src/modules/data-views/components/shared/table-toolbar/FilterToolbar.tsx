import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';
import { tableAnimations } from '@/modules/data-views/animations';
import styles from './FilterToolbar.module.scss';

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
  isActive?: boolean;
}

export interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
  onSelect: (optionId: string) => void;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

interface FilterToolbarProps {
  filters: FilterGroup[];
  onClearAll?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  filters,
  onClearAll,
  hasActiveFilters = false,
  className = '',
}) => {
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());

  const toggleDropdown = (filterId: string) => {
    const newOpen = new Set(openDropdowns);
    if (newOpen.has(filterId)) {
      newOpen.delete(filterId);
    } else {
      newOpen.add(filterId);
    }
    setOpenDropdowns(newOpen);
  };

  return (
    <motion.div
      className={`${styles.filterToolbar} ${className}`}
      {...tableAnimations.container}
    >
      <div className={styles.filterContainer}>
        {filters.map((filter) => (
          <div key={filter.id} className={styles.filterGroup}>
            <motion.button
              className={styles.filterButton}
              onClick={() => toggleDropdown(filter.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className={styles.filterLabel}>{filter.label}</span>
              <motion.div
                animate={{ rotate: openDropdowns.has(filter.id) ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={16} />
              </motion.div>
            </motion.button>

            <AnimatePresence>
              {openDropdowns.has(filter.id) && (
                <motion.div
                  className={styles.dropdown}
                  {...tableAnimations.dropdown}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  {filter.options.map((option) => (
                    <motion.button
                      key={option.id}
                      className={`${styles.option} ${
                        option.isActive ? styles.active : ''
                      }`}
                      onClick={() => {
                        filter.onSelect(option.id);
                      }}
                      whileHover={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className={styles.optionLabel}>{option.label}</span>
                      {option.count !== undefined && (
                        <span className={styles.optionCount}>
                          {option.count}
                        </span>
                      )}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {hasActiveFilters && onClearAll && (
          <motion.button
            className={styles.clearAllButton}
            onClick={onClearAll}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <X size={16} />
            <span>Clear All</span>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};
