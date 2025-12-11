'use client';

import Image from 'next/image';
import { AvatarGroup } from '@/modules/shared/components/atoms/Avatar';
import { ClientAvatar } from '@/modules/shared/components/atoms/Avatar';
import { useClientData } from '@/hooks/useClientData';
import styles from './KanbanDragOverlay.module.scss';

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

interface KanbanDragOverlayProps {
  task: Task;
  isAdmin: boolean;
  isTouchDevice: boolean;
  userId: string;
}

const getPriorityIcon = (priority: string): string => {
  if (priority === 'Alta') return '/arrow-up.svg';
  if (priority === 'Media') return '/arrow-right.svg';
  return '/arrow-down.svg';
};

export const KanbanDragOverlay: React.FC<KanbanDragOverlayProps> = ({
  task,
  isAdmin,
  isTouchDevice,
  userId,
}) => {
  // ✅ Use centralized clientsDataStore - O(1) access instead of O(n) array.find()
  const client = useClientData(task.clientId);

  return (
    <div
      className={`${styles.taskCard} ${styles.dragging}`}
      style={{
        zIndex: 10000,
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
        cursor: 'grabbing',
      }}
    >
      <div className={styles.taskHeader}>
        <span className={styles.taskName}>{task.name}</span>
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
                <ClientAvatar client={client} size="sm" />
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
          currentUserId={userId}
          maxAvatars={5}
        />
      </div>
    </div>
  );
};

KanbanDragOverlay.displayName = 'KanbanDragOverlay';
