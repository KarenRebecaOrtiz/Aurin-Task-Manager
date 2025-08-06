import { useEffect, useCallback } from 'react';
import { useTimerStoreHook } from './useTimerStore';

/**
 * @deprecated Use useTimerStoreHook instead. This hook is deprecated and will be removed in a future version.
 * The new hook provides better precision, improved synchronization, and enhanced multi-device support.
 */
export const useTimer = (taskId: string, userId: string) => {
  console.warn('[useTimer] ⚠️ This hook is deprecated. Use useTimerStoreHook instead for better precision and synchronization.');
  
  // Redirect to the new hook
  return useTimerStoreHook(taskId, userId);
}; 