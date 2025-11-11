'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ModalConfig } from '../stores/modalStore';
import {
  overlayVariants,
  modalCenterVariants,
  modalTopVariants,
  modalBottomVariants,
  transitions,
} from '../config/animations';
import styles from '../styles/Modal.module.scss';

interface ModalProps {
  config: ModalConfig;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ config, onClose, children }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  // Ensure we're on the client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Block body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Handle ESC key
  useEffect(() => {
    if (!config.closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [config.closeOnEscape, onClose]);

  // Handle click outside
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (config.closeOnOverlayClick && e.target === e.currentTarget) {
        onClose();
      }
    },
    [config.closeOnOverlayClick, onClose]
  );

  // Prevent click propagation on modal
  const handleModalClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Select animation variant based on position
  const getModalVariants = () => {
    switch (config.position) {
      case 'top':
        return modalTopVariants;
      case 'bottom':
        return modalBottomVariants;
      default:
        return modalCenterVariants;
    }
  };

  // Build modal classes
  const modalClasses = [
    styles.modal,
    styles[config.size || 'md'],
    styles[config.position || 'center'],
    config.variant ? styles[`variant${config.variant.charAt(0).toUpperCase() + config.variant.slice(1)}`] : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence mode="wait">
      <motion.div
        className={styles.modalOverlay}
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={transitions.fast}
        onClick={handleOverlayClick}
      >
        <motion.div
          ref={modalRef}
          className={modalClasses}
          variants={getModalVariants()}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={transitions.fast}
          onClick={handleModalClick}
        >
          {config.showCloseButton && (
            <button
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Cerrar modal"
            >
              <X />
            </button>
          )}

          <div className={styles.modalContent}>{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};
