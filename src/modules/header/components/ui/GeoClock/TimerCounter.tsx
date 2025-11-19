'use client';

import { useMemo } from 'react';
import { SlidingNumber } from '@/components/ui/sliding-number';
import styles from './TimerCounter.module.scss';

interface TimerCounterProps {
  seconds: number;
  isRunning: boolean;
  isDarkMode: boolean;
}

/**
 * TimerCounter - Displays timer with sliding number animation
 * Shows format: Xm Xs or Xh Xm Xs
 */
export const TimerCounter: React.FC<TimerCounterProps> = ({
  seconds,
  isRunning,
  isDarkMode,
}) => {
  // Calculate time components
  const timeComponents = useMemo(() => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return { hours, minutes, secs };
  }, [seconds]);

  return (
    <div
      className={`${styles.timerCounter} ${
        isRunning ? styles.running : styles.paused
      } ${isDarkMode ? styles.dark : styles.light}`}
    >
      {timeComponents.hours > 0 && (
        <>
          <SlidingNumber value={timeComponents.hours} padStart={true} />
          <span className={styles.separator}>h</span>
        </>
      )}
      <SlidingNumber value={timeComponents.minutes} padStart={true} />
      <span className={styles.separator}>m</span>
      <SlidingNumber value={timeComponents.secs} padStart={true} />
      <span className={styles.separator}>s</span>
      {isRunning && <span className={styles.runningIndicator} />}
    </div>
  );
};
