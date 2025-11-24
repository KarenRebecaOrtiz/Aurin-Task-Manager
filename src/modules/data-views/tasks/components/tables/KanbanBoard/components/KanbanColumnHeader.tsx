'use client';

import styles from './KanbanColumnHeader.module.scss';

interface KanbanColumnHeaderProps {
  title: string;
  taskCount: number;
  status?: string;
}

// Status to color mapping - matches StatusBadge colors
const getStatusColor = (status?: string): string => {
  if (!status) return 'default';

  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '-');

  const statusColorMap: { [key: string]: string } = {
    'backlog': 'backlog',
    'por-iniciar': 'todo',
    'todo': 'todo',
    'en-proceso': 'in-progress',
    'in-progress': 'in-progress',
    'por-finalizar': 'in-review',
    'in-review': 'in-review',
    'finalizado': 'done',
    'done': 'done',
    'cancelado': 'archived',
    'archived': 'archived',
  };

  return statusColorMap[normalizedStatus] || 'default';
};

export const KanbanColumnHeader: React.FC<KanbanColumnHeaderProps> = ({ title, taskCount, status }) => {
  const colorClass = getStatusColor(status);

  return (
    <div className={`${styles.columnHeader} ${styles[colorClass]}`}>
      <h2 className={styles.columnTitle}>{title}</h2>
      <span className={styles.taskCount}>{taskCount}</span>
    </div>
  );
};

KanbanColumnHeader.displayName = 'KanbanColumnHeader';
