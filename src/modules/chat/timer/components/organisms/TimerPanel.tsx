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
import { useTimerStateStore } from '../../stores/timerStateStore';
import { timerPanelAnimations, slideDownAnimations } from '../../utils/timerAnimations';
import { TimerCounter } from '../atoms/TimerCounter';
import { TimerButton } from '../atoms/TimerButton';
import { TimerIntervalsList } from '../molecules/TimerIntervalsList';
import { TimeEntryForm } from '../molecules/TimeEntryForm';
import { ConfirmTimerSwitch } from './ConfirmTimerSwitch';
import { Send } from '@/components/animate-ui/icons/send';
import { Timer } from '@/components/animate-ui/icons/timer';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
import { firebaseService } from '../../../services/firebaseService';
import { createTimeLog } from '../../services/timeLogFirebase';
import { useDataStore } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';
import type { TimerSwitchAction } from '../../types/timer.types';
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
  userName,
  onClose,
  onSuccess
}: TimerPanelProps) {
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [pendingTimerSwitch, setPendingTimerSwitch] = useState<{
    current: string;
    next: string;
    resolve: (value: import('../../types/timer.types').TimerSwitchConfirmation) => void;
  } | null>(null);
  const [isSendingLog, setIsSendingLog] = useState(false);

  // Toast notifications
  const { success: showSuccess, error: showError, info: showInfo } = useSonnerToast();

  // Get tasks from store to display task names
  const tasks = useDataStore(useShallow((state) => state.tasks));

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
      return new Promise<import('../../types/timer.types').TimerSwitchConfirmation>((resolve) => {
        setPendingTimerSwitch({
          current: currentTaskId,
          next: newTaskId,
          resolve
        });
        setShowSwitchDialog(true);
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
  const handleSendTimelog = async () => {
    if (timerSeconds === 0) {
      showInfo('No hay tiempo para enviar');
      return;
    }

    if (isRunning) {
      showInfo('Debes pausar o detener el timer antes de enviar el timelog');
      return;
    }

    try {
      setIsSendingLog(true);

      // Convert seconds to hours and minutes
      const hoursDecimal = timerSeconds / 3600;
      const durationMinutes = Math.round(timerSeconds / 60);
      
      // Format date string
      const dateString = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      // Create time log (updates task.timeTracking in Firebase)
      await createTimeLog(taskId, {
        userId,
        userName,
        durationMinutes,
        description: undefined,
        dateString,
        source: 'timer',
      });

      // Update local store immediately for UI reactivity
      const { updateTask, tasks } = useDataStore.getState();
      const currentTask = tasks.find(t => t.id === taskId);
      if (currentTask) {
        const currentTimeTracking = currentTask.timeTracking || {
          totalHours: currentTask.totalHours || 0,
          totalMinutes: 0,
          lastLogDate: null,
          memberHours: currentTask.memberHours || {},
        };
        
        // Calculate new totals
        const currentTotalMinutes = Math.round(currentTimeTracking.totalHours * 60) + (currentTimeTracking.totalMinutes || 0);
        const newTotalMinutes = currentTotalMinutes + durationMinutes;
        const newTotalHours = Math.floor(newTotalMinutes / 60);
        const newRemainingMinutes = newTotalMinutes % 60;
        
        // Update member hours
        const currentMemberHours = currentTimeTracking.memberHours?.[userId] || 0;
        const newMemberHours = currentMemberHours + hoursDecimal;
        const updatedMemberHours = {
          ...currentTimeTracking.memberHours,
          [userId]: newMemberHours,
        };

        updateTask(taskId, {
          timeTracking: {
            totalHours: newTotalHours,
            totalMinutes: newRemainingMinutes,
            lastLogDate: new Date().toISOString(),
            memberHours: updatedMemberHours,
          },
          totalHours: newTotalHours + (newRemainingMinutes / 60),
          memberHours: updatedMemberHours,
        });
      }

      // Send timelog message to chat (visual message)
      await firebaseService.sendTimeLogMessage(
        taskId,
        userId,
        userName,
        hoursDecimal,
        dateString,
        undefined // No comment
      );

      // Reset timer after sending
      await resetTimer();

      showSuccess('Timelog enviado correctamente');
      if (onSuccess) onSuccess();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[TimerPanel] Error sending timelog:', error);
      showError('Error al enviar el timelog');
    } finally {
      setIsSendingLog(false);
    }
  };

  const handleStop = async () => {
    if (timerSeconds === 0) {
      showInfo('No hay tiempo para guardar');
      return;
    }

    const confirmed = window.confirm(
      '¿Deseas finalizar el timer? El tiempo se guardará en la tarea y se enviará un mensaje al chat.'
    );
    if (!confirmed) return;

    try {
      // Stop timer (this updates task.totalHours)
      await stopTimer();

      // Send timelog message to chat
      const hours = timerSeconds / 3600;
      await firebaseService.sendTimeLogMessage(
        taskId,
        userId,
        userName,
        hours,
        new Date().toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        undefined
      );

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('[TimerPanel] Error stopping timer:', error);
      showError('Error al detener el timer');
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      '¿Deseas resetear el timer? Se perderá el tiempo acumulado.'
    );
    if (!confirmed) return;

    await resetTimer();
  };

  const handleConfirmSwitch = async (action: TimerSwitchAction) => {
    if (!pendingTimerSwitch) return;

    try {
      if (action === 'send') {
        showInfo('Guardando timer...');
      } else {
        showInfo('Descartando timer...');
      }

      // Resolve the promise to allow the new timer to start
      // useTimerActions will handle saving or discarding based on the action
      pendingTimerSwitch.resolve({ confirmed: true, action });
    } catch (error) {
      console.error('[TimerPanel] Error handling timer switch:', error);
      showError('Error al cambiar el timer');
      // Still resolve to confirmed to allow the switch with send action
      pendingTimerSwitch.resolve({ confirmed: true, action: 'send' });
    } finally {
      setShowSwitchDialog(false);
      setPendingTimerSwitch(null);
    }
  };

  const handleCancelSwitch = () => {
    if (!pendingTimerSwitch) return;

    // Resolve with confirmed: false to cancel the switch
    pendingTimerSwitch.resolve({ confirmed: false });
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
          <div className={styles.titleContainer}>
            <Timer animateOnHover size={24} />
            <h2 className={styles.title}>Timer</h2>
          </div>
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

        {/* Registro en Tiempo Real Section */}
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionHeading}>Registro en Tiempo Real</h3>
          <p className={styles.sectionDescription}>
            Inicia el cronómetro cuando comiences la tarea y detén al finalizar para un registro preciso. No olvides enviar tu entrada para que sea registrada.
          </p>
        </div>

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
          {/* Play/Pause Toggle Button */}
          <TimerButton
            variant={isRunning ? 'pause' : 'start'}
            onClick={isRunning ? pauseTimer : startTimer}
            disabled={isProcessing}
            loading={isProcessing}
            size="large"
          />
          
          {/* Reset Button */}
          <TimerButton
            variant="reset"
            onClick={handleReset}
            disabled={isProcessing}
            size="medium"
          />
        </div>

        {/* Send Timelog Button - Only show when paused/stopped with accumulated time */}
        {!isRunning && timerSeconds > 0 && (
          <div className={styles.sendTimelogSection}>
            <button
              onClick={handleSendTimelog}
              disabled={isSendingLog || isProcessing}
              className={styles.sendTimelogButton}
              title="Enviar timelog al chat"
              aria-label="Enviar timelog al chat"
            >
              {isSendingLog ? (
                <span>Enviando...</span>
              ) : (
                <>
                  <Send animateOnHover size={20} />
                  <span>Enviar al Chat</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Work Sessions Section */}
        {intervals.length > 0 && (
          <div className={styles.intervalsSection}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionHeading}>Sesiones de Trabajo</h3>
              <p className={styles.sectionDescription}>
                Historial de todas las sesiones cuando pausas y reanudas el cronómetro. El tiempo total se calcula automáticamente.
              </p>
            </div>
            <TimerIntervalsList
              intervals={intervals}
              showTotal={true}
              maxVisible={5}
            />
          </div>
        )}

        {/* Manual Time Entry Section */}
        <div className={styles.manualEntrySection}>
          {/* Section Header */}
          {!showManualEntry && (
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionHeading}>Entrada Manual</h3>
              <p className={styles.sectionDescription}>
                Ingresa el tiempo que dedicaste a esta tarea si ya la completaste o prefieres registrar manualmente.
              </p>
            </div>
          )}

          {/* Toggle Button */}
          <button
            onClick={() => setShowManualEntry(!showManualEntry)}
            className={styles.toggleButton}
          >
            {showManualEntry ? '− Ocultar entrada manual' : '+ Agregar tiempo manual'}
          </button>

          {/* Form Container */}
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
                  userName={userName}
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
      {pendingTimerSwitch && (() => {
        const currentTimer = useTimerStateStore.getState().getTimerForTask(pendingTimerSwitch.current);
        const currentTimerSeconds = currentTimer?.accumulatedSeconds || 0;
        return (
          <ConfirmTimerSwitch
            isOpen={showSwitchDialog}
            currentTaskId={pendingTimerSwitch.current}
            currentTaskName={tasks.find(t => t.id === pendingTimerSwitch.current)?.name}
            newTaskId={pendingTimerSwitch.next}
            newTaskName={tasks.find(t => t.id === pendingTimerSwitch.next)?.name}
            currentTimerSeconds={currentTimerSeconds}
            onConfirm={handleConfirmSwitch}
            onCancel={handleCancelSwitch}
          />
        );
      })()}
    </AnimatePresence>
  );
}

export default TimerPanel;
