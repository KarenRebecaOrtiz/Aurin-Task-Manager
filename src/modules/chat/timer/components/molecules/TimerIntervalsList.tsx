/**
 * Timer Module - Timer Intervals List Component
 *
 * Displays list of timer intervals (work sessions) with formatting
 *
 * @module timer/components/molecules/TimerIntervalsList
 */

'use client';

import React from 'react';
import type { TimerIntervalsListProps } from '../../types/timer.types';
import { formatDateWithTime, formatSecondsToHHMM, ensureIntervalDates } from '../../utils/timerFormatters';
import { calculateTotalFromIntervals } from '../../services/timerCalculations';
import styles from './TimerIntervalsList.module.scss';

/**
 * TimerIntervalsList Component
 *
 * Displays a list of timer intervals with start/end times and durations
 *
 * @param intervals - Array of timer intervals to display
 * @param showTotal - Whether to show total time summary
 * @param compact - Whether to use compact display mode
 * @param maxVisible - Maximum number of intervals to show (rest are hidden)
 */
export function TimerIntervalsList({
  intervals,
  showTotal = false,
  compact = false,
  maxVisible = 10
}: TimerIntervalsListProps) {
  // Calculate total duration
  const totalSeconds = calculateTotalFromIntervals(intervals);

  // Limit visible items
  const visibleIntervals = intervals.slice(0, maxVisible);
  const hasMore = intervals.length > maxVisible;

  // Empty state
  if (intervals.length === 0) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon} role="img" aria-label="Timer">
          ⏱️
        </span>
        <p className={styles.emptyText}>1 sesión continua • Sin pausas</p>
      </div>
    );
  }

  return (
    <div className={`${styles.intervalsList} ${compact ? styles.compact : ''}`}>
      {/* Unified Summary Card */}
      {showTotal && (
        <div className={styles.summaryCard}>
          <div className={styles.summaryContent}>
            <div className={styles.summaryText}>
              {intervals.length} sesión{intervals.length !== 1 ? 'es' : ''} registrada{intervals.length !== 1 ? 's' : ''}
            </div>
            <div className={styles.summaryTotal}>
              <span className={styles.summaryTotalLabel}>Total Acumulado:</span>
              <span className={styles.summaryTotalValue}>
                {formatSecondsToHHMM(totalSeconds)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Intervals */}
      <div className={styles.intervals}>
        {visibleIntervals.map((interval, index) => {
          // Ensure interval dates are Date objects (defensive conversion)
          const safeInterval = ensureIntervalDates(interval);
          
          return (
            <div key={`interval-${index}`} className={styles.intervalItem}>
              <div className={styles.intervalHeader}>
                <span className={styles.intervalIndex}>Sesión #{index + 1}</span>
                <span className={styles.intervalDuration}>
                  {formatSecondsToHHMM(safeInterval.duration)}
                </span>
              </div>

              <div className={styles.intervalTimes}>
                <span className={styles.time}>
                  {formatDateWithTime(safeInterval.start)}
                </span>
                <span className={styles.arrow} aria-hidden="true">
                  →
                </span>
                <span className={styles.time}>
                  {formatDateWithTime(safeInterval.end)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* More indicator */}
      {hasMore && (
        <div className={styles.moreIndicator}>
          +{intervals.length - maxVisible} más...
        </div>
      )}
    </div>
  );
}

export default TimerIntervalsList;
