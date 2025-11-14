/**
 * Timer Module - Timer Panel Component
 *
 * Complete timer panel with all timer functionality
 *
 * @module timer/components/organisms/TimerPanel
 */

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TimerPanelProps } from '../../types/timer.types';
import { useTimerState } from '../../hooks/useTimerState';
import { useTimerActions } from '../../hooks/useTimerActions';
import { useTimerSync } from '../../hooks/useTimerSync';
import { useTimerOptimistic } from '../../hooks/useTimerOptimistic';
import { timerPanelAnimations, slideDownAnimations } from '../../utils/timerAnimations';
import { TimerCounter } from '../atoms/TimerCounter';
import { TimerButton } from '../atoms/TimerButton';
import { TimerIntervalsList } from '../molecules/TimerIntervalsList';
import { TimeEntryForm } from '../molecules/TimeEntryForm';
import { ConfirmTimerSwitch } from './ConfirmTimerSwitch';
import styles from './TimerPanel.module.scss';

/**
 * TimerPanel Component
 *
 * Full-featured timer management panel with:
 * - Timer display and controls
 * - Intervals history
 * - Manual time entry
 * - Sync status
 * - Single-timer enforcement
 *
 * @param isOpen - Whether panel is visible
 * @param taskId - ID of the task
 * @param userId - ID of the user
 * @param onClose - Callback when panel closes
 * @param onSuccess - Callback on successful operations
 */
export function TimerPanel({
  isOpen,
  taskId,
  userId,
  onClose,
  onSuccess
}: TimerPanelProps) {
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [pendingTimerSwitch, setPendingTimerSwitch] = useState<{
    current: string;
    next: string;
  } | null>(null);

  // Timer state
  const { timerSeconds, isRunning, intervals, status } = useTimerState(taskId);

  // Timer sync
  const { isSyncing, syncError, retrySyncManually } = useTimerSync(taskId, userId);

  // Timer actions with confirmation handler
  const {
    startTimer,
    pauseTimer,
    stopTimer,
    resetTimer,
    isProcessing,
    runningTimerTaskId
  } = useTimerActions(taskId, userId, {
    onConfirmStopOtherTimer: async (currentTaskId, newTaskId) => {
      setPendingTimerSwitch({ current: currentTaskId, next: newTaskId });
      setShowSwitchDialog(true);

      return new Promise((resolve) => {
        // This will be resolved by handleConfirmSwitch or handleCancelSwitch
        const checkInterval = setInterval(() => {
          if (!showSwitchDialog) {
            clearInterval(checkInterval);
            resolve(true); // If dialog closed, assume confirmed
          }
        }, 100);
      });
    }
  });

  // Optimistic UI
  const { isOptimistic, confirmationStatus } = useTimerOptimistic(taskId);

  // Convert to time units
  const hours = Math.floor(timerSeconds / 3600);
  const minutes = Math.floor((timerSeconds % 3600) / 60);
  const seconds = timerSeconds % 60;

  // Handlers
  const handleStop = async () => {
    if (timerSeconds === 0) {
      alert('No hay tiempo para guardar');
      return;
    }

    const confirmed = window.confirm(
      '¿Deseas finalizar el timer? El tiempo se guardará en la tarea.'
    );
    if (!confirmed) return;

    await stopTimer();
    if (onSuccess) onSuccess();
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      '¿Deseas resetear el timer? Se perderá el tiempo acumulado.'
    );
    if (!confirmed) return;

    await resetTimer();
  };

  const handleConfirmSwitch = async () => {
    setShowSwitchDialog(false);
    setPendingTimerSwitch(null);
  };

  const handleCancelSwitch = () => {
    setShowSwitchDialog(false);
    setPendingTimerSwitch(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.timerPanel}
          initial={timerPanelAnimations.initial}
          animate={timerPanelAnimations.animate}
          exit={timerPanelAnimations.exit}
        >
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Timer</h2>
          {isSyncing && <span className={styles.syncIndicator} title="Sincronizando...">🔄</span>}
          <button onClick={onClose} className={styles.closeButton} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {/* Sync Error Banner */}
        {syncError && (
          <div className={styles.errorBanner}>
            <span>Error de sincronización: {syncError.message}</span>
            <button onClick={retrySyncManually} className={styles.retryButton}>
              Reintentar
            </button>
          </div>
        )}

        {/* Main Timer */}
        <div className={styles.mainTimer}>
          <TimerCounter
            hours={hours}
            minutes={minutes}
            seconds={seconds}
            isOptimistic={isOptimistic}
            syncStatus={confirmationStatus === 'pending' ? 'syncing' : confirmationStatus === 'failed' ? 'error' : 'idle'}
          />
          <div className={styles.status}>
            Estado: <span className={styles.statusValue}>{status}</span>
          </div>
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <TimerButton
            variant={isRunning ? 'pause' : 'start'}
            onClick={isRunning ? pauseTimer : startTimer}
            disabled={isProcessing}
            loading={isProcessing}
            size="large"
          />
          <TimerButton
            variant="stop"
            onClick={handleStop}
            disabled={isProcessing || timerSeconds === 0}
            size="large"
          />
          <TimerButton
            variant="reset"
            onClick={handleReset}
            disabled={isProcessing}
            size="medium"
          />
        </div>

        {/* Intervals List */}
        {intervals.length > 0 && (
          <div className={styles.intervalsSection}>
            <h3 className={styles.sectionTitle}>Intervalos</h3>
            <TimerIntervalsList
              intervals={intervals}
              showTotal={true}
              maxVisible={5}
            />
          </div>
        )}

        {/* Manual Time Entry Toggle */}
        <div className={styles.manualEntrySection}>
          <button
            onClick={() => setShowManualEntry(!showManualEntry)}
            className={styles.toggleButton}
          >
            {showManualEntry ? '▼ Ocultar Entrada Manual' : '▶ Añadir Tiempo Manual'}
          </button>

          <AnimatePresence>
            {showManualEntry && (
              <motion.div
                className={styles.formContainer}
                initial={slideDownAnimations.initial}
                animate={slideDownAnimations.animate}
                exit={slideDownAnimations.exit}
              >
                <TimeEntryForm
                  taskId={taskId}
                  userId={userId}
                  onSuccess={() => {
                    setShowManualEntry(false);
                    if (onSuccess) onSuccess();
                  }}
                  onCancel={() => setShowManualEntry(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      )}

      {/* Confirmation Dialog */}
      {pendingTimerSwitch && (
        <ConfirmTimerSwitch
          isOpen={showSwitchDialog}
          currentTaskId={pendingTimerSwitch.current}
          newTaskId={pendingTimerSwitch.next}
          currentTimerSeconds={timerSeconds}
          onConfirm={handleConfirmSwitch}
          onCancel={handleCancelSwitch}
        />
      )}
    </AnimatePresence>
  );
}

export default TimerPanel;
