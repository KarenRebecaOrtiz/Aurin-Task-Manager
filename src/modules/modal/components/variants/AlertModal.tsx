'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Modal } from '../Modal';
import { ModalConfig } from '../../stores/modalStore';
import { buttonVariants, contentVariants, transitions } from '../../config/animations';
import styles from '../../styles/Modal.module.scss';

interface AlertModalProps {
  config: ModalConfig;
  onClose: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({ config, onClose }) => {
  // Auto-close if configured
  useEffect(() => {
    if (config.autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, config.autoCloseDelay || 3000);

      return () => clearTimeout(timer);
    }
  }, [config.autoClose, config.autoCloseDelay, onClose]);

  const handleClose = () => {
    if (config.onConfirm) {
      config.onConfirm();
    }
    onClose();
  };

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
        <h2 className={styles.modalTitle}>{config.title || 'Alerta'}</h2>
        {config.description && <p className={styles.modalDescription}>{config.description}</p>}
      </motion.div>

      {config.content && (
        <motion.div
          className={styles.modalBody}
          initial="hidden"
          animate="visible"
          variants={contentVariants}
          transition={{ ...transitions.fast, delay: 0.15 }}
        >
          {config.content}
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
          className={`${styles.button} ${getButtonClass()}`}
          onClick={handleClose}
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
        >
          {config.confirmText || 'Aceptar'}
        </motion.button>
      </motion.div>
    </Modal>
  );
};
