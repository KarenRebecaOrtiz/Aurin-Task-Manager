'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import {
  kanbanColumnVariants,
  kanbanCardVariants,
} from '@/modules/data-views/animations/entryAnimations';
import { KanbanColumnHeader } from './KanbanColumnHeader';
import { KanbanTaskCard } from './KanbanTaskCard';
import styles from './KanbanColumn.module.scss';

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
  normalizeStatus,
}) => {
  const { setNodeRef } = useDroppable({ id: columnId });

  return (
    <motion.div
      ref={setNodeRef}
      className={`${styles.kanbanColumn} ${tasks.length === 0 ? styles.empty : ''}`}
      style={{ touchAction: 'manipulation' }}
      variants={kanbanColumnVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <KanbanColumnHeader title={title} taskCount={tasks.length} status={columnId} />

      <SortableContext
        id={columnId}
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={styles.taskList}>
          <AnimatePresence mode="popLayout">
            {tasks.map((task, index) => (
              <motion.div
                key={task.id}
                variants={kanbanCardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                custom={index}
                layout
              >
                <KanbanTaskCard
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
                  normalizeStatus={normalizeStatus}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>
    </motion.div>
  );
};

KanbanColumn.displayName = 'KanbanColumn';
