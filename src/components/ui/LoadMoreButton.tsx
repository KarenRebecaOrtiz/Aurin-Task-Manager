import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './LoadMoreButton.module.scss';

interface LoadMoreButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  hasMoreMessages?: boolean;
  className?: string;
  showNoMoreMessage?: boolean;
}

const LoadMoreButton: React.FC<LoadMoreButtonProps> = ({
  onClick,
  isLoading = false,
  hasMoreMessages = true,
  className = '',
  showNoMoreMessage = false
}) => {
  // Debug log
  if (process.env.NODE_ENV === 'development') {
    console.log('[LoadMoreButton] hasMoreMessages:', hasMoreMessages, 'isLoading:', isLoading, 'showNoMoreMessage:', showNoMoreMessage);
  }
  
  return (
    <div className={`${styles.loadMoreContainer} ${className}`}>
      <AnimatePresence mode="wait">
        {!hasMoreMessages ? (
          <motion.div
            key="no-more-messages"
            className={styles.noMoreMessage}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <span>Fin de la conversación (por ahora).</span>
          </motion.div>
        ) : (
          <motion.button
            key="load-more-button"
            className={styles.loadMoreButton}
            onClick={onClick}
            disabled={isLoading}
            aria-label="Cargar más mensajes"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <motion.div 
                className={styles.loadingSpinner}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className={styles.spinner}></div>
                <span>Cargando...</span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={styles.loadIcon}
                  style={{ transform: 'rotate(180deg)' }}
                >
                  <path d="M7 13l5 5 5-5" />
                  <path d="M7 6l5 5 5-5" />
                </svg>
                <span>Cargar más mensajes</span>
              </motion.div>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LoadMoreButton; 