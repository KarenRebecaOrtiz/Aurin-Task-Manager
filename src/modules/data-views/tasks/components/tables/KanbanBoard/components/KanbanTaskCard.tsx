'use client';

import { memo, useCallback, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import ActionMenu from '@/modules/data-views/components/ui/ActionMenu';
import { AvatarGroup } from '@/modules/shared/components/atoms/Avatar';
import { ClientAvatar } from '@/modules/shared/components/atoms/Avatar';
import { Badge, BadgeVariant } from '@/modules/shared/components/atoms/Badge';
import { SharedBadge } from '@/modules/shared/components/ui';
import { useClientData } from '@/hooks/useClientData';
import styles from './KanbanTaskCard.module.scss';

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
}

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
  lastActivity?: string;
  hasUnreadUpdates?: boolean;
  lastViewedBy?: { [userId: string]: string };
  archived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  shared?: boolean;
  shareToken?: string;
  commentsEnabled?: boolean;
  sharedAt?: string | null;
  sharedBy?: string;
}

interface KanbanTaskCardProps {
  task: Task;
  isAdmin: boolean;
  userId: string;
  onEditTaskOpen: (taskId: string) => void;
  onDeleteTaskOpen: (taskId: string) => void;
  onArchiveTask: (task: Task) => Promise<void>;
  onEditClient?: (clientId: string) => void;
  onCardClick: (task: Task) => void;
  animateClick: (element: HTMLElement) => void;
  actionButtonRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  actionMenuRef: React.RefObject<HTMLDivElement>;
  isTouchDevice: boolean;
  normalizeStatus: (status: string) => string;
}

const getStatusVariant = (status: string, normalizeStatus: (status: string) => string): BadgeVariant => {
  const normalizedStatus = normalizeStatus(status);
  const statusMap: { [key: string]: BadgeVariant } = {
    'Backlog': 'status-backlog',
    'Por Iniciar': 'status-todo',
    'En Proceso': 'status-in-progress',
    'Por Finalizar': 'status-in-review',
    'Finalizado': 'status-done',
    'Cancelado': 'status-archived',
  };
  return statusMap[normalizedStatus] || 'default';
};

const getPriorityVariant = (priority: string): BadgeVariant => {
  const priorityMap: { [key: string]: BadgeVariant } = {
    'Alta': 'priority-high',
    'Media': 'priority-medium',
    'Baja': 'priority-low',
  };
  return priorityMap[priority] || 'default';
};

export const KanbanTaskCard: React.FC<KanbanTaskCardProps> = memo(({
  task,
  isAdmin,
  userId,
  onEditTaskOpen,
  onDeleteTaskOpen,
  onArchiveTask,
  onEditClient,
  onCardClick,
  animateClick,
  actionButtonRefs,
  actionMenuRef,
  isTouchDevice,
  normalizeStatus,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !isAdmin,
  });

  // ✅ Use centralized clientsDataStore - O(1) access instead of O(n) array.find()
  const client = useClientData(task.clientId);

  const style = useMemo(() => ({
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    zIndex: isDragging ? 10000 : 'auto',
    boxShadow: isDragging ? '0 8px 25px rgba(0, 0, 0, 0.15)' : 'none',
    cursor: isAdmin ? 'grab' : 'pointer',
    touchAction: isAdmin ? 'none' : 'manipulation',
  }), [transform, transition, isDragging, isAdmin]);

  // Stable callback refs to avoid inline arrow functions
  const handleEdit = useCallback(() => onEditTaskOpen(task.id), [onEditTaskOpen, task.id]);
  const handleDelete = useCallback(() => onDeleteTaskOpen(task.id), [onDeleteTaskOpen, task.id]);
  const handleArchive = useCallback(async () => {
    try {
      await onArchiveTask(task);
    } catch (error) {
      console.error('[KanbanTaskCard] Error archiving task:', error);
    }
  }, [onArchiveTask, task]);
  const handleEditClient = useMemo(() => {
    return task.clientId && onEditClient ? () => onEditClient(task.clientId) : undefined;
  }, [task.clientId, onEditClient]);
  const handleActionButtonRef = useCallback((el: HTMLButtonElement | null) => {
    if (el) {
      actionButtonRefs.current.set(task.id, el);
    } else {
      actionButtonRefs.current.delete(task.id);
    }
  }, [actionButtonRefs, task.id]);
  const handleCardClick = useCallback(() => onCardClick(task), [onCardClick, task]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isAdmin ? listeners : {})}
      className={`${styles.taskCard} ${isDragging ? styles.dragging : ''} ${isAdmin && isTouchDevice ? styles.touchDraggable : ''}`}
      onClick={handleCardClick}
    >
      {/* Primera fila: Cliente + Nombre + Action Button */}
      <div className={styles.taskHeader}>
        <div className={styles.clientInfo}>
          {client ? (
            <ClientAvatar client={client} size="sm" />
          ) : (
            <div className={styles.clientPlaceholder} />
          )}
        </div>
        <div className={styles.taskNameWrapper}>
          <span className={styles.taskName}>{task.name}</span>
        </div>
        <ActionMenu
          task={task}
          userId={userId}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onArchive={handleArchive}
          onEditClient={handleEditClient}
          showPinOption={true}
          animateClick={animateClick}
          actionMenuRef={actionMenuRef}
          actionButtonRef={handleActionButtonRef}
        />
      </div>

      {/* Segunda fila: Tags de estado, prioridad y compartido */}
      <div className={styles.badgesRow}>
        <Badge variant={getStatusVariant(task.status, normalizeStatus)} size="small">
          {normalizeStatus(task.status)}
        </Badge>
        <Badge variant={getPriorityVariant(task.priority)} size="small">
          {task.priority}
        </Badge>
        {task.shared && <SharedBadge iconOnly iconSize={11} />}
      </div>

      {/* Tercera fila: Avatar Group */}
      <div className={styles.avatarRow}>
        <AvatarGroup
          assignedUserIds={task.AssignedTo}
          leadedByUserIds={task.LeadedBy}
          currentUserId={userId}
          maxAvatars={5}
        />
      </div>

      {isAdmin && isTouchDevice && (
        <div className={styles.touchDragIndicator}>
          <span>👆 Arrastra para mover</span>
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  return (
    prev.task.id === next.task.id &&
    prev.task.status === next.task.status &&
    prev.task.priority === next.task.priority &&
    prev.task.name === next.task.name &&
    prev.task.clientId === next.task.clientId &&
    prev.task.shared === next.task.shared &&
    prev.task.archived === next.task.archived &&
    prev.isAdmin === next.isAdmin &&
    prev.userId === next.userId &&
    prev.isTouchDevice === next.isTouchDevice &&
    prev.onEditTaskOpen === next.onEditTaskOpen &&
    prev.onDeleteTaskOpen === next.onDeleteTaskOpen &&
    prev.onArchiveTask === next.onArchiveTask &&
    prev.onEditClient === next.onEditClient &&
    prev.onCardClick === next.onCardClick
  );
});

KanbanTaskCard.displayName = 'KanbanTaskCard';
