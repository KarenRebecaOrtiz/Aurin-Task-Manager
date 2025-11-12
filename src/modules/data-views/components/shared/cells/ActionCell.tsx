/**
 * ActionCell Component
 * Displays action menu for task operations (edit, delete, archive)
 * Used in TasksTable and ArchiveTable
 */

import React from 'react';
import ActionMenu from '../../../components/ui/ActionMenu';
import styles from './ActionCell.module.scss';

interface Task {
  id: string;
  CreatedBy?: string;
  [key: string]: any;
}

interface ActionCellProps {
  task: Task;
  userId: string;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onArchive: () => void;
  actionButtonRef?: (el: HTMLButtonElement | null) => void;
  actionMenuOpenId: string | null;
  onActionMenuToggle: (taskId: string) => void;
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
  actionMenuOpenId,
  onActionMenuToggle,
  className,
}) => {
  // Check if user has permission to see action menu
  const shouldShowActionMenu = isAdmin || task.CreatedBy === userId;

  if (!shouldShowActionMenu) {
    return null;
  }

  return (
    <div className={`${styles.actionWrapper} ${className || ''}`}>
      <ActionMenu
        task={task}
        userId={userId}
        onEdit={onEdit}
        onDelete={onDelete}
        onArchive={onArchive}
        actionButtonRef={actionButtonRef}
        isOpen={actionMenuOpenId === task.id}
        onToggle={() => onActionMenuToggle(task.id)}
      />
    </div>
  );
};

export default ActionCell;
