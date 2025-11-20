/**
 * ActionCell Component
 * Displays action menu for task operations (edit, delete, archive)
 * Used in TasksTable and ArchiveTable
 */

import React, { useRef } from 'react';
import ActionMenu from '../../../components/ui/ActionMenu';
import styles from './ActionCell.module.scss';

interface Task {
  id: string;
  clientId: string;
  project: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string | null;
  endDate: string | null;
  LeadedBy: string[];
  AssignedTo: string[];
  createdAt: string;
  CreatedBy?: string;
  archived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
}

interface ActionCellProps {
  task: Task;
  userId: string;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
  actionButtonRef?: (el: HTMLButtonElement | null) => void;
  actionMenuOpenId?: string | null;
  onActionMenuToggle?: (taskId: string) => void;
  className?: string;
}

/**
 * ActionCell Component
 * Renders action menu if user has permissions
 */
const ActionCell: React.FC<ActionCellProps> = ({
  task,
  userId,
  isAdmin,
  onEdit,
  onDelete,
  onArchive,
  actionButtonRef,
  className,
}) => {
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Check if user has permission to see action menu
  const shouldShowActionMenu = isAdmin || task.CreatedBy === userId;

  if (!shouldShowActionMenu) {
    return null;
  }

  const animateClick = (element: HTMLElement) => {
    element.classList.add(styles.clicked);
    setTimeout(() => element.classList.remove(styles.clicked), 200);
  };

  return (
    <div className={`${styles.actionWrapper} ${className || ''}`}>
      <ActionMenu
        task={task}
        userId={userId}
        onEdit={onEdit}
        onDelete={onDelete}
        onArchive={onArchive}
        animateClick={animateClick}
        actionMenuRef={actionMenuRef}
        actionButtonRef={actionButtonRef || (() => {})}
      />
    </div>
  );
};

export default ActionCell;
