'use client';

import styles from './KanbanColumnHeader.module.scss';

interface KanbanColumnHeaderProps {
  title: string;
  taskCount: number;
}

export const KanbanColumnHeader: React.FC<KanbanColumnHeaderProps> = ({ title, taskCount }) => {
  return (
    <div className={styles.columnHeader}>
      <h2 className={styles.columnTitle}>{title}</h2>
      <span className={styles.taskCount}>{taskCount}</span>
    </div>
  );
};

KanbanColumnHeader.displayName = 'KanbanColumnHeader';
