/**
 * Timer Module - Timer Display Component
 *
 * Main timer display with controls and status indicators
 *
 * @module timer/components/molecules/TimerDisplay
 */

'use client';

import React, { useState } from 'react';
import type { TimerDisplayProps, TimerSwitchAction } from '../../types/timer.types';
import { useTimerState } from '../../hooks/useTimerState';
import { useTimerActions } from '../../hooks/useTimerActions';
import { useTimerOptimistic } from '../../hooks/useTimerOptimistic';
import { useTimerStateStore } from '../../stores/timerStateStore';
import { TimerCounter } from '../atoms/TimerCounter';
import { ConfirmTimerSwitch } from '../organisms/ConfirmTimerSwitch';
import { useDataStore } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';
import { createTimeLog } from '../../services/timeLogFirebase';
import { firebaseService } from '../../../services/firebaseService';
import { useSonnerToast } from '@/modules/sonner/hooks/useSonnerToast';
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
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [pendingTimerSwitch, setPendingTimerSwitch] = useState<{
    current: string;
    next: string;
    resolve: (value: import('../../types/timer.types').TimerSwitchConfirmation) => void;
  } | null>(null);

  // Toast notifications
  const { success: showSuccess, error: showError, info: showInfo } = useSonnerToast();

  // Get tasks from store to display task names
  const tasks = useDataStore(useShallow((state) => state.tasks));

  // Timer state
  const { timerSeconds } = useTimerState(taskId);

  const {
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

  // Optimistic UI state
  const { isOptimistic, confirmationStatus } = useTimerOptimistic(taskId);

  // Handlers for timer switch dialog
  const handleConfirmSwitch = async (action: TimerSwitchAction) => {
    if (!pendingTimerSwitch) return;

    try {
      if (action === 'send') {
        showInfo('Guardando timer anterior...');
      } else {
        showInfo('Descartando timer anterior...');
      }

      // Resolve the promise to allow the new timer to start
      // The actual saving/discarding happens in useTimerActions
      pendingTimerSwitch.resolve({ confirmed: true, action });
    } catch (error) {
      console.error('[TimerDisplay] Error handling timer switch:', error);
      showError('Error al cambiar el timer');
      // Still resolve to confirmed with send action as fallback
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

  // Convert seconds to time units
  const hours = Math.floor(timerSeconds / 3600);
  const minutes = Math.floor((timerSeconds % 3600) / 60);
  const seconds = timerSeconds % 60;

  // Export runningTimerTaskId for parent components
  const hasOtherTimerRunning = runningTimerTaskId && runningTimerTaskId !== taskId;

  return (
    <>
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

      {/* Confirmation Dialog */}
      {pendingTimerSwitch && (
        <ConfirmTimerSwitch
          isOpen={showSwitchDialog}
          currentTaskId={pendingTimerSwitch.current}
          currentTaskName={tasks.find(t => t.id === pendingTimerSwitch.current)?.name}
          newTaskId={pendingTimerSwitch.next}
          newTaskName={tasks.find(t => t.id === pendingTimerSwitch.next)?.name}
          currentTimerSeconds={useTimerStateStore.getState().getTimerForTask(pendingTimerSwitch.current)?.accumulatedSeconds || 0}
          onConfirm={handleConfirmSwitch}
          onCancel={handleCancelSwitch}
        />
      )}
    </>
  );
}

export default TimerDisplay;
