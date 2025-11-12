import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { tableAnimations } from '@/modules/data-views/animations';
import styles from './TableHeader.module.scss';

interface TableHeaderProps {
  title: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchClear?: () => void;
  placeholder?: string;
  rightActions?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
}

export const TableHeader: React.FC<TableHeaderProps> = ({
  title,
  searchQuery,
  onSearchChange,
  onSearchClear,
  placeholder = 'Search...',
  rightActions,
  isLoading = false,
  className = '',
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onSearchChange('');
    onSearchClear?.();
  };

  return (
    <motion.div
      className={`${styles.tableHeader} ${className}`}
      {...tableAnimations.container}
    >
      <div className={styles.headerContent}>
        {/* Left: Title */}
        <div className={styles.titleSection}>
          <h2 className={styles.title}>{title}</h2>
        </div>

        {/* Center: Search */}
        <motion.div
          className={`${styles.searchSection} ${isFocused ? styles.focused : ''}`}
          animate={{ scale: isFocused ? 1.02 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <Search className={styles.searchIcon} size={18} />
          <input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={styles.searchInput}
            disabled={isLoading}
          />
          {searchQuery && (
            <motion.button
              onClick={handleClear}
              className={styles.clearButton}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Clear search"
            >
              <X size={16} />
            </motion.button>
          )}
        </motion.div>

        {/* Right: Actions */}
        {rightActions && (
          <div className={styles.actionsSection}>
            {rightActions}
          </div>
        )}
      </div>
    </motion.div>
  );
};
