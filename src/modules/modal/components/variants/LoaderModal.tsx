'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Modal } from '../Modal';
import { ModalConfig } from '../../stores/modalStore';
import { contentVariants, transitions } from '../../config/animations';
import styles from '../../styles/Modal.module.scss';

interface LoaderModalProps {
  config: ModalConfig;
  onClose: () => void;
}

export const LoaderModal: React.FC<LoaderModalProps> = ({ config, onClose }) => {
  const [progress, setProgress] = useState(config.progress || 0);

  useEffect(() => {
    if (config.progress !== undefined) {
      setProgress(config.progress);
      return;
    }

    // Simulate progress if not provided
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 200);

    // Auto-close if configured
    if (config.autoClose) {
      const closeTimer = setTimeout(() => {
        onClose();
      }, config.autoCloseDelay || 2000);

      return () => {
        clearTimeout(closeTimer);
        clearInterval(progressInterval);
      };
    }

    return () => clearInterval(progressInterval);
  }, [config.progress, config.autoClose, config.autoCloseDelay, onClose]);

  return (
    <Modal
      config={{
        ...config,
        closeOnOverlayClick: false,
        closeOnEscape: false,
        showCloseButton: false,
      }}
      onClose={onClose}
    >
      <motion.div
        className={styles.modalHeader}
        initial="hidden"
        animate="visible"
        variants={contentVariants}
        transition={{ ...transitions.fast, delay: 0.1 }}
      >
        <h2 className={styles.modalTitle}>{config.title || 'Cargando...'}</h2>
        {config.description && <p className={styles.modalDescription}>{config.description}</p>}
      </motion.div>

      <motion.div
        className={styles.loaderContainer}
        initial="hidden"
        animate="visible"
        variants={contentVariants}
        transition={{ ...transitions.fast, delay: 0.2 }}
      >
        <div className={styles.spinner}>
          <div className={styles.spinnerInner} />
        </div>

        <div style={{ width: '100%' }}>
          <div className={styles.progressBar}>
            <motion.div
              className={styles.progressFill}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            />
          </div>
          <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            <span className={styles.progressText}>{Math.round(progress)}%</span>
          </div>
        </div>

        <p className={styles.modalDescription}>Procesando...</p>
      </motion.div>
    </Modal>
  );
};
