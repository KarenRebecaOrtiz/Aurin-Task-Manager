'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './DeletePopup.module.scss';

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
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset state when popup opens/closes
  useEffect(() => {
    if (!isOpen) {
      setDeleteConfirm('');
      setIsDeleting(false);
    }
  }, [isOpen]);

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
  }, [deleteConfirm, onConfirm]);

  const handleCancel = useCallback(() => {
    setDeleteConfirm('');
    setIsDeleting(false);
    onCancel();
  }, [onCancel]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && deleteConfirm.toLowerCase() === 'eliminar') {
      handleConfirm();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  }, [deleteConfirm, handleConfirm, handleCancel]);

  const isConfirmDisabled = deleteConfirm.toLowerCase() !== 'eliminar';

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div 
          className={styles.deletePopupOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          <motion.div 
            className={styles.deletePopup}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className={styles.deletePopupContent}>
              <motion.div 
                className={styles.deletePopupText}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.15, ease: 'easeOut' }}
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
                transition={{ delay: 0.1, duration: 0.15, ease: 'easeOut' }}
                onKeyDown={handleKeyDown}
              />
              
              <motion.div 
                className={styles.deletePopupActions}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.15, ease: 'easeOut' }}
              >
                <motion.button
                  className={styles.deleteConfirmButton}
                  onClick={handleConfirm}
                  disabled={isConfirmDisabled || isDeleting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isDeleting ? 'Eliminando...' : 'Confirmar Eliminación'}
                </motion.button>
                <motion.button
                  className={styles.deleteCancelButton}
                  onClick={handleCancel}
                  disabled={isDeleting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
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

SimpleDeletePopup.displayName = 'SimpleDeletePopup';

export default SimpleDeletePopup; 