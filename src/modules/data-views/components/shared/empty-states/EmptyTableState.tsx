import React from 'react';
import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';
import styles from './EmptyTableState.module.scss';

interface EmptyTableStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyTableState: React.FC<EmptyTableStateProps> = ({
  title,
  description,
  icon,
  action,
  className = '',
}) => {
  return (
    <motion.div
      className={`${styles.emptyState} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.iconContainer}>
        {icon || <Inbox size={48} />}
      </div>

      <h3 className={styles.title}>{title}</h3>

      {description && <p className={styles.description}>{description}</p>}

      {action && (
        <motion.button
          className={styles.actionButton}
          onClick={action.onClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
};
