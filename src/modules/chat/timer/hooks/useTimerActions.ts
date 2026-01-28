/**
 * Timer Module - Timer Actions Hook
 *
 * Hook providing timer control actions (start, pause, stop, reset).
 * Handles local state updates and Firebase synchronization.
 *
 * @module timer/hooks/useTimerActions
 */

import { useCallback, useState } from 'react';
import { useTimerStateStore } from '../stores/timerStateStore';
import { useTimerSyncStore } from '../stores/timerSyncStore';
import {
  createTimer,
  getTimer,
  getUserTimerForTask,
  startTimerInFirestore,
  pauseTimerInFirestore,
  batchStopTimer,
  deleteTimer,
} from '../services/timerFirebase';
import { createTimeLog } from '../services/timeLogFirebase';
import { createInterval, calculateElapsedSeconds } from '../services/timerCalculations';
import { retryWithBackoff } from '../services/timerRetry';
import { TimerStatus } from '../types/timer.types';
import type {
  UseTimerActionsReturn,
  LocalTimerState,
  ConfirmStopOtherTimerCallback,
} from '../types/timer.types';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/timerConstants';
import { useDataStore } from '@/stores/dataStore';
import { firebaseService } from '../../services/firebaseService';

/**
 * Options for useTimerActions hook
 */
export interface UseTimerActionsOptions {
  /**
   * Callback to confirm stopping another running timer
   * If not provided, will automatically stop other timers
   */
  onConfirmStopOtherTimer?: ConfirmStopOtherTimerCallback;
  /**
   * User name for creating time log messages when switching timers
   * Required when onConfirmStopOtherTimer is provided
   */
  userName?: string;
}

