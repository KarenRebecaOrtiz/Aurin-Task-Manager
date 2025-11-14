/**
 * Timer Module - Timer Display Component
 *
 * Main timer display with controls and status indicators
 *
 * @module timer/components/molecules/TimerDisplay
 */

'use client';

import React from 'react';
import type { TimerDisplayProps } from '../../types/timer.types';
import { useTimerState } from '../../hooks/useTimerState';
import { useTimerActions } from '../../hooks/useTimerActions';
import { useTimerOptimistic } from '../../hooks/useTimerOptimistic';
import { TimerCounter } from '../atoms/TimerCounter';
import { TimerButton } from '../atoms/TimerButton';
import styles from './TimerDisplay.module.scss';

/**
 * TimerDisplay Component
 *
 * Displays timer with controls (Start/Pause/Stop buttons)
 * - Shows current time with TimerCounter
 * - Displays sync status and optimistic updates
 * - Warns if timer running on another task
 * - Integrates all timer hooks
 *
 * @param taskId - ID of the task
 * @param userId - ID of the user
 * @param showControls - Whether to show control buttons
 * @param onTogglePanel - Callback to open full timer panel
 * @param compact - Whether to use compact display mode
 */
export function TimerDisplay({
  taskId,
  userId,
  showControls = true,
  onTogglePanel,
  compact = false
}: TimerDisplayProps) {
  // Timer state
  const { timerSeconds, isRunning, status } = useTimerState(taskId);

  // Timer actions with single-timer enforcement
  const {
    startTimer,
    pauseTimer,
    stopTimer,
    isProcessing,
    runningTimerTaskId
  } = useTimerActions(taskId, userId, {
    onConfirmStopOtherTimer: async (currentTaskId, newTaskId) => {
      // Show confirmation dialog
      const confirmed = window.confirm(
        `Ya tienes un timer activo en la tarea "${currentTaskId}".\n\n` +
        `¿Deseas detenerlo y comenzar un nuevo timer en la tarea "${newTaskId}"?\n\n` +
        `El tiempo acumulado se guardará automáticamente.`
      );
      return confirmed;
    }
  });

  // Optimistic UI state
  const { isOptimistic, confirmationStatus } = useTimerOptimistic(taskId);

  // Convert seconds to time units
  const hours = Math.floor(timerSeconds / 3600);
  const minutes = Math.floor((timerSeconds % 3600) / 60);
  const seconds = timerSeconds % 60;

  // Handle toggle (start/pause)
  const handleToggle = async () => {
    try {
      if (isRunning) {
        await pauseTimer();
      } else {
        await startTimer();
      }
    } catch (error) {
      console.error('Error toggling timer:', error);
    }
  };

  // Handle stop
  const handleStop = async () => {
    if (timerSeconds === 0) {
      alert('No hay tiempo para guardar');
      return;
    }

    const confirmed = window.confirm(
      '¿Deseas finalizar el timer?\n\n' +
      'El tiempo acumulado se guardará en la tarea.'
    );

    if (!confirmed) return;

    try {
      await stopTimer();
    } catch (error) {
      console.error('Error stopping timer:', error);
      alert('Error al finalizar el timer. Por favor intenta de nuevo.');
    }
  };

  return (
    <div className={`${styles.timerDisplay} ${compact ? styles.compact : ''}`}>
      {/* Warning Badge if timer running elsewhere */}
      {runningTimerTaskId && runningTimerTaskId !== taskId && (
        <div className={styles.warningBadge} title={`Timer activo en tarea: ${runningTimerTaskId}`}>
          <span className={styles.warningIcon}>⚠️</span>
          <span className={styles.warningText}>Timer activo en otra tarea</span>
        </div>
      )}

      {/* Timer Counter */}
      <TimerCounter
        hours={hours}
        minutes={minutes}
        seconds={seconds}
        isOptimistic={isOptimistic}
        syncStatus={confirmationStatus === 'pending' ? 'syncing' : confirmationStatus === 'failed' ? 'error' : 'idle'}
        className={styles.counter}
      />

      {/* Status Text */}
      <div className={styles.statusText}>
        Estado: <span className={styles.statusValue}>{status}</span>
      </div>

      {/* Control Buttons */}
      {showControls && (
        <div className={styles.controls}>
          <TimerButton
            variant={isRunning ? 'pause' : 'start'}
            onClick={handleToggle}
            disabled={isProcessing}
            loading={isProcessing}
            size="medium"
          />

          <TimerButton
            variant="stop"
            onClick={handleStop}
            disabled={isProcessing || timerSeconds === 0}
            size="medium"
          />

          {onTogglePanel && (
            <button
              onClick={onTogglePanel}
              className={styles.moreButton}
              disabled={isProcessing}
              title="Más opciones"
            >
              ⚙️
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TimerDisplay;
