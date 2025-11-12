/**
 * DateCell Component
 * Displays formatted dates for tasks
 * Used in TasksTable and ArchiveTable
 */

import React from 'react';
import styles from './DateCell.module.scss';

interface DateCellProps {
  date: string | null | undefined;
  format?: 'short' | 'long' | 'relative';
  className?: string;
  emptyText?: string;
}

/**
 * Formats date string to readable format
 */
const formatDate = (dateString: string | null | undefined, format: 'short' | 'long' | 'relative' = 'short'): string => {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return '';
    }

    if (format === 'relative') {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Hoy';
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;
      if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
      if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
      return `Hace ${Math.floor(diffDays / 365)} años`;
    }

    if (format === 'long') {
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    // Default: short format
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * DateCell Component
 * Renders formatted date or empty text
 */
const DateCell: React.FC<DateCellProps> = ({
  date,
  format = 'short',
  className,
  emptyText = '—',
}) => {
  const formattedDate = formatDate(date, format);

  return (
    <div className={`${styles.dateWrapper} ${className || ''}`}>
      <span className={formattedDate ? styles.date : styles.emptyDate}>
        {formattedDate || emptyText}
      </span>
    </div>
  );
};

export default DateCell;
