'use client';

import { memo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import styles from './DeletePopup.module.scss';
import { useSimpleDeletePopupStore } from '@/stores/simpleDeletePopupStore';

interface SimpleDeletePopupProps {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const SimpleDeletePopup: React.FC<SimpleDeletePopupProps> = memo(({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
}) => {
  // Optimized Zustand selectors with shallow comparison
  const { deleteConfirm, isDeleting, setDeleteConfirm, setIsDeleting, resetState } = useSimpleDeletePopupStore(
    useShallow((state) => ({
      deleteConfirm: state.deleteConfirm,
      isDeleting: state.isDeleting,
      setDeleteConfirm: state.setDeleteConfirm,
      setIsDeleting: state.setIsDeleting,
      resetState: state.resetState,
    }))
  );

  // Reset state when popup opens/closes
  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

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

  const handleConfirm = useCallback(async () => {
    if (deleteConfirm.toLowerCase() === 'eliminar') {
      setIsDeleting(true);
      try {
        await onConfirm();
      } finally {
        setIsDeleting(false);
      }
    }
  }, [deleteConfirm, onConfirm, setIsDeleting]);

  const handleCancel = useCallback(() => {
    resetState();
    onCancel();
  }, [onCancel, resetState]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && deleteConfirm.toLowerCase() === 'eliminar') {
      handleConfirm();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  }, [deleteConfirm, handleConfirm, handleCancel]);

  const isConfirmDisabled = deleteConfirm.toLowerCase() !== 'eliminar';

  // Memoize animation variants to prevent re-creation
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
                  {description} <strong>Esta acción no se puede deshacer.</strong>
                </p>
              </motion.div>
              
              <motion.input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="Escribe 'Eliminar' para confirmar"
                className={styles.deleteConfirmInput}
                autoFocus
                disabled={isDeleting}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.2, ease: 'easeOut' }}
                onKeyDown={handleKeyDown}
              />
              
              <motion.div 
                className={styles.deletePopupActions}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.2, ease: 'easeOut' }}
              >
                <motion.button
                  className={styles.deleteCancelButton}
                  onClick={handleCancel}
                  disabled={isDeleting}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  className={styles.deleteConfirmButton}
                  onClick={handleConfirm}
                  disabled={isConfirmDisabled || isDeleting}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  {isDeleting ? 'Eliminando...' : 'Confirmar Eliminación'}
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

SimpleDeletePopup.displayName = 'SimpleDeletePopup';

export default SimpleDeletePopup; 