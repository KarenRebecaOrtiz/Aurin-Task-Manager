'use client';

import React, { useMemo } from 'react';
import { StatusBadge, StatusType } from '@/modules/data-views/components/shared/states';
import styles from './TableCell.module.scss';

export interface StatusCellProps {
  status: string;
  showIcon?: boolean;
  className?: string;
}

const normalizeStatusToType = (status: string): StatusType => {
  if (!status) return 'backlog';

  const normalized = status.trim().toLowerCase();

  const statusMap: { [key: string]: StatusType } = {
    'por iniciar': 'todo',
    'por-iniciar': 'todo',
    'pendiente': 'todo',
    'pending': 'todo',
    'to do': 'todo',
    'todo': 'todo',
    'en proceso': 'in-progress',
    'en-proceso': 'in-progress',
    'in progress': 'in-progress',
    'progreso': 'in-progress',
    'por finalizar': 'in-review',
    'por-finalizar': 'in-review',
    'to finish': 'in-review',
    'finalizado': 'done',
    'finalizada': 'done',
    'completed': 'done',
    'completado': 'done',
    'completada': 'done',
    'done': 'done',
    'terminado': 'done',
    'terminada': 'done',
    'finished': 'done',
    'backlog': 'backlog',
    'cancelado': 'archived',
    'cancelada': 'archived',
    'cancelled': 'archived',
  };

  return statusMap[normalized] || 'backlog';
};

export const StatusCell: React.FC<StatusCellProps> = ({
  status,
  showIcon = true,
  className = '',
}) => {
  const statusType = useMemo(() => normalizeStatusToType(status), [status]);

  return (
    <div className={`${styles.statusCell} ${className}`}>
      <StatusBadge status={statusType} showIcon={showIcon} />
    </div>
  );
};
