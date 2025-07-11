// src/components/ui/DatePill.tsx
'use client';

import React from 'react';
import styles from '../ChatSidebar.module.scss'; // Adjust path if necessary

interface DatePillProps {
  date: Date;
}

const DatePill: React.FC<DatePillProps> = ({ date }) => {
  const formatDateForPill = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  return (
    <div className={styles.datePill}>
      <span className={styles.datePillText}>{formatDateForPill(date)}</span>
    </div>
  );
};

export default DatePill;