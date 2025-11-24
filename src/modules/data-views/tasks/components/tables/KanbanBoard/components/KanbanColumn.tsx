'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanColumnHeader } from './KanbanColumnHeader';
import { KanbanTaskCard } from './KanbanTaskCard';
import styles from './KanbanColumn.module.scss';

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

interface KanbanColumnProps {
  columnId: string;
  title: string;
  tasks: Task[];
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

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  columnId,
  title,
  tasks,
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
  const { setNodeRef } = useDroppable({ id: columnId });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.kanbanColumn} ${tasks.length === 0 ? styles.empty : ''}`}
      style={{ touchAction: 'manipulation' }}
    >
      <KanbanColumnHeader title={title} taskCount={tasks.length} status={columnId} />

      <SortableContext
        id={columnId}
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={styles.taskList}>
          {tasks.map((task, index) => (
            <KanbanTaskCard
              key={`${task.id}-${index}`}
              task={task}
              isAdmin={isAdmin}
              userId={userId}
              onEditTaskOpen={onEditTaskOpen}
              onDeleteTaskOpen={onDeleteTaskOpen}
              onArchiveTask={onArchiveTask}
              onCardClick={onCardClick}
              animateClick={animateClick}
              actionButtonRefs={actionButtonRefs}
              actionMenuRef={actionMenuRef}
              isTouchDevice={isTouchDevice}
              clients={clients}
              users={users}
              normalizeStatus={normalizeStatus}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

KanbanColumn.displayName = 'KanbanColumn';