/**
 * Hook providing timer control actions
 * Handles optimistic updates and Firebase synchronization
 * Enforces single active timer per user
 *
 * @param taskId - Task ID
 * @param userId - User ID
 * @param options - Hook options
 * @returns Timer action functions
 *
 * @example
 * ```typescript
 * function TimerControls({ taskId, userId }: Props) {
 *   const {
 *     startTimer,
 *     pauseTimer,
 *     stopTimer,
 *     resetTimer,
 *     isProcessing,
 *     runningTimerTaskId
 *   } = useTimerActions(taskId, userId, {
 *     onConfirmStopOtherTimer: async (currentTaskId, newTaskId) => {
 *       return window.confirm(
 *         `Ya tienes un timer activo en la tarea ${currentTaskId}.
 *          ¿Deseas detenerlo y comenzar uno nuevo en ${newTaskId}?`
 *       );
 *     }
 *   });
 *
 *   return (
 *     <div>
 *       {runningTimerTaskId && runningTimerTaskId !== taskId && (
 *         <Badge>Timer activo en otra tarea</Badge>
 *       )}
 *       <button onClick={startTimer} disabled={isProcessing}>
 *         Start
 *       </button>
 *       <button onClick={pauseTimer} disabled={isProcessing}>
 *         Pause
 *       </button>
 *       <button onClick={stopTimer} disabled={isProcessing}>
 *         Stop
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTimerActions(
  taskId: string,
  userId: string,
  options: UseTimerActionsOptions = {}
): UseTimerActionsReturn {
  const { onConfirmStopOtherTimer, userName } = options;
  // State stores
  const setTimerState = useTimerStateStore((state) => state.setTimerState);
  const getTimerForTask = useTimerStateStore((state) => state.getTimerForTask);
  const updateTimerSeconds = useTimerStateStore((state) => state.updateTimerSeconds);
  const addInterval = useTimerStateStore((state) => state.addInterval);
  const clearTimer = useTimerStateStore((state) => state.clearTimer);

  // Sync store
  const setSyncStatus = useTimerSyncStore((state) => state.setSyncStatus);
  const addPendingWrite = useTimerSyncStore((state) => state.addPendingWrite);
  const removePendingWrite = useTimerSyncStore((state) => state.removePendingWrite);
  const setError = useTimerSyncStore((state) => state.setError);
  const clearError = useTimerSyncStore((state) => state.clearError);

  // Local processing state
  const [isProcessing, setIsProcessing] = useState(false);

  // Get all active timers to check for running timers
  const getAllActiveTimers = useTimerStateStore((state) => state.getAllActiveTimers);

  /**
   * Find if user has any running timer
   */
  const findRunningTimer = useCallback(() => {
    const allTimers = getAllActiveTimers();
    return allTimers.find(
      (timer) => timer.userId === userId && timer.status === TimerStatus.RUNNING
    );
  }, [getAllActiveTimers, userId]);

  /**
   * Get currently running timer task ID
   */
  const runningTimerTaskId = findRunningTimer()?.taskId ?? null;

  /**
   * Stop another running timer (used when starting a new one)
   * @param otherTaskId - ID of the task with the timer to stop
   * @param shouldSave - Whether to save the time (true for 'send', false for 'discard')
   */
  const stopOtherTimer = useCallback(
    async (otherTaskId: string, shouldSave: boolean = true) => {
      const otherTimer = getTimerForTask(otherTaskId);
      if (!otherTimer || otherTimer.status !== TimerStatus.RUNNING) {
        return;
      }

      console.log(`[useTimerActions] Stopping other timer on task: ${otherTaskId}, shouldSave: ${shouldSave}`);

      // If discarding, just clear the timer without saving
      if (!shouldSave) {
        clearTimer(otherTaskId);
        removePendingWrite(otherTimer.timerId);
        console.log(`[useTimerActions] Discarded timer on task: ${otherTaskId}`);
        return;
      }

      // Verify timer exists in Firestore before attempting to stop
      // This prevents "No document to update" errors from ghost timers
      const firestoreTimer = await getTimer(otherTaskId, userId);
      if (!firestoreTimer) {
        console.warn(`[useTimerActions] Ghost timer detected for task ${otherTaskId}, clearing local state`);
        clearTimer(otherTaskId);
        removePendingWrite(otherTimer.timerId);
        return;
      }

      // Calculate final interval for saving
      let finalInterval = createInterval(new Date(), new Date());
      if (otherTimer.startedAt) {
        // Ensure startedAt is a Date object (could be string from localStorage or Timestamp)
        const startDate = otherTimer.startedAt instanceof Date
          ? otherTimer.startedAt
          : new Date(otherTimer.startedAt);
        finalInterval = createInterval(startDate, new Date());
        console.log(`[useTimerActions] Calculated interval from ${startDate} to now, duration: ${finalInterval.duration}s`);
      }

      const finalSeconds = otherTimer.accumulatedSeconds + finalInterval.duration;
      console.log(`[useTimerActions] Final seconds: ${finalSeconds} (accumulated: ${otherTimer.accumulatedSeconds}, interval: ${finalInterval.duration})`);

      if (finalSeconds > 0) {
        // Stop the other timer and save to Firebase
        console.log(`[useTimerActions] Calling batchStopTimer for task ${otherTaskId}...`);
        await batchStopTimer(otherTaskId, userId, finalInterval);
        console.log(`[useTimerActions] batchStopTimer completed for task ${otherTaskId}`);

        // Calculate hours and minutes for time log
        const hours = finalSeconds / 3600;
        const durationMinutes = Math.round(finalSeconds / 60);

        // Format date string
        const dateString = new Date().toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });

        // Create time log entry if userName is available
        if (userName) {
          console.log(`[useTimerActions] Creating time log for task ${otherTaskId}...`);
          await createTimeLog(otherTaskId, {
            userId,
            userName,
            durationMinutes,
            description: undefined,
            dateString,
            source: 'timer',
          });
          console.log(`[useTimerActions] Time log created for task ${otherTaskId}`);

          // Send message to chat
          console.log(`[useTimerActions] Sending time log message to chat for task ${otherTaskId}...`);
          await firebaseService.sendTimeLogMessage(
            otherTaskId,
            userId,
            userName,
            hours,
            dateString,
            undefined
          );
          console.log(`[useTimerActions] Time log message sent for task ${otherTaskId}`);
        } else {
          console.warn(`[useTimerActions] userName not provided, skipping time log and chat message for task ${otherTaskId}`);
        }

        // Update local dataStore for the other task
        const { updateTask, tasks } = useDataStore.getState();
        const currentTask = tasks.find(t => t.id === otherTaskId);
        console.log(`[useTimerActions] Updating local dataStore for task ${otherTaskId}, found: ${!!currentTask}`);
        if (currentTask) {
          const currentTimeTracking = currentTask.timeTracking || {
            totalHours: currentTask.totalHours || 0,
            totalMinutes: 0,
            lastLogDate: null,
            memberHours: currentTask.memberHours || {},
          };

          const minutesToAdd = Math.round(finalSeconds / 60);
          const currentTotalMinutes = Math.round(currentTimeTracking.totalHours * 60) + (currentTimeTracking.totalMinutes || 0);
          const newTotalMinutes = currentTotalMinutes + minutesToAdd;
          const newTotalHours = Math.floor(newTotalMinutes / 60);
          const newRemainingMinutes = newTotalMinutes % 60;

          const hoursToAdd = finalSeconds / 3600;
          const currentMemberHours = currentTimeTracking.memberHours?.[userId] || 0;
          const newMemberHours = currentMemberHours + hoursToAdd;

          updateTask(otherTaskId, {
            timeTracking: {
              totalHours: newTotalHours,
              totalMinutes: newRemainingMinutes,
              lastLogDate: new Date().toISOString(),
              memberHours: {
                ...currentTimeTracking.memberHours,
                [userId]: newMemberHours,
              },
            },
            totalHours: newTotalHours + (newRemainingMinutes / 60),
            memberHours: {
              ...currentTimeTracking.memberHours,
              [userId]: newMemberHours,
            },
          });
          console.log(`[useTimerActions] Local dataStore updated for task ${otherTaskId}`);
        }
      } else {
        console.log(`[useTimerActions] Skipping save - finalSeconds is ${finalSeconds}`);
      }

      // Clear from local state
      clearTimer(otherTaskId);
      removePendingWrite(otherTimer.timerId);
    },
    [getTimerForTask, clearTimer, removePendingWrite, userId, userName]
  );

  /**
   * Start the timer
   * Creates timer if doesn't exist, starts it in Firebase
   * Enforces single active timer per user
   * @returns true if timer was started, false if cancelled by user
   */
  const startTimer = useCallback(async (): Promise<boolean> => {
    if (isProcessing) return false;

    try {
      setIsProcessing(true);
      setSyncStatus('syncing');

      const existingTimer = getTimerForTask(taskId);

      // Check if already running
      if (existingTimer?.status === TimerStatus.RUNNING) {
        throw new Error(ERROR_MESSAGES.TIMER_ALREADY_RUNNING);
      }

      // Check if user has another timer running
      const runningTimer = findRunningTimer();
      if (runningTimer && runningTimer.taskId !== taskId) {
        console.log(`[useTimerActions] Found running timer on task ${runningTimer.taskId}, current task: ${taskId}`);
        console.log(`[useTimerActions] onConfirmStopOtherTimer callback provided: ${!!onConfirmStopOtherTimer}`);

        let shouldSave = true; // Default: save the timer

        // Ask for confirmation if callback is provided
        if (onConfirmStopOtherTimer) {
          console.log('[useTimerActions] Calling onConfirmStopOtherTimer...');
          const result = await onConfirmStopOtherTimer(runningTimer.taskId, taskId);

          if (!result.confirmed) {
            // User cancelled - return false without showing toast
            setSyncStatus('idle');
            setIsProcessing(false);
            return false;
          }

          // Determine whether to save based on action
          shouldSave = result.action === 'send';
        }

        // Stop the other timer (save or discard based on user choice)
        await stopOtherTimer(runningTimer.taskId, shouldSave);
      }

      let timerId: string;

      // Create timer if doesn't exist or get existing
      if (!existingTimer) {
        // Check Firebase for existing timer
        const firebaseTimer = await getUserTimerForTask(userId, taskId);

        if (firebaseTimer) {
          timerId = firebaseTimer.id;
        } else {
          // Create new timer
          timerId = await createTimer(userId, taskId);
        }
      } else {
        timerId = existingTimer.timerId;
      }

      // Optimistic update
      const optimisticState: LocalTimerState = {
        timerId,
        taskId,
        userId,
        status: TimerStatus.RUNNING,
        startedAt: new Date(),
        pausedAt: null,
        accumulatedSeconds: existingTimer?.accumulatedSeconds ?? 0,
        intervals: existingTimer?.intervals ?? [],
        lastSyncTime: performance.now(),
      };

      setTimerState(taskId, optimisticState);
      addPendingWrite(timerId);

      // Sync to Firebase with retry
      await retryWithBackoff(
        () => startTimerInFirestore(taskId, userId),
        {
          maxAttempts: 3,
          onRetry: (attempt, error) => {
            console.warn(`[useTimerActions] Start retry ${attempt}:`, error.message);
          },
        }
      );

      removePendingWrite(timerId);
      clearError(timerId);
      setSyncStatus('idle');

      console.log(SUCCESS_MESSAGES.TIMER_STARTED);
      return true;
    } catch (error) {
      const err = error as Error;
      console.error('[useTimerActions] Start failed:', err);

      const existingTimer = getTimerForTask(taskId);
      if (existingTimer) {
        setError(existingTimer.timerId, err);
      }

      setSyncStatus('error');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [
    taskId,
    userId,
    isProcessing,
    getTimerForTask,
    setTimerState,
    setSyncStatus,
    addPendingWrite,
    removePendingWrite,
    setError,
    clearError,
    findRunningTimer,
    onConfirmStopOtherTimer,
    stopOtherTimer,
  ]);

  /**
   * Pause the timer
   * Calculates interval and syncs to Firebase
   * Validates timer exists in Firestore before updating
   */
  const pauseTimer = useCallback(async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      setSyncStatus('syncing');

      const existingTimer = getTimerForTask(taskId);

      if (!existingTimer) {
        throw new Error(ERROR_MESSAGES.NO_ACTIVE_TIMER);
      }

      if (existingTimer.status !== TimerStatus.RUNNING) {
        throw new Error(ERROR_MESSAGES.TIMER_NOT_RUNNING);
      }

      if (!existingTimer.startedAt) {
        throw new Error('Timer has no start time');
      }

      // Verify timer exists in Firestore before attempting to pause
      // This prevents "No document to update" errors from ghost timers
      const firestoreTimer = await getTimer(taskId, userId);
      if (!firestoreTimer) {
        console.warn(`[useTimerActions] Ghost timer detected for task ${taskId}, clearing local state`);
        clearTimer(taskId);
        setSyncStatus('idle');
        setIsProcessing(false);
        return;
      }

      const now = new Date();
      const interval = createInterval(existingTimer.startedAt, now);

      // Optimistic update
      const newAccumulatedSeconds = existingTimer.accumulatedSeconds + interval.duration;

      const optimisticState: LocalTimerState = {
        ...existingTimer,
        status: TimerStatus.PAUSED,
        pausedAt: now,
        accumulatedSeconds: newAccumulatedSeconds,
        intervals: [...existingTimer.intervals, interval],
        lastSyncTime: performance.now(),
      };

      setTimerState(taskId, optimisticState);
      addPendingWrite(existingTimer.timerId);

      // Sync to Firebase with retry
      await retryWithBackoff(
        () => pauseTimerInFirestore(taskId, userId, interval),
        {
          maxAttempts: 3,
          onRetry: (attempt, error) => {
            console.warn(`[useTimerActions] Pause retry ${attempt}:`, error.message);
          },
        }
      );

      removePendingWrite(existingTimer.timerId);
      clearError(existingTimer.timerId);
      setSyncStatus('idle');

      console.log(SUCCESS_MESSAGES.TIMER_PAUSED);
    } catch (error) {
      const err = error as Error;
      console.error('[useTimerActions] Pause failed:', err);

      const existingTimer = getTimerForTask(taskId);
      if (existingTimer) {
        setError(existingTimer.timerId, err);
      }

      setSyncStatus('error');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [
    taskId,
    userId,
    isProcessing,
    getTimerForTask,
    setTimerState,
    setSyncStatus,
    addPendingWrite,
    removePendingWrite,
    setError,
    clearError,
  ]);

  /**
   * Stop the timer
   * Calculates final interval, updates task aggregates, clears local state
   * Validates timer exists in Firestore before updating
   */
  const stopTimer = useCallback(async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      setSyncStatus('syncing');

      const existingTimer = getTimerForTask(taskId);

      if (!existingTimer) {
        throw new Error(ERROR_MESSAGES.NO_ACTIVE_TIMER);
      }

      // Verify timer exists in Firestore before attempting to stop
      // This prevents "No document to update" errors from ghost timers
      const firestoreTimer = await getTimer(taskId, userId);
      if (!firestoreTimer) {
        console.warn(`[useTimerActions] Ghost timer detected for task ${taskId}, clearing local state`);
        clearTimer(taskId);
        setSyncStatus('idle');
        setIsProcessing(false);
        return;
      }

      // Calculate final interval if running
      let finalInterval = createInterval(new Date(), new Date()); // Zero interval

      if (existingTimer.status === TimerStatus.RUNNING && existingTimer.startedAt) {
        const now = new Date();
        finalInterval = createInterval(existingTimer.startedAt, now);
      }

      const finalSeconds = existingTimer.accumulatedSeconds + finalInterval.duration;

      if (finalSeconds === 0) {
        throw new Error(ERROR_MESSAGES.TIME_CANNOT_BE_ZERO);
      }

      addPendingWrite(existingTimer.timerId);

      // Use batch operation for atomic update (timer + task aggregates)
      await retryWithBackoff(
        () => batchStopTimer(taskId, userId, finalInterval),
        {
          maxAttempts: 3,
          onRetry: (attempt, error) => {
            console.warn(`[useTimerActions] Stop retry ${attempt}:`, error.message);
          },
        }
      );

      // Update local dataStore so ChatHeader shows updated time immediately
      const { updateTask, tasks } = useDataStore.getState();
      const currentTask = tasks.find(t => t.id === taskId);
      if (currentTask) {
        const currentTimeTracking = currentTask.timeTracking || {
          totalHours: currentTask.totalHours || 0,
          totalMinutes: 0,
          lastLogDate: null,
          memberHours: currentTask.memberHours || {},
        };
        
        // Calculate new totals (finalSeconds from timer)
        const minutesToAdd = Math.round(finalSeconds / 60);
        const currentTotalMinutes = Math.round(currentTimeTracking.totalHours * 60) + (currentTimeTracking.totalMinutes || 0);
        const newTotalMinutes = currentTotalMinutes + minutesToAdd;
        const newTotalHours = Math.floor(newTotalMinutes / 60);
        const newRemainingMinutes = newTotalMinutes % 60;
        
        // Update member hours
        const hoursToAdd = finalSeconds / 3600;
        const currentMemberHours = currentTimeTracking.memberHours?.[userId] || 0;
        const newMemberHours = currentMemberHours + hoursToAdd;
        
        updateTask(taskId, {
          timeTracking: {
            totalHours: newTotalHours,
            totalMinutes: newRemainingMinutes,
            lastLogDate: new Date().toISOString(),
            memberHours: {
              ...currentTimeTracking.memberHours,
              [userId]: newMemberHours,
            },
          },
          totalHours: newTotalHours + (newRemainingMinutes / 60),
          memberHours: {
            ...currentTimeTracking.memberHours,
            [userId]: newMemberHours,
          },
        });
      }

      // Clear local state after successful stop
      clearTimer(taskId);
      removePendingWrite(existingTimer.timerId);
      clearError(existingTimer.timerId);
      setSyncStatus('idle');

      console.log(SUCCESS_MESSAGES.TIMER_STOPPED);
    } catch (error) {
      const err = error as Error;
      console.error('[useTimerActions] Stop failed:', err);

      const existingTimer = getTimerForTask(taskId);
      if (existingTimer) {
        setError(existingTimer.timerId, err);
      }

      setSyncStatus('error');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [
    taskId,
    userId,
    isProcessing,
    getTimerForTask,
    clearTimer,
    setSyncStatus,
    addPendingWrite,
    removePendingWrite,
    setError,
    clearError,
  ]);

  /**
   * Reset the timer
   * Clears local state and deletes from Firebase
   */
  const resetTimer = useCallback(async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      setSyncStatus('syncing');

      const existingTimer = getTimerForTask(taskId);

      if (!existingTimer) {
        // No timer to reset, just clear local state
        clearTimer(taskId);
        setSyncStatus('idle');
        return;
      }

      addPendingWrite(existingTimer.timerId);

      // Delete from Firebase with retry
      await retryWithBackoff(
        () => deleteTimer(taskId, userId),
        {
          maxAttempts: 3,
          onRetry: (attempt, error) => {
            console.warn(`[useTimerActions] Reset retry ${attempt}:`, error.message);
          },
        }
      );

      // Clear local state
      clearTimer(taskId);
      removePendingWrite(existingTimer.timerId);
      clearError(existingTimer.timerId);
      setSyncStatus('idle');

      console.log(SUCCESS_MESSAGES.TIMER_RESET);
    } catch (error) {
      const err = error as Error;
      console.error('[useTimerActions] Reset failed:', err);

      const existingTimer = getTimerForTask(taskId);
      if (existingTimer) {
        setError(existingTimer.timerId, err);
      }

      setSyncStatus('error');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [
    taskId,
    isProcessing,
    getTimerForTask,
    clearTimer,
    setSyncStatus,
    addPendingWrite,
    removePendingWrite,
    setError,
    clearError,
  ]);

  return {
    startTimer,
    pauseTimer,
    stopTimer,
    resetTimer,
    isProcessing,
    runningTimerTaskId,
  };
}
