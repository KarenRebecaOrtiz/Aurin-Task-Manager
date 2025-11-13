'use client';

import { useSortable } from '@dnd-kit/sortable';
import Image from 'next/image';
import ActionMenu from '@/modules/data-views/components/ui/ActionMenu';
import { AvatarGroup } from '@/modules/shared/components/atoms/Avatar';
import { ClientAvatar } from '@/modules/shared/components/atoms/Avatar';
import styles from './KanbanTaskCard.module.scss';

interface Client {
  id: string;
  name: string;
  imageUrl: string;
}

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
  clients: Client[];
  users: User[];
  normalizeStatus: (status: string) => string;
}

const getStatusIcon = (status: string, normalizeStatus: (status: string) => string): string => {
  const normalizedStatus = normalizeStatus(status);
  let icon = '/timer.svg';
  if (normalizedStatus === 'En Proceso') icon = '/timer.svg';
  else if (normalizedStatus === 'Backlog') icon = '/circle-help.svg';
  else if (normalizedStatus === 'Por Iniciar') icon = '/circle.svg';
  else if (normalizedStatus === 'Cancelado') icon = '/circle-x.svg';
  else if (normalizedStatus === 'Por Finalizar') icon = '/circle-check.svg';
  else if (normalizedStatus === 'Finalizado') icon = '/check-check.svg';
  return icon;
};

const getPriorityIcon = (priority: string): string => {
  if (priority === 'Alta') return '/arrow-up.svg';
  if (priority === 'Media') return '/arrow-right.svg';
  return '/arrow-down.svg';
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
  clients,
  users,
  normalizeStatus,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !isAdmin,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    zIndex: isDragging ? 10000 : 'auto',
    boxShadow: isDragging ? '0 8px 25px rgba(0, 0, 0, 0.15)' : 'none',
    cursor: isAdmin ? 'grab' : 'pointer',
    touchAction: isAdmin ? 'none' : 'manipulation',
  };

  const client = clients.find((c) => c.id === task.clientId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isAdmin ? listeners : {})}
      className={`${styles.taskCard} ${isDragging ? styles.dragging : ''} ${isAdmin && isTouchDevice ? styles.touchDraggable : ''}`}
      onClick={() => onCardClick(task)}
    >
      <div className={styles.taskHeader}>
        <div className={styles.taskStatusAndName}>
          <div className={styles.taskNameWrapper}>
            <span className={styles.taskName}>{task.name}</span>
          </div>
          <div className={styles.taskStatus}>
            <Image
              src={getStatusIcon(task.status, normalizeStatus)}
              alt={normalizeStatus(task.status)}
              width={16}
              height={16}
              style={{ opacity: 0.7 }}
            />
            <span className={styles[`status-${normalizeStatus(task.status).replace(/\s/g, '-')}`]}>
              {normalizeStatus(task.status)}
            </span>
          </div>
        </div>
        {(isAdmin || task.CreatedBy === userId) && (
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
        )}
      </div>

      {isAdmin && isTouchDevice && (
        <div className={styles.touchDragIndicator}>
          <span>👆 Arrastra para mover</span>
        </div>
      )}

      <div className={styles.taskDetails}>
        <div className={styles.taskDetailsRow}>
          <div className={styles.taskDetailsLeft}>
            <div className={styles.clientInfo}>
              {client ? (
                <ClientAvatar client={client} size={24} />
              ) : (
                <span className={styles.noClient}>Sin cuenta</span>
              )}
            </div>
            <div className={styles.priorityWrapper}>
              <Image
                src={getPriorityIcon(task.priority)}
                alt={task.priority}
                width={16}
                height={16}
              />
              <span className={styles[`priority-${task.priority}`]}>{task.priority}</span>
            </div>
          </div>
        </div>
        <AvatarGroup
          assignedUserIds={task.AssignedTo}
          leadedByUserIds={task.LeadedBy}
          users={users}
          currentUserId={userId}
          maxDisplay={5}
        />
      </div>
    </div>
  );
};

KanbanTaskCard.displayName = 'KanbanTaskCard';
