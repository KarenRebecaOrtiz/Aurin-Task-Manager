'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  CollisionDetection,
} from '@dnd-kit/core';
import { useAuth } from '@/contexts/AuthContext';
import { useUserDataStore } from '@/stores/userDataStore';
import { KanbanSkeletonLoader, EmptyTableState } from '@/modules/data-views/components/shared';
import { TasksHeader } from '@/modules/data-views/components/ui/TasksHeader';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';
import { useTaskArchiving } from '@/modules/data-views/tasks/hooks/useTaskArchiving';
import { useTasksCommon } from '@/modules/data-views/tasks/hooks/useTasksCommon';
import { KANBAN_COLUMNS } from '@/modules/data-views/constants';
import { kanbanBoardVariants } from '@/modules/data-views/animations/entryAnimations';

// ✅ Importar componentes modulares
import { KanbanColumn, KanbanDragOverlay } from './components';

// ✅ Importar hooks modulares
import { useKanbanState, useKanbanDragDrop, useKanbanGrouping } from './hooks';
import { tasksTableStore } from '@/modules/data-views/tasks/stores/tasksTableStore';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import styles from './TasksKanban.module.scss';

// Kanban status columns definition
const statusColumns = KANBAN_COLUMNS;

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

type TaskView = 'table' | 'kanban';

export const cleanupTasksKanbanListeners = () => {
  // Cleanup function - no logging needed
};

interface TasksKanbanProps {
  onNewClientOpen?: () => void;
  onEditTaskOpen: (taskId: string) => void;
  onViewChange: (view: TaskView) => void;
  onDeleteTaskOpen: (taskId: string) => void;
  onArchiveTableOpen: () => void;
}

