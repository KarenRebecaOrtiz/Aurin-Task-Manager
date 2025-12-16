'use client';

import React, { useCallback } from 'react';
import { List } from '@/components/animate-ui/icons/list';
import { LayoutDashboard } from '@/components/animate-ui/icons/layout-dashboard';
import styles from './ViewToggle.module.scss';

type ViewType = 'table' | 'kanban';

interface ViewToggleProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({
  currentView,
  onViewChange,
}) => {
  const handleTableClick = useCallback(() => {
    onViewChange('table');
  }, [onViewChange]);

  const handleKanbanClick = useCallback(() => {
    onViewChange('kanban');
  }, [onViewChange]);

  return (
    <div className={styles.toggleGroup}>
      <button
        type="button"
        className={`${styles.toggleItem} ${currentView === 'table' ? styles.active : ''}`}
        onClick={handleTableClick}
        aria-pressed={currentView === 'table'}
      >
        <List className={styles.icon} />
        <span>Tabla</span>
      </button>
      <button
        type="button"
        className={`${styles.toggleItem} ${currentView === 'kanban' ? styles.active : ''}`}
        onClick={handleKanbanClick}
        aria-pressed={currentView === 'kanban'}
      >
        <LayoutDashboard className={styles.icon} />
        <span>Kanban</span>
      </button>
    </div>
  );
};

export default ViewToggle;
