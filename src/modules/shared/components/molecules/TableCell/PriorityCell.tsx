'use client';

import React from 'react';
import { PriorityBadge } from '@/modules/data-views/components/shared/states';
import styles from './TableCell.module.scss';

export type Priority = 'Alta' | 'Media' | 'Baja';

export interface PriorityCellProps {
  priority: Priority;
  showIcon?: boolean;
  className?: string;
}

export const PriorityCell: React.FC<PriorityCellProps> = ({
  priority,
  showIcon = true,
  className = '',
}) => {
  return (
    <div className={`${styles.priorityCell} ${className}`}>
      <PriorityBadge priority={priority} showIcon={showIcon} />
    </div>
  );
};