const TasksKanban: React.FC<TasksKanbanProps> = ({
  onNewClientOpen,
  onEditTaskOpen,
  onViewChange,
  onDeleteTaskOpen,
  onArchiveTableOpen,
}) => {
  // ✅ Obtener userId desde userDataStore (Single Source of Truth)
  const userId = useUserDataStore((state) => state.userData?.userId || '');
  const { isAdmin } = useAuth();

  // ✅ Datos del dataStore (como antes)
  const {
    effectiveTasks,
    effectiveClients,
    effectiveUsers,
    isLoadingTasks,
    isTouchDevice,
  } = useKanbanState();
  
  // ✅ Filtros del tasksTableStore (para consistencia con TasksTable)
  const searchQuery = useStore(tasksTableStore, useShallow((state) => state.searchQuery));
  const searchCategory = useStore(tasksTableStore, useShallow((state) => state.searchCategory));
  const priorityFilter = useStore(tasksTableStore, useShallow((state) => state.priorityFilter));
  const priorityFilters = useStore(tasksTableStore, useShallow((state) => state.priorityFilters));
  const clientFilter = useStore(tasksTableStore, useShallow((state) => state.clientFilter));
  const userFilter = useStore(tasksTableStore, useShallow((state) => state.userFilter));
  const setSearchQuery = useStore(tasksTableStore, useShallow((state) => state.setSearchQuery));
  const setSearchCategory = useStore(tasksTableStore, useShallow((state) => state.setSearchCategory));
  const setPriorityFilters = useStore(tasksTableStore, useShallow((state) => state.setPriorityFilters));

  // ✅ Hook común centralizado
  const {
    getInvolvedUserIds,
    getClientName,
    animateClick,
    normalizeStatus,
  } = useTasksCommon();

  // ✅ Hook centralizado para archivado/desarchivado
  const {
    handleArchiveTask: archiveTaskCentralized,
    handleUndo: undoCentralized,
    undoStack: centralizedUndoStack,
    showUndo: centralizedShowUndo,
  } = useTaskArchiving({
    onSuccess: () => {
      // En Kanban no necesitamos actualizar filteredTasks locales
      // El dataStore ya maneja la actualización automática
    },
    onError: (error, _task, action) => {
      console.error(`Error ${action}ing task:`, error);
    },
  });

  // ✅ Hook para drag & drop
  const { sensors, activeTask, handleDragStart, handleDragEnd } = useKanbanDragDrop({
    effectiveTasks,
    statusColumns,
    normalizeStatus,
    isAdmin,
  });

  // ✅ Hook para agrupación de tareas
  const { groupedTasks } = useKanbanGrouping({
    effectiveTasks,
    effectiveClients,
    effectiveUsers,
    statusColumns,
    normalizeStatus,
    getInvolvedUserIds,
    userId,
    isAdmin,
    searchQuery,
    searchCategory,
    priorityFilter,
    priorityFilters,
    clientFilter,
    userFilter,
  });

  // Refs
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const lastOverId = useRef<string | null>(null);
  const recentlyMovedToNewContainer = useRef(false);

  /**
   * Custom collision detection strategy optimized for:
   * 1. Multiple containers (columns)
   * 2. Many items per container (up to 100+ items)
   * 3. Vertical sorting within containers
   *
   * This uses a multi-phased approach:
   * - First, check if pointer is within any droppable
   * - Then, use closest center for columns
   * - Finally, fallback to rect intersection
   */
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      // Start by finding any droppable containers intersecting with the pointer
      const pointerCollisions = pointerWithin(args);

      // Collision detection algorithms for droppable containers
      if (args.droppableContainers.length > 0) {
        // If there are pointer collisions, use the first one
        if (pointerCollisions.length > 0) {
          const firstCollision = pointerCollisions[0];

          // If the collision is with a column (not a task), use it
          if (statusColumns.some(col => col.id === firstCollision.id)) {
            return [firstCollision];
          }

          // If it's a task, return it (will be handled to find parent column)
          return pointerCollisions;
        }

        // When dragging over a large list, we want to prioritize columns
        // Use closestCenter for columns when pointer isn't directly over anything
        const centeredCollisions = closestCenter(args);

        // Filter to only include column droppables
        const columnCollisions = centeredCollisions.filter(collision =>
          statusColumns.some(col => col.id === collision.id)
        );

        if (columnCollisions.length > 0) {
          return columnCollisions;
        }

        // Fallback to closest center for all droppables
        return centeredCollisions;
      }

      // Fallback to rectangle intersection
      return rectIntersection(args);
    },
    [statusColumns]
  );

  // Cleanup all table listeners when component unmounts
  useEffect(() => {
    return () => {
      cleanupTasksKanbanListeners();
    };
  }, []);

  // ✅ CENTRALIZADO: Usar hook centralizado para archivar tareas
  const handleArchiveTask = useCallback(
    async (task: Task) => {
      if (!isAdmin) {
        console.warn('[TasksKanban] Archive intentado por usuario no admin');
        return;
      }

      try {
        await archiveTaskCentralized(task, userId, isAdmin);
      } catch (error) {
        console.error('[TasksKanban] Error archiving task:', error);
      }
    },
    [isAdmin, userId, archiveTaskCentralized]
  );

  // ✅ CENTRALIZADO: Usar hook centralizado para deshacer
  const handleUndo = useCallback(
    async (undoItem?: { task: Task; action: 'archive' | 'unarchive'; timestamp: number }) => {
      try {
        if (undoItem) {
          const mappedUndoItem = {
            task: undoItem.task,
            action: undoItem.action,
            timestamp: undoItem.timestamp,
          };
          await undoCentralized(mappedUndoItem);
        } else {
          await undoCentralized();
        }
      } catch (error) {
        console.error('[TasksKanban] Error undoing action:', error);
      }
    },
    [undoCentralized]
  );

  // ✅ Handler para clic en card
  const handleCardClick = useCallback(
    async (task: Task) => {
      try {
        const { openChatSidebar } = useSidebarStateStore.getState();
        const clientName = getClientName(task.clientId);
        openChatSidebar(task, clientName);
      } catch (error) {
        console.error('[TasksKanban] Error in onClick:', error);
      }
    },
    [getClientName]
  );

  // Loading state
  if (isLoadingTasks) {
    return (
      <div className={styles.container}>
        <style jsx>{`
          @keyframes pulse {
            0%,
            100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}</style>

        <div className={styles.header} style={{ margin: '30px 0px' }}>
          <div className={styles.searchWrapper}>
            <div className={styles.searchInput} style={{ opacity: 0.5, pointerEvents: 'none' }}>
              <div style={{ width: '100%', height: '16px', background: '#f0f0f0', borderRadius: '4px' }} />
            </div>
          </div>
          <div className={styles.filtersWrapper}>
            <div className={styles.viewButton} style={{ opacity: 0.5, pointerEvents: 'none' }}>
              <div style={{ width: '20px', height: '20px', background: '#f0f0f0', borderRadius: '4px' }} />
              <div style={{ width: '80px', height: '16px', background: '#f0f0f0', borderRadius: '4px', marginLeft: '8px' }} />
            </div>
            <div className={styles.createButton} style={{ opacity: 0.5, pointerEvents: 'none' }}>
              <div style={{ width: '16px', height: '16px', background: '#f0f0f0', borderRadius: '4px' }} />
              <div style={{ width: '100px', height: '16px', background: '#f0f0f0', borderRadius: '4px', marginLeft: '8px' }} />
            </div>
          </div>
        </div>
        <KanbanSkeletonLoader cardsPerColumn={6} />
      </div>
    );
  }

  // Empty state
  const hasAnyTasks = Object.values(groupedTasks).some((tasks) => tasks.length > 0);
  if (!hasAnyTasks && !searchQuery && !priorityFilter && !clientFilter && !userFilter) {
    return (
      <div className={styles.container}>
        <TasksHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchCategory={searchCategory}
          setSearchCategory={setSearchCategory}
          onPriorityFiltersChange={setPriorityFilters}
          currentView="kanban"
        />

        <EmptyTableState
          title="¡Comienza creando tu primera tarea!"
          description="Las tareas aparecerán aquí organizadas por estado"
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <TasksHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchCategory={searchCategory}
        setSearchCategory={setSearchCategory}
        onPriorityFiltersChange={setPriorityFilters}
        currentView="kanban"
      />

      <DndContext
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <motion.div
          className={styles.kanbanBoard}
          variants={kanbanBoardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {statusColumns.map((column) => (
            <KanbanColumn
              key={column.id}
              columnId={column.id}
              title={column.label}
              tasks={groupedTasks[column.id] || []}
              isAdmin={isAdmin}
              userId={userId}
              onEditTaskOpen={onEditTaskOpen}
              onDeleteTaskOpen={onDeleteTaskOpen}
              onArchiveTask={handleArchiveTask}
              onCardClick={handleCardClick}
              animateClick={animateClick}
              actionButtonRefs={actionButtonRefs}
              actionMenuRef={actionMenuRef}
              isTouchDevice={isTouchDevice}
              clients={effectiveClients}
              normalizeStatus={normalizeStatus}
            />
          ))}
        </motion.div>

        <DragOverlay>
          {activeTask ? (
            <KanbanDragOverlay
              task={activeTask}
              isAdmin={isAdmin}
              isTouchDevice={isTouchDevice}
              clients={effectiveClients}
              userId={userId}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Undo Notification */}
      {centralizedShowUndo && centralizedUndoStack.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#10b981',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '14px',
            fontWeight: 500,
            minWidth: '280px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                backgroundColor: 'white',
                borderRadius: '50%',
              }}
            />
            <span>
              {centralizedUndoStack[centralizedUndoStack.length - 1]?.action === 'unarchive' ? 'Tarea desarchivada' : 'Tarea archivada'}
            </span>
          </div>
          <button
            onClick={() => handleUndo(centralizedUndoStack[centralizedUndoStack.length - 1])}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            Deshacer
          </button>
        </div>
      )}
    </div>
  );
};

TasksKanban.displayName = 'TasksKanban';

export default TasksKanban;
