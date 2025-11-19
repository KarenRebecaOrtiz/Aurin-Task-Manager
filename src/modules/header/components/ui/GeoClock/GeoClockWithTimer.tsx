'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useRunningTimers } from '@/modules/chat/timer';
import { useTimerStateStore } from '@/modules/chat/timer/stores/timerStateStore';
import { tasksTableStore } from '@/modules/data-views/tasks/stores/tasksTableStore';
import { TimerCounter } from './TimerCounter';
import styles from './GeoClockWithTimer.module.scss';

interface GeoClockWithTimerProps {
  onTaskClick?: (taskId: string) => void;
}

const GeoClockWithTimer: React.FC<GeoClockWithTimerProps> = ({ onTaskClick }) => {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const runningTimers = useRunningTimers();
  const getTimerForTask = useTimerStateStore((state) => state.getTimerForTask);
  const filteredTasks = tasksTableStore((state) => state.filteredTasks);
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
    setTaskName(task?.name || activeTimer.taskId);
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

  // Handle click to open task
  const handleTimerClick = useCallback(() => {
    if (activeTaskId) {
      if (onTaskClick) {
        onTaskClick(activeTaskId);
      } else {
        router.push(`/dashboard/tasks?taskId=${activeTaskId}`);
      }
    }
  }, [activeTaskId, onTaskClick, router]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleTimerClick();
    }
  }, [handleTimerClick]);

  if (!activeTimer) {
    return null;
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
