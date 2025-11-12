/**
 * StatusCell Component
 * Displays task status with badge styling
 * Used in TasksTable, ArchiveTable, and can be adapted for Kanban
 */

import React from 'react';
import { StatusBadge, StatusType } from '../states/StatusBadge';
import { normalizeStatus } from '../../../utils/statusUtils';

interface StatusCellProps {
  status: string;
  className?: string;
  showIcon?: boolean;
}

/**
 * Maps Spanish status to StatusBadge types
 */
const mapStatusToType = (normalizedStatus: string): StatusType => {
  const statusMap: { [key: string]: StatusType } = {
    'Por Iniciar': 'todo',
    'En Proceso': 'in-progress',
    'Por Finalizar': 'in-review',
    'Finalizado': 'done',
    'Backlog': 'backlog',
    'Cancelado': 'archived',
  };

  return statusMap[normalizedStatus] || 'todo';
};

/**
 * StatusCell Component
 * Renders a status badge with Tailwind styling
 */
const StatusCell: React.FC<StatusCellProps> = ({ status, className = '', showIcon = true }) => {
  const normalizedStatus = normalizeStatus(status);
  const statusType = mapStatusToType(normalizedStatus);

  return (
    <StatusBadge
      status={statusType}
      showIcon={showIcon}
      className={className}
    />
  );
};

export default StatusCell;
