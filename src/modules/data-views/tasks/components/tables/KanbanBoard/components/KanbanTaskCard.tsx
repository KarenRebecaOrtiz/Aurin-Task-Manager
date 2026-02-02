'use client';

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

export const KanbanTaskCard: React.FC<KanbanTaskCardProps> = ({
  task,
  isAdmin,
  userId,
  onEditTaskOpen,
  onDeleteTaskOpen,
  onArchiveTask,
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

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    zIndex: isDragging ? 10000 : 'auto',
    boxShadow: isDragging ? '0 8px 25px rgba(0, 0, 0, 0.15)' : 'none',
    cursor: isAdmin ? 'grab' : 'pointer',
    touchAction: isAdmin ? 'none' : 'manipulation',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isAdmin ? listeners : {})}
      className={`${styles.taskCard} ${isDragging ? styles.dragging : ''} ${isAdmin && isTouchDevice ? styles.touchDraggable : ''}`}
      onClick={() => onCardClick(task)}
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
        {/* El ActionMenu maneja internamente los permisos:
            - Usuarios involucrados pueden ver el menú y fijar
            - Solo Admin o Creator pueden editar/archivar/eliminar */}
        <ActionMenu
          task={task}
          userId={userId}
          onEdit={() => onEditTaskOpen(task.id)}
          onDelete={() => onDeleteTaskOpen(task.id)}
          onArchive={async () => {
            try {
              await onArchiveTask(task);
            } catch (error) {
              console.error('[KanbanTaskCard] Error archiving task:', error);
            }
          }}
          showPinOption={true}
          animateClick={animateClick}
          actionMenuRef={actionMenuRef}
          actionButtonRef={(el) => {
            if (el) {
              actionButtonRefs.current.set(task.id, el);
            } else {
              actionButtonRefs.current.delete(task.id);
            }
          }}
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
};

KanbanTaskCard.displayName = 'KanbanTaskCard';
