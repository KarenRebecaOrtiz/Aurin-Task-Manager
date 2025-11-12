/**
 * PriorityCell Component
 * Displays task priority with icon and label
 * Used in TasksTable, ArchiveTable, and can be adapted for Kanban
 */

import React from 'react';
import Image from 'next/image';
import styles from './PriorityCell.module.scss';

interface PriorityCellProps {
  priority: string;
  className?: string;
}

/**
 * Maps priority to corresponding icon
 */
const getPriorityIcon = (priority: string): string => {
  const iconMap: { [key: string]: string } = {
    'Alta': '/arrow-up.svg',
    'Media': '/arrow-right.svg',
    'Baja': '/arrow-down.svg',
  };

  return iconMap[priority] || '/arrow-right.svg';
};

/**
 * PriorityCell Component
 * Renders a priority badge with icon and label
 */
const PriorityCell: React.FC<PriorityCellProps> = ({ priority, className }) => {
  const icon = getPriorityIcon(priority);
  const priorityClass = `priority-${priority}`;

  return (
    <div className={`${styles.priorityWrapper} ${className || ''}`}>
      <Image
        src={icon}
        alt={priority}
        width={16}
        height={16}
      />
      <span className={styles[priorityClass]}>{priority}</span>
    </div>
  );
};

export default PriorityCell;
