'use client';

import { useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './DeletePopup.module.scss';
import { useDeleteConfirm, useIsDeleting, useDeletePopupActions } from '@/stores/deletePopupStore';

interface DeletePopupProps {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeletePopup: React.FC<DeletePopupProps> = memo(({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
}) => {
  const deletePopupRef = useRef<HTMLDivElement>(null);
  
  // Optimized Zustand selectors
  const deleteConfirm = useDeleteConfirm();
  const isDeleting = useIsDeleting();
  const { setDeleteConfirm, setIsDeleting, resetState } = useDeletePopupActions();

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

  // Handle click outside to close
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      deletePopupRef.current &&
      !deletePopupRef.current.contains(event.target as Node) &&
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

  // Optimized animation variants - faster and smoother
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

  const inputVariants = {
    focus: { scale: 1.01 }
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
            ref={deletePopupRef}
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
                variants={inputVariants}
                whileFocus="focus"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.2, ease: 'easeOut' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && deleteConfirm.toLowerCase() === 'eliminar') {
                    handleConfirm();
                  }
                  if (e.key === 'Escape') {
                    onCancel();
                  }
                }}
              />
              
              <motion.div 
                className={styles.deletePopupActions}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.2, ease: 'easeOut' }}
              >
                <motion.button
                  className={styles.deleteConfirmButton}
                  onClick={handleConfirm}
                  disabled={deleteConfirm.toLowerCase() !== 'eliminar' || isDeleting}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  {isDeleting ? 'Eliminando...' : 'Confirmar Eliminación'}
                </motion.button>
                <motion.button
                  className={styles.deleteCancelButton}
                  onClick={onCancel}
                  disabled={isDeleting}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  Cancelar
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

DeletePopup.displayName = 'DeletePopup';

export default DeletePopup;