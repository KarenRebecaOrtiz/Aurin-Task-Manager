/**
 * TimeCell Component
 * Displays formatted time tracking for tasks
 * Used in TasksTable and ArchiveTable
 */

import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';
import styles from './TimeCell.module.scss';

interface TimeTrackingData {
  totalHours: number;
  totalMinutes: number;
  lastLogDate: string | null;
  memberHours?: { [userId: string]: number };
}

interface TimeCellProps {
  timeTracking?: TimeTrackingData;
  /** Legacy field for backward compatibility */
  totalHours?: number;
  className?: string;
  emptyText?: string;
  showIcon?: boolean;
}

/**
 * Formats time to human readable format
 * Examples: "0h", "2h", "1h 30m", "24h"
 */
const formatTime = (hours: number, minutes: number = 0): string => {
  const totalMinutes = Math.round(hours * 60 + minutes);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h === 0 && m === 0) {
    return '0h';
  }

  if (m === 0) {
    return `${h}h`;
  }

  if (h === 0) {
    return `${m}m`;
  }

  return `${h}h ${m}m`;
};

/**
 * TimeCell Component
 * Renders formatted time or empty indicator
 */
const TimeCell: React.FC<TimeCellProps> = ({
  timeTracking,
  totalHours: legacyTotalHours,
  className,
  emptyText = '—',
  showIcon = true,
}) => {
  const { formattedTime, hasTime } = useMemo(() => {
    // Prefer new timeTracking structure
    if (timeTracking) {
      const { totalHours: hours, totalMinutes: minutes } = timeTracking;
      const total = hours + (minutes || 0) / 60;
      return {
        formattedTime: formatTime(hours, minutes || 0),
        hasTime: total > 0,
      };
    }

    // Fallback to legacy field
    if (legacyTotalHours && legacyTotalHours > 0) {
      const hours = Math.floor(legacyTotalHours);
      const minutes = Math.round((legacyTotalHours - hours) * 60);
      return {
        formattedTime: formatTime(hours, minutes),
        hasTime: true,
      };
    }

    return {
      formattedTime: emptyText,
      hasTime: false,
    };
  }, [timeTracking, legacyTotalHours, emptyText]);

  return (
    <div className={`${styles.timeWrapper} ${className || ''}`}>
      {showIcon && (
        <Clock
          size={14}
          className={hasTime ? styles.icon : styles.iconEmpty}
        />
      )}
      <span className={hasTime ? styles.time : styles.emptyTime}>
        {formattedTime}
      </span>
    </div>
  );
};

export default TimeCell;
