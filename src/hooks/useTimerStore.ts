import { useEffect, useCallback, useState } from 'react';
import { useTimerStore } from '@/stores/timerStore';
import { useShallow } from 'zustand/react/shallow';

export const useTimerStoreHook = (taskId: string, userId: string) => {
  const [isInitializing, setIsInitializing] = useState(true);
  
  const {
    // Estado
    isRunning,
    accumulatedSeconds,
    isRestoring,
    // Eliminadas: syncStatus y workerActive
    initializeTimer,
    startTimer,
    pauseTimer,
    resetTimer,
    finalizeTimer,
    cleanupTimer,
  } = useTimerStore(
    useShallow(state => ({
      isRunning: state.isRunning,
      accumulatedSeconds: state.accumulatedSeconds,
      isRestoring: state.isRestoring,
      // Eliminadas: syncStatus y workerActive
      initializeTimer: state.initializeTimer,
      startTimer: state.startTimer,
      pauseTimer: state.pauseTimer,
      resetTimer: state.resetTimer,
      finalizeTimer: state.finalizeTimer,
      cleanupTimer: state.cleanupTimer,
    }))
  );

  // Inicializar timer cuando cambian taskId o userId
  useEffect(() => {
    if (taskId && userId) {
      setIsInitializing(true);
      initializeTimer(taskId, userId).finally(() => {
        // Dar un pequeño delay para asegurar que el estado se haya propagado
        setTimeout(() => setIsInitializing(false), 100);
      });
    }

    // Cleanup cuando el componente se desmonta
    return () => {
      cleanupTimer();
    };
  }, [taskId, userId, initializeTimer, cleanupTimer]);

  // Memoizar las acciones para evitar re-renders
  const memoizedStartTimer = useCallback(async () => {
    await startTimer();
  }, [startTimer]);

  const memoizedPauseTimer = useCallback(async () => {
    await pauseTimer();
  }, [pauseTimer]);

  const memoizedResetTimer = useCallback(async () => {
    await resetTimer();
  }, [resetTimer]);

  const memoizedFinalizeTimer = useCallback(async () => {
    return await finalizeTimer();
  }, [finalizeTimer]);

  return {
    // Estado
    isTimerRunning: isRunning,
    timerSeconds: accumulatedSeconds,
    isRestoringTimer: isRestoring,
    isInitializing,
    // Eliminadas: syncStatus y workerActive
    startTimer: memoizedStartTimer,
    pauseTimer: memoizedPauseTimer,
    resetTimer: memoizedResetTimer,
    finalizeTimer: memoizedFinalizeTimer,
  };
}; 