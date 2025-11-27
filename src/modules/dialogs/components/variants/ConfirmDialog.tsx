'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Dialog } from '../Dialog';
import { DialogConfig } from '../../types/dialog.types';
import { buttonVariants, transitions } from '../../config/animations';
import styles from '../../styles/Dialog.module.scss';

interface ConfirmDialogProps {
  config: DialogConfig;
  onClose: () => void;
}

export function ConfirmDialog({ config, onClose }: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    title,
    description,
    size,
    variant,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    closeOnOverlayClick,
    closeOnEscape,
    showCloseButton,
  } = config;

  const handleConfirm = useCallback(async () => {
    setIsLoading(true);
    try {
      if (onConfirm) {
        await onConfirm();
      }
      onClose();
    } catch (error) {
      console.error('Error in confirm action:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onConfirm, onClose]);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  }, [onCancel, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog
      open={true}
      onClose={handleCancel}
      title={title}
      description={description}
      size={size}
      variant={variant}
      closeOnOverlayClick={closeOnOverlayClick}
      closeOnEscape={closeOnEscape}
      showCloseButton={showCloseButton}
    >
      <div className={styles.confirmContent} onKeyDown={handleKeyDown}>
        <div className={styles.actions}>
          <motion.button
            type="button"
            onClick={handleCancel}
            className={styles.cancelButton}
            disabled={isLoading}
            variants={buttonVariants}
            initial="idle"
            whileHover="hover"
            whileTap="tap"
            transition={transitions.fast}
          >
            {cancelText}
          </motion.button>
          <motion.button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`${styles.confirmButton} ${styles[`variant${variant?.charAt(0).toUpperCase()}${variant?.slice(1)}`] || ''}`}
            variants={buttonVariants}
            initial="idle"
            whileHover="hover"
            whileTap="tap"
            transition={transitions.fast}
            autoFocus
          >
            {isLoading ? 'Procesando...' : confirmText}
          </motion.button>
        </div>
      </div>
    </Dialog>
  );
}
