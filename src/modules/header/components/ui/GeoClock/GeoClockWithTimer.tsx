'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useRunningTimers } from '@/modules/chat/timer';
import { useTimerStateStore } from '@/modules/chat/timer/stores/timerStateStore';
import { tasksTableStore } from '@/modules/data-views/tasks/stores/tasksTableStore';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';
import { useDataStore } from '@/stores/dataStore';
import { TimerCounter } from './TimerCounter';
import styles from './GeoClockWithTimer.module.scss';

interface GeoClockWithTimerProps {
  onTaskClick?: (taskId: string) => void;
}

const GeoClockWithTimer: React.FC<GeoClockWithTimerProps> = ({ onTaskClick }) => {
  const { isDarkMode } = useTheme();
  const runningTimers = useRunningTimers();
  const getTimerForTask = useTimerStateStore((state) => state.getTimerForTask);
  const filteredTasks = tasksTableStore((state) => state.filteredTasks);
  const tasks = useDataStore((state) => state.tasks);
  const clients = useDataStore((state) => state.clients);
  const [taskName, setTaskName] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const activeTimer = useMemo(() => {
    return runningTimers.length > 0 ? runningTimers[0] : null;
  }, [runningTimers]);



  // Update timer display every second
  useEffect(() => {
    if (!activeTimer) {
      setTaskName(null);
      setTimerSeconds(0);
      setIsRunning(false);
      setActiveTaskId(null);
      return;
    }

    const timer = getTimerForTask(activeTimer.taskId);
    if (!timer) return;

    // Get task name from store
    const task = filteredTasks.find((t) => t.id === activeTimer.taskId);
    setTaskName(task?.name || null);
    setActiveTaskId(activeTimer.taskId);
    setIsRunning(timer.status === 'running');

    // Calculate elapsed seconds
    const calculateElapsed = () => {
      const now = new Date();
      const startTime = timer.startedAt instanceof Date 
        ? timer.startedAt 
        : new Date(timer.startedAt);
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      return timer.accumulatedSeconds + elapsed;
    };

    if (timer.status === 'running' && timer.startedAt) {
      setTimerSeconds(calculateElapsed());
      const interval = setInterval(() => {
        setTimerSeconds(calculateElapsed());
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimerSeconds(timer.accumulatedSeconds);
    }
  }, [activeTimer, getTimerForTask, filteredTasks]);

  // Handle click to open task chat sidebar
  const handleTimerClick = useCallback(() => {
    if (!activeTaskId) return;

    // If custom handler provided, use it
    if (onTaskClick) {
      onTaskClick(activeTaskId);
      return;
    }

    // Find the full task object
    const task = tasks.find((t) => t.id === activeTaskId);
    if (!task) {
      console.warn('[GeoClockWithTimer] Task not found:', activeTaskId);
      return;
    }

    // Find the client name
    const client = clients.find((c) => c.id === task.clientId);
    const clientName = client?.name || 'Sin cuenta';

    // Open chat sidebar directly
    const { openChatSidebar } = useSidebarStateStore.getState();
    openChatSidebar(task, clientName);
  }, [activeTaskId, onTaskClick, tasks, clients]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleTimerClick();
    }
  }, [handleTimerClick]);

  // Handle cleanup of deleted task timer
  const handleCleanupTimer = useCallback(() => {
    if (activeTaskId) {
      const clearTimer = useTimerStateStore.getState().clearTimer;
      clearTimer(activeTaskId);
    }
  }, [activeTaskId]);

  if (!activeTimer) {
    return null;
  }

  // Task was deleted - show warning and cleanup option
  if (!taskName && activeTaskId) {
    return (
      <div className={`${styles.deletedTaskContainer} ${isDarkMode ? styles.dark : styles.light}`}>
        <div className={styles.deletedTaskHeader}>
          <span>⚠️ Tarea eliminada</span>
        </div>
        <div className={styles.deletedTaskActions}>
          <button
            className={`${styles.cleanupButton} ${isDarkMode ? styles.dark : styles.light}`}
            onClick={handleCleanupTimer}
          >
            Limpiar timer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.geoClockWithTimer} ${isDarkMode ? styles.dark : styles.light}`}
      onClick={handleTimerClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.taskName} title={taskName || 'Sin nombre'}>
        {taskName || 'Sin nombre'}
      </div>
      <TimerCounter
        seconds={timerSeconds}
        isRunning={isRunning}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default GeoClockWithTimer;
