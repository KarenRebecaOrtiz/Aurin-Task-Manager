import React from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import styles from './NoResultsState.module.scss';

interface NoResultsStateProps {
  searchQuery: string;
  onClearSearch: () => void;
  className?: string;
}

export const NoResultsState: React.FC<NoResultsStateProps> = ({
  searchQuery,
  onClearSearch,
  className = '',
}) => {
  return (
    <motion.div
      className={`${styles.noResults} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.iconContainer}>
        <Search size={48} />
      </div>

      <h3 className={styles.title}>No results found</h3>

      <p className={styles.description}>
        No items match your search for <strong>"{searchQuery}"</strong>
      </p>

      <motion.button
        className={styles.clearButton}
        onClick={onClearSearch}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Clear search
      </motion.button>
    </motion.div>
  );
};
