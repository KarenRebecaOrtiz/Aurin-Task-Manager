'use client';

import { useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Dialog } from '../Dialog';
import { DialogConfig } from '../../types/dialog.types';
import { buttonVariants, transitions } from '../../config/animations';
import styles from '../../styles/Dialog.module.scss';

interface AlertDialogProps {
  config: DialogConfig;
  onClose: () => void;
}

export function AlertDialog({ config, onClose }: AlertDialogProps) {
  const {
    title,
    description,
    size,
    variant,
    confirmText = 'Entendido',
    autoClose = false,
    autoCloseDelay = 3000,
    onConfirm,
    closeOnOverlayClick,
    closeOnEscape,
    showCloseButton,
  } = config;

  const handleConfirm = useCallback(() => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  }, [onConfirm, onClose]);

  // Auto-close functionality
  useEffect(() => {
    if (!autoClose) return;

    const timer = setTimeout(() => {
      handleConfirm();
    }, autoCloseDelay);

    return () => clearTimeout(timer);
  }, [autoClose, autoCloseDelay, handleConfirm]);

  return (
    <Dialog
      open={true}
      onClose={handleConfirm}
      title={title}
      description={description}
      size={size}
      variant={variant}
      closeOnOverlayClick={closeOnOverlayClick}
      closeOnEscape={closeOnEscape}
      showCloseButton={showCloseButton}
    >
      <div className={styles.alertContent}>
        <div className={styles.actions}>
          <motion.button
            type="button"
            onClick={handleConfirm}
            className={`${styles.confirmButton} ${styles[`variant${variant?.charAt(0).toUpperCase()}${variant?.slice(1)}`] || ''}`}
            variants={buttonVariants}
            initial="idle"
            whileHover="hover"
            whileTap="tap"
            transition={transitions.fast}
            autoFocus
          >
            {confirmText}
          </motion.button>
        </div>
      </div>
    </Dialog>
  );
}
