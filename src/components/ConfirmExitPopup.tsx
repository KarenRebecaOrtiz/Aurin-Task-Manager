'use client';

import { useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './DeletePopup.module.scss';

interface ConfirmExitPopupProps {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmExitPopup: React.FC<ConfirmExitPopupProps> = memo(({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
}) => {
  const confirmPopupRef = useRef<HTMLDivElement>(null);

  // Block scroll when popup is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle click outside to close
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      confirmPopupRef.current &&
      !confirmPopupRef.current.contains(event.target as Node) &&
      isOpen
    ) {
      onCancel();
    }
  }, [isOpen, onCancel]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, handleClickOutside]);

  // Optimized animation variants - same as DeletePopup
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const modalVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.9,
      y: 10
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0
    },
    exit: { 
      opacity: 0, 
      scale: 0.9,
      y: 10
    }
  };

  const buttonVariants = {
    hover: { scale: 1.02 },
    tap: { scale: 0.98 }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div 
          className={styles.deletePopupOverlay}
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <motion.div 
            className={styles.deletePopup} 
            ref={confirmPopupRef}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className={styles.deletePopupContent}>
              <motion.div 
                className={styles.deletePopupText}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.2, ease: 'easeOut' }}
              >
                <h2 className={styles.deletePopupTitle}>{title}</h2>
                <p className={styles.deletePopupDescription}>
                  {description}
                </p>
              </motion.div>
              
              <motion.div 
                className={styles.deletePopupActions}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.2, ease: 'easeOut' }}
              >
                <motion.button
                  className={styles.deleteCancelButton}
                  onClick={onCancel}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  className={styles.deleteConfirmButton}
                  onClick={onConfirm}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  Salir
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

ConfirmExitPopup.displayName = 'ConfirmExitPopup';

export default ConfirmExitPopup; 