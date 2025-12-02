/**
 * Timer Module - Manual Time Entry Modal
 *
 * Modal dialog for entering time manually (retroactive time).
 * Wraps the TimeEntryForm in a modal overlay.
 *
 * @module timer/components/organisms/ManualTimeEntryModal
 */

'use client';

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { TimeEntryForm } from '../molecules/TimeEntryForm';
import styles from './ManualTimeEntryModal.module.scss';

interface ManualTimeEntryModalProps {
  isOpen: boolean;
  taskId: string;
  userId: string;
  userName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const modalAnimations = {
  overlay: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },
  content: {
    initial: { opacity: 0, scale: 0.95, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 20 },
    transition: { duration: 0.25, ease: 'easeOut' as const },
  },
};

/**
 * ManualTimeEntryModal Component
 *
 * A modal dialog that contains the TimeEntryForm for adding
 * retroactive/manual time entries to a task.
 */
export function ManualTimeEntryModal({
  isOpen,
  taskId,
  userId,
  userName,
  onClose,
  onSuccess,
}: ManualTimeEntryModalProps) {
  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSuccess = useCallback(() => {
    onSuccess?.();
    onClose();
  }, [onSuccess, onClose]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          onClick={handleOverlayClick}
          {...modalAnimations.overlay}
        >
          <motion.div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-time-entry-title"
            {...modalAnimations.content}
          >
            {/* Header */}
            <div className={styles.header}>
              <h2 id="manual-time-entry-title" className={styles.title}>
                Añadir Tiempo Manual
              </h2>
              <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Cerrar modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className={styles.content}>
              <TimeEntryForm
                taskId={taskId}
                userId={userId}
                userName={userName}
                onSuccess={handleSuccess}
                onCancel={onClose}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
