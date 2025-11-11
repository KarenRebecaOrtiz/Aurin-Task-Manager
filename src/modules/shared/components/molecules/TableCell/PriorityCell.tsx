'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import styles from './TableCell.module.scss';

export type Priority = 'Alta' | 'Media' | 'Baja';

export interface PriorityCellProps {
  priority: Priority;
  showIcon?: boolean;
  className?: string;
}

const getPriorityIcon = (priority: Priority): string => {
  switch (priority) {
    case 'Alta':
      return '/arrow-up.svg';
    case 'Media':
      return '/arrow-right.svg';
    case 'Baja':
      return '/arrow-down.svg';
    default:
      return '/arrow-right.svg';
  }
};

export const PriorityCell: React.FC<PriorityCellProps> = ({
  priority,
  showIcon = true,
  className = '',
}) => {
  const icon = useMemo(() => getPriorityIcon(priority), [priority]);

  return (
    <div className={`${styles.priorityCell} ${className}`}>
      {showIcon && (
        <Image
          src={icon}
          alt={priority}
          width={16}
          height={16}
          className={styles.priorityIcon}
        />
      )}
      <span className={styles[`priority-${priority}`]}>{priority}</span>
    </div>
  );
};
