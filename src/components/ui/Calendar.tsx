"use client";

import React, { useState } from 'react';
import styles from './Calendar.module.scss';

// Utility functions
const getDaysInMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

const getFirstDayOfMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
};

const isDateInRange = (date: Date, start: Date | null, end: Date | null): boolean => {
  if (!start || !end) return false;
  return date >= start && date <= end;
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Interfaces
interface Event {
  title: string;
  type: string;
}

interface CalendarProps {
  defaultDate?: Date;
  selectionMode?: 'single' | 'multiple' | 'range';
  events?: Record<string, Event[]>;
  disabledDates?: Date[];
  onDateSelect?: (date: Date) => void;
  className?: string;
}

interface TooltipState {
  show: boolean;
  content: string;
  x: number;
  y: number;
}

// Sample events data
const sampleEvents: Record<string, Event[]> = {
  '2024-12-25': [{ title: 'Christmas Day', type: 'holiday' }],
  '2024-12-31': [{ title: "New Year's Eve", type: 'celebration' }],
  '2025-01-01': [{ title: "New Year's Day", type: 'holiday' }],
  '2025-01-15': [{ title: 'Team Meeting', type: 'work' }],
  '2025-01-20': [{ title: 'Project Deadline', type: 'important' }],
};

const Calendar: React.FC<CalendarProps> = ({
  defaultDate = new Date(),
  selectionMode = 'single',
  events = sampleEvents,
  disabledDates = [],
  onDateSelect = () => {},
  className = '',
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(defaultDate);
  const [view, setView] = useState<'month' | 'year'>('month');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ show: false, content: '', x: 0, y: 0 });

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleDateClick = (date: Date) => {
    if (disabledDates.some((disabled) => isSameDay(date, disabled))) return;

    if (selectionMode === 'single') {
      setSelectedDates([date]);
      setRangeStart(null);
      setRangeEnd(null);
    } else if (selectionMode === 'multiple') {
      setSelectedDates((prev) => {
        const exists = prev.find((d) => isSameDay(d, date));
        if (exists) {
          return prev.filter((d) => !isSameDay(d, date));
        } else {
          return [...prev, date];
        }
      });
    } else if (selectionMode === 'range') {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(date);
        setRangeEnd(null);
        setSelectedDates([]);
      } else {
        if (date < rangeStart) {
          setRangeEnd(rangeStart);
          setRangeStart(date);
        } else {
          setRangeEnd(date);
        }
        setSelectedDates([]);
      }
    }

    onDateSelect(date);
  };

  const navigateMonth = (direction: number) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const navigateYear = (direction: number) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setFullYear(prev.getFullYear() + direction);
      return newDate;
    });
  };

  const handleMonthClick = (monthIndex: number) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(monthIndex);
      return newDate;
    });
    setView('month');
  };

  const showTooltip = (event: React.MouseEvent, content: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({
      show: true,
      content,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const hideTooltip = () => {
    setTooltip({ show: false, content: '', x: 0, y: 0 });
  };

  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days: React.JSX.Element[] = [];

    // Previous month's trailing days
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 0);
    const prevMonthDays = prevMonth.getDate();

    for (let i = 0; i < firstDay; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevMonthDays - i);
      days.push(
        <div
          key={`prev-${prevMonthDays - i}`}
          className={styles.dayCell}
          onClick={() => handleDateClick(date)}
        >
          {prevMonthDays - i}
        </div>
      );
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateKey = date.toISOString().split('T')[0];
      const hasEvents = events[dateKey];
      const isSelected = selectedDates.some((d) => isSameDay(d, date));
      const isToday = isSameDay(date, new Date());
      const isDisabled = disabledDates.some((disabled) => isSameDay(disabled, date));
      const isRangeStart = rangeStart && isSameDay(date, rangeStart);
      const isRangeEnd = rangeEnd && isSameDay(date, rangeEnd);
      const isInRange = rangeStart && rangeEnd && isDateInRange(date, rangeStart, rangeEnd);

      let cellClasses = `${styles.dayCell} ${styles.glass}`;
      if (isDisabled) {
        cellClasses += ` ${styles.disabled}`;
      } else if (isSelected || isRangeStart || isRangeEnd) {
        cellClasses += ` ${styles.selected}`;
      } else if (isInRange) {
        cellClasses += ` ${styles.rangeMiddle}`;
      } else if (isToday) {
        cellClasses += ` ${styles.today}`;
      }

      days.push(
        <div
          key={day}
          className={cellClasses}
          onClick={() => {
            if (!isDisabled) {
              handleDateClick(date);
            }
          }}
          onMouseEnter={(e) => {
            if (hasEvents) {
              showTooltip(e, hasEvents.map((event) => event.title).join(', '));
            }
          }}
          onMouseLeave={hideTooltip}
          role="button"
          tabIndex={0}
          aria-label={`${formatDate(date)}${hasEvents ? `, Events: ${hasEvents.map((e) => e.title).join(', ')}` : ''}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (!isDisabled) {
                handleDateClick(date);
              }
            }
          }}
        >
          {day}
          {hasEvents && <div className={styles.eventDot}></div>}
        </div>
      );
    }

    // Next month's leading days
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - (firstDay + daysInMonth);

    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day);
      days.push(
        <div
          key={`next-${day}`}
          className={styles.dayCell}
          onClick={() => handleDateClick(date)}
        >
          {day}
        </div>
      );
    }

    return (
      <div className={styles.fadeIn}>
        <div className={styles.dayGrid}>
          {dayNames.map((day) => (
            <div key={day} className={styles.dayName}>
              {day}
            </div>
          ))}
        </div>
        <div className={styles.dayGrid}>{days}</div>
      </div>
    );
  };

  const renderYearView = () => {
    return (
      <div className={`${styles.fadeIn} ${styles.monthGrid}`}>
        {monthNames.map((month, index) => (
          <button
            key={month}
            className={`${styles.glass} ${styles.monthButton}`}
            onClick={() => handleMonthClick(index)}
            aria-label={`Select ${month}`}
          >
            <div className={styles.monthName}>{month}</div>
            <div className={styles.monthShort}>
              {new Date(currentDate.getFullYear(), index, 1).toLocaleDateString('en-US', { month: 'short' })}
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className={`${styles.calendar} ${className}`}>
      {/* Header */}
      <div className={styles.header}>
        <button
          className={`${styles.navButton} ${styles.glassDark}`}
          onClick={() => (view === 'month' ? navigateMonth(-1) : navigateYear(-1))}
          aria-label={`Previous ${view}`}
        >
          <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className={styles.titleContainer}>
          <button
            className={styles.title}
            onClick={() => setView(view === 'month' ? 'year' : 'month')}
            aria-label={`Switch to ${view === 'month' ? 'year' : 'month'} view`}
          >
            {view === 'month'
              ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`
              : currentDate.getFullYear()}
          </button>
          <div className={styles.subtitle}>
            {view === 'month' ? 'Click to view year' : 'Click to view month'}
          </div>
        </div>

        <button
          className={`${styles.navButton} ${styles.glassDark}`}
          onClick={() => (view === 'month' ? navigateMonth(1) : navigateYear(1))}
          aria-label={`Next ${view}`}
        >
          <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* View Toggle */}
      <div className={styles.toggleContainer}>
        <div className={styles.glass}>
          <button
            className={`${styles.toggleButton} ${view === 'month' ? styles.toggleActive : ''}`}
            onClick={() => setView('month')}
          >
            Month
          </button>
          <button
            className={`${styles.toggleButton} ${view === 'year' ? styles.toggleActive : ''}`}
            onClick={() => setView('year')}
          >
            Year
          </button>
        </div>
      </div>

      {/* Calendar Content */}
      <div className={styles.slideIn}>{view === 'month' ? renderMonthView() : renderYearView()}</div>

      {/* Selection Info */}
      {(selectedDates.length > 0 || (rangeStart && rangeEnd)) && (
        <div className={`${styles.selectionInfo} ${styles.glass}`}>
          <div className={styles.selectionTitle}>Selected:</div>
          <div className={styles.selectionContent}>
            {selectionMode === 'range' && rangeStart && rangeEnd
              ? `${formatDate(rangeStart)} - ${formatDate(rangeEnd)}`
              : selectedDates.map((date) => formatDate(date)).join(', ')}
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip.show && (
        <div
          className={styles.tooltip}
          style={{
            position: 'fixed',
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translateX(-50%)',
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

export default Calendar;
