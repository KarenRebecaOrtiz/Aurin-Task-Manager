/**
 * Timer Module - Confirm Timer Switch Component
 *
 * Confirmation dialog when switching from one active timer to another
 *
 * @module timer/components/organisms/ConfirmTimerSwitch
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ConfirmTimerSwitchProps } from '../../types/timer.types';
import { formatSecondsToHHMMSS } from '../../utils/timerFormatters';
import styles from './ConfirmTimerSwitch.module.scss';

/**
 * ConfirmTimerSwitch Component
 *
 * Dialog that appears when user tries to start a timer while another is running
 * - Shows current timer info
 * - Shows new timer info
 * - Allows user to confirm switch or cancel
 * - Automatically stops old timer and saves time
 *
 * @param isOpen - Whether dialog is visible
 * @param currentTaskId - ID of task with currently running timer
 * @param newTaskId - ID of task user wants to start timer on
 * @param currentTimerSeconds - Accumulated seconds on current timer
 * @param onConfirm - Callback when user confirms switch
 * @param onCancel - Callback when user cancels
 */
export function ConfirmTimerSwitch({
  isOpen,
  currentTaskId,
  newTaskId,
  currentTimerSeconds,
  onConfirm,
  onCancel
}: ConfirmTimerSwitchProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            className={styles.dialog}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            {/* Warning Icon */}
            <div className={styles.iconContainer}>
              <span className={styles.warningIcon} role="img" aria-label="Advertencia">
                ⚠️
              </span>
            </div>

            {/* Title */}
            <h2 id="dialog-title" className={styles.title}>
              Timer Activo Detectado
            </h2>

            {/* Message */}
            <div className={styles.message}>
              <p className={styles.messageParagraph}>
                Ya tienes un timer activo en la tarea{' '}
                <strong className={styles.taskId}>{currentTaskId}</strong> con{' '}
                <strong className={styles.timeValue}>
                  {formatSecondsToHHMMSS(currentTimerSeconds)}
                </strong>{' '}
                acumulados.
              </p>
              <p className={styles.messageParagraph}>
                ¿Deseas finalizar ese timer y comenzar uno nuevo en la tarea{' '}
                <strong className={styles.taskId}>{newTaskId}</strong>?
              </p>
              <div className={styles.warningNote}>
                <span className={styles.noteIcon}>💡</span>
                <p className={styles.noteText}>
                  El tiempo del timer actual se guardará automáticamente.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <button
                onClick={onCancel}
                className={styles.cancelButton}
                disabled={isConfirming}
                type="button"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className={styles.confirmButton}
                disabled={isConfirming}
                type="button"
              >
                {isConfirming ? (
                  <>
                    <span className={styles.spinner} />
                    Cambiando...
                  </>
                ) : (
                  'Cambiar Timer'
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ConfirmTimerSwitch;
