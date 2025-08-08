'use client';

import React from 'react';
import NumberFlow from '@number-flow/react';
import { motion } from 'framer-motion';
import styles from './TimerCounter.module.scss';

interface TimerCounterProps {
  hours: number;
  minutes: number;
  seconds: number;
  className?: string;
}

const MotionNumberFlow = motion.create(NumberFlow);

export default function TimerCounter({ 
  hours, 
  minutes, 
  seconds, 
  className 
}: TimerCounterProps) {
  return (
    <div className={`${styles.timerCounter} ${className || ''}`}>
      <div className={styles.clockIcon}>
        <svg width="22" height="20" viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11 7V11L13 13M4 1L1 4M21 4L18 1M5.38 16.7L3 19M16.6399 16.6699L18.9999 18.9999M19 11C19 15.4183 15.4183 19 11 19C6.58172 19 3 15.4183 3 11C3 6.58172 6.58172 3 11 3C15.4183 3 19 6.58172 19 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      
      <div className={styles.timeDisplay}>
        <div className={styles.timeUnit}>
          <MotionNumberFlow
            value={hours}
            className={styles.timeNumber}
            format={{ minimumIntegerDigits: 2 }}
          />
          <span className={styles.timeLabel}>Horas</span>
        </div>
        
        <div className={styles.timeSeparator}>:</div>
        
        <div className={styles.timeUnit}>
          <MotionNumberFlow
            value={minutes}
            className={styles.timeNumber}
            format={{ minimumIntegerDigits: 2 }}
          />
          <span className={styles.timeLabel}>Min</span>
        </div>
        
        <div className={styles.timeSeparator}>:</div>
        
        <div className={styles.timeUnit}>
          <MotionNumberFlow
            value={seconds}
            className={styles.timeNumber}
            format={{ minimumIntegerDigits: 2 }}
          />
          <span className={styles.timeLabel}>Seg</span>
        </div>
      </div>
    </div>
  );
} 