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
 * @param mini - Whether to use mini/discrete display mode (65% scale)
 * @param pill - Whether to use pill/compact mode (32px height, matches button sizes)
 */
export function TimerDisplay({
  taskId,
  userId,
  showControls = true,
  onTogglePanel,
  compact = false,
  mini = false,
  pill = false
}: TimerDisplayProps) {
  // Timer state
  const { timerSeconds } = useTimerState(taskId);

  const {
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

  // Export runningTimerTaskId for parent components
  const hasOtherTimerRunning = runningTimerTaskId && runningTimerTaskId !== taskId;

  return (
    <div className={`${styles.timerDisplay} ${compact ? styles.compact : ''} ${mini ? styles.mini : ''} ${pill ? styles.pill : ''}`} data-running-timer-id={hasOtherTimerRunning ? runningTimerTaskId : undefined}>
      {/* Warning Badge if timer running elsewhere - HIDDEN in InputChat (moved to persistedData) */}
      {hasOtherTimerRunning && (
        <div className={styles.warningBadge} title={`Timer activo en tarea: ${runningTimerTaskId}`}>
          <span className={styles.warningIcon}>⚠️</span>
          <span className={styles.warningText}>Timer activo en otra tarea</span>
        </div>
      )}

      {/* Timer Counter - Now clickeable to open panel */}
      <TimerCounter
        hours={hours}
        minutes={minutes}
        seconds={seconds}
        isOptimistic={isOptimistic}
        syncStatus={confirmationStatus === 'pending' ? 'syncing' : confirmationStatus === 'failed' ? 'error' : 'idle'}
        className={styles.counter}
        onClick={onTogglePanel}
        disabled={hasOtherTimerRunning}
        pill={pill}
      />
    </div>
  );
}

export default TimerDisplay;
