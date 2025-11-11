'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Modal } from '../Modal';
import { ModalConfig } from '../../stores/modalStore';
import { buttonVariants, inputVariants, contentVariants, transitions } from '../../config/animations';
import styles from '../../styles/Modal.module.scss';

interface ConfirmModalProps {
  config: ModalConfig;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ config, onClose }) => {
  const [confirmText, setConfirmText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    setConfirmText('');
    setIsProcessing(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (config.requiresConfirmation) {
      const keyword = config.confirmationKeyword?.toLowerCase() || 'eliminar';
      if (confirmText.toLowerCase() !== keyword) {
        return;
      }
    }

    setIsProcessing(true);

    try {
      if (config.onConfirm) {
        await config.onConfirm();
      }
      onClose();
    } catch (error) {
      console.error('Error in confirm action:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [config, confirmText, onClose]);

  const handleCancel = useCallback(() => {
    if (config.onCancel) {
      config.onCancel();
    }
    onClose();
  }, [config, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleConfirm();
      }
    },
    [handleConfirm]
  );

  const isConfirmDisabled = config.requiresConfirmation
    ? confirmText.toLowerCase() !== (config.confirmationKeyword?.toLowerCase() || 'eliminar')
    : false;

  // Determine button variant based on modal variant
  const getButtonClass = () => {
    switch (config.variant) {
      case 'danger':
        return styles.buttonDanger;
      case 'warning':
        return styles.buttonWarning;
      case 'success':
        return styles.buttonSuccess;
      default:
        return styles.buttonPrimary;
    }
  };

  return (
    <Modal config={config} onClose={onClose}>
      <motion.div
        className={styles.modalHeader}
        initial="hidden"
        animate="visible"
        variants={contentVariants}
        transition={{ ...transitions.fast, delay: 0.1 }}
      >
        <h2 className={styles.modalTitle}>{config.title || 'Confirmar acción'}</h2>
        {config.description && <p className={styles.modalDescription}>{config.description}</p>}
      </motion.div>

      {config.requiresConfirmation && (
        <motion.div
          className={styles.modalBody}
          initial="hidden"
          animate="visible"
          variants={contentVariants}
          transition={{ ...transitions.fast, delay: 0.15 }}
        >
          <motion.input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={`Escribe '${config.confirmationKeyword || 'Eliminar'}' para confirmar`}
            className={styles.input}
            autoFocus
            disabled={isProcessing}
            onKeyDown={handleKeyDown}
            variants={inputVariants}
            whileFocus="focus"
          />
        </motion.div>
      )}

      <motion.div
        className={styles.modalFooter}
        initial="hidden"
        animate="visible"
        variants={contentVariants}
        transition={{ ...transitions.fast, delay: 0.2 }}
      >
        <motion.button
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={handleCancel}
          disabled={isProcessing}
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
        >
          {config.cancelText || 'Cancelar'}
        </motion.button>
        <motion.button
          className={`${styles.button} ${getButtonClass()}`}
          onClick={handleConfirm}
          disabled={isConfirmDisabled || isProcessing}
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
        >
          {isProcessing ? 'Procesando...' : config.confirmText || 'Confirmar'}
        </motion.button>
      </motion.div>
    </Modal>
  );
};
