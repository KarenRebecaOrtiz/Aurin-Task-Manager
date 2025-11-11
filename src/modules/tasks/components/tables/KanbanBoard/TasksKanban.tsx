'use client';

import { useEffect, useRef, useMemo, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { gsap } from 'gsap';
import { DndContext, DragOverlay, closestCenter, useDroppable, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { db } from '@/lib/firebase';
import ActionMenu from '../../ui/ActionMenu';
import styles from './TasksKanban.module.scss';
import avatarStyles from '@/modules/shared/components/ui/Table/AvatarGroup.module.scss';

import { useAuth } from '@/contexts/AuthContext';
import SkeletonLoader from '@/components/SkeletonLoader';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { tasksKanbanStore } from '@/stores/tasksKanbanStore';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';
import { useDataStore } from '@/stores/dataStore';
import { useSensors, useSensor, PointerSensor, TouchSensor } from '@dnd-kit/core';
import { useTaskArchiving } from '../../../hooks/useTaskArchiving';
import { useTasksCommon } from '../../../hooks/useTasksCommon';

// Kanban status columns definition
const statusColumns = [
  { id: 'por-iniciar', label: 'Por Iniciar' },
  { id: 'en-proceso', label: 'En Proceso' },
  { id: 'backlog', label: 'Backlog' },
  { id: 'por-finalizar', label: 'Por Finalizar' },
  { id: 'finalizado', label: 'Finalizado' },
  { id: 'cancelado', label: 'Cancelado' },
];


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

interface AvatarGroupProps {
  assignedUserIds: string[];
  leadedByUserIds?: string[];
  users: User[];
  currentUserId: string;
}

const AvatarGroup: React.FC<AvatarGroupProps> = ({ assignedUserIds, leadedByUserIds = [], users, currentUserId }) => {
  const avatars = useMemo(() => {
    if (!Array.isArray(users)) {
      console.warn('[AvatarGroup] Users prop is not an array:', users);
      return [];
    }
    const matchedUsers = users.filter((user) => assignedUserIds.includes(user.id) || leadedByUserIds.includes(user.id)).slice(0, 5);
    return matchedUsers.sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return 0;
    });
  }, [assignedUserIds, leadedByUserIds, users, currentUserId]);

  return (
    <div className={avatarStyles.avatarGroup}>
      {avatars.length > 0 ? (
        avatars.map((user) => (
          <div key={user.id} className={avatarStyles.avatar}>
            <span className={avatarStyles.avatarName}>{user.fullName}</span>
            <Image
              src={user.imageUrl || '/empty-image.png'}
              alt={`${user.fullName}'s avatar`}
              width={24}
              height={24}
              className={avatarStyles.avatarImage}
              onError={(e) => {
                e.currentTarget.src = '/empty-image.png';
              }}
            />
          </div>
        ))
      ) : (
        <span className={styles.noAssigned}>No asignados</span>
      )}
    </div>
  );
};

interface TasksKanbanProps {
  onNewTaskOpen: () => void;
  onEditTaskOpen: (taskId: string) => void;
  onViewChange: (view: TaskView) => void;
  onDeleteTaskOpen: (taskId: string) => void;
  onArchiveTableOpen: () => void;
}

interface SortableItemProps {
  id: string;
  task: Task;
  isAdmin: boolean;
  userId: string;
  onEditTaskOpen: (taskId: string) => void;
  onDeleteTaskOpen: (taskId: string) => void;
  onArchiveTask: (task: Task) => Promise<void>;
  animateClick: (element: HTMLElement) => void;
  actionButtonRefs: React.MutableRefObject<Map<string, HTMLButtonElement>>;
  actionMenuRef: React.RefObject<HTMLDivElement>;
  isTouchDevice: boolean;
  clients: Client[];
  users: User[];
  normalizeStatus: (status: string) => string;
}

const SortableItem: React.FC<SortableItemProps> = ({
  id,
  task,
  isAdmin,
  userId,
  onEditTaskOpen,
  onDeleteTaskOpen,
  onArchiveTask,
  animateClick,
  actionButtonRefs,
  actionMenuRef,
  isTouchDevice,
  clients,
  users,
  normalizeStatus,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !isAdmin // 🔒 Deshabilita drag completamente para no-admins
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    zIndex: isDragging ? 10000 : 'auto',
    boxShadow: isDragging ? '0 8px 25px rgba(0, 0, 0, 0.15)' : 'none',
    cursor: isAdmin ? 'grab' : 'pointer',
    touchAction: isAdmin ? 'none' : 'manipulation',
  };

  const getStatusIcon = (status: string): string => {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isAdmin ? listeners : {})} // 🔒 Solo aplicar listeners si es admin
      className={`${styles.taskCard} ${isDragging ? styles.dragging : ''} ${isAdmin && isTouchDevice ? styles.touchDraggable : ''}`}
      onClick={async () => {
        
        try {
          // Notification system removed - using NodeMailer instead
          
          // Usar directamente el store en lugar de props para evitar re-renders
          const { openChatSidebar } = useSidebarStateStore.getState();
          
          // Buscar el nombre del cliente
          const clientName = clients.find((c) => c.id === task.clientId)?.name || 'Sin cuenta';
          
          // Abrir el sidebar inmediatamente (red dot ya desapareció)
          openChatSidebar(task, clientName);
        } catch (error) {
          console.error('[TasksKanban] Error in onClick:', error);
        }
      }}
    >
      <div className={styles.taskHeader}>
        <div className={styles.taskStatusAndName}>
        <div className={styles.taskNameWrapper}>
        <span className={styles.taskName}>{task.name}</span>
          {/* Notification system removed - using NodeMailer instead */}
          </div>
          <div className={styles.taskStatus}>
            <Image
              src={getStatusIcon(task.status)}
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
            onEdit={() => {
              onEditTaskOpen(task.id);
              // Debug logging disabled to reduce console spam
            }}
            onDelete={() => {
              onDeleteTaskOpen(task.id);
              // Debug logging disabled to reduce console spam
            }}
            onArchive={async () => {
              try {
                // Usar la función directamente del prop
                await onArchiveTask(task);
                // Debug logging disabled to reduce console spam
              } catch (error) {
                console.error('[TasksKanban] Error archiving task:', error);
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
              {clients.find((c) => c.id === task.clientId) ? (
                <Image
                  style={{ borderRadius: '999px' }}
                  src={clients.find((c) => c.id === task.clientId)?.imageUrl || '/empty-image.png'}
                  alt={clients.find((c) => c.id === task.clientId)?.name || 'Client Image'}
                  width={24}
                  height={24}
                  className={styles.clientImage}
                  onError={(e) => {
                    e.currentTarget.src = '/empty-image.png';
                  }}
                />
              ) : (
                <span className={styles.noClient}>Sin cuenta</span>
              )}
            </div>
            <div className={styles.priorityWrapper}>
              <Image
                src={
                  task.priority === 'Alta'
                    ? '/arrow-up.svg'
                    : task.priority === 'Media'
                    ? '/arrow-right.svg'
                    : '/arrow-down.svg'
                }
                alt={task.priority}
                width={16}
                height={16}
              />
              <span className={styles[`priority-${task.priority}`]}>{task.priority}</span>
            </div>
          </div>
        </div>
        <AvatarGroup assignedUserIds={task.AssignedTo} leadedByUserIds={task.LeadedBy} users={users} currentUserId={userId} />
      </div>
    </div>
  );
};

const DroppableColumn: React.FC<{ id: string; children: React.ReactNode; className?: string }> = ({ id, children, className }) => {
  const { setNodeRef } = useDroppable({ id });
  
  return (
    <div 
      ref={setNodeRef} 
      className={className}
      style={{ touchAction: 'manipulation' }}
    >
      {children}
    </div>
  );
};

// Type for Firestore timestamp


// Type guard for Firestore timestamp




interface TasksKanbanHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onViewChange: (view: TaskView) => void;
  onArchiveTableOpen: () => void;
  onNewTaskOpen: () => void;
  priorityFilter: string;
  clientFilter: string;
  userFilter: string;
  clients: Client[];
  users: User[];
  userId: string;
  isAdmin: boolean;
  isPriorityDropdownOpen: boolean;
  isClientDropdownOpen: boolean;
  isUserDropdownOpen: boolean;
  setIsPriorityDropdownOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setIsClientDropdownOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  setIsUserDropdownOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  priorityDropdownRef: React.RefObject<HTMLDivElement>;
  clientDropdownRef: React.RefObject<HTMLDivElement>;
  userDropdownRef: React.RefObject<HTMLDivElement>;
  handlePrioritySelect: (priority: string, e: React.MouseEvent<HTMLDivElement>) => void;
  handleClientSelect: (clientId: string, e: React.MouseEvent<HTMLDivElement>) => void;
  animateClick: (element: HTMLElement) => void;
  handleUserFilter: (id: string) => void;
}

const TasksKanbanHeader: React.FC<TasksKanbanHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  onViewChange,
  onArchiveTableOpen,
  onNewTaskOpen,
  priorityFilter,
  clientFilter,
  userFilter,
  clients,
  users,
  userId,
  isAdmin,
  isPriorityDropdownOpen,
  isClientDropdownOpen,
  isUserDropdownOpen,
  setIsPriorityDropdownOpen,
  setIsClientDropdownOpen,
  setIsUserDropdownOpen,
  priorityDropdownRef,
  clientDropdownRef,
  userDropdownRef,
  handlePrioritySelect,
  handleClientSelect,
  animateClick,
  handleUserFilter,
}) => {
  return (
    <div className={styles.header} style={{ margin: '20px 0px' }}>
      <div className={styles.searchWrapper}>
        <input
          type="text"
          placeholder="Buscar Tareas"
          value={searchQuery}
          onChange={(e) => {
            const newValue = e.target.value;
            setSearchQuery(newValue);

            const searchInput = e.currentTarget;
            gsap.to(searchInput, {
              scale: 1.02,
              duration: 0.2,
              ease: 'power2.out',
              yoyo: true,
              repeat: 1,
            });
          }}
          className={styles.searchInput}
          aria-label="Buscar tareas"
        />
      </div>

      <div className={styles.filtersWrapper}>
        <div className={styles.buttonWithTooltip}>
          <button
            className={styles.viewButton}
            onClick={(e) => {
              animateClick(e.currentTarget);
              onViewChange('table');
            }}
          >
            <Image
              src="/table.svg"
              alt="table"
              draggable="false"
              width={20}
              height={20}
              style={{
                marginLeft: '5px',
                transition: 'transform 0.3s ease, filter 0.3s ease',
                filter:
                  'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.filter =
                  'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.81)) drop-shadow(0 8px 25px rgba(0, 0, 0, 0.93))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.filter =
                  'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))';
              }}
            />
          </button>
          <span className={styles.tooltip}>Vista Tabla</span>
        </div>
        <div className={styles.buttonWithTooltip}>
          <button
            className={styles.viewButton}
            onClick={(e) => {
              animateClick(e.currentTarget);
              onArchiveTableOpen();
            }}
          >
            <Image
              src="/archive.svg"
              draggable="false"
              alt="archivo"
              width={20}
              height={20}
              style={{
                marginLeft: '5px',
                transition: 'transform 0.3s ease, filter 0.3s ease',
                filter:
                  'drop-shadow(0 4px 8px rgba(0, 0, 0, 0)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0))',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.filter =
                  'drop-shadow(0 6px 12px rgba(0, 0, 0, 0)) drop-shadow(0 8px 25px rgba(0, 0, 0, 0))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.filter =
                  'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.08)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))';
              }}
            />
          </button>
          <span className={styles.tooltip}>Archivo</span>
        </div>
        <div className={styles.buttonWithTooltip}>
          <div className={styles.filter}>
            <div className={styles.dropdownContainer} ref={priorityDropdownRef}>
              <div
                className={styles.dropdownTrigger}
                onClick={(e) => {
                  animateClick(e.currentTarget);
                  setIsPriorityDropdownOpen((prev: boolean) => {
                    if (!prev) {
                      setIsClientDropdownOpen(false);
                      setIsUserDropdownOpen(false);
                    }
                    return !prev;
                  });
                }}
              >
                <Image className="filterIcon" src="/filter.svg" alt="Priority" width={12} height={12} />
                <span>{priorityFilter || 'Prioridad'}</span>
              </div>
              {isPriorityDropdownOpen && (
                <AnimatePresence>
                  <motion.div 
                    className={styles.dropdownItems}
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {['Alta', 'Media', 'Baja', ''].map((priority, index) => (
                      <motion.div
                      key={priority || 'all'}
                      className={styles.dropdownItem}
                      onClick={(e) => handlePrioritySelect(priority, e)}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      {priority || 'Todos'}
                      </motion.div>
                  ))}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
          <span className={styles.tooltip}>Filtrar por Prioridad</span>
        </div>
        <div className={styles.buttonWithTooltip}>
          <div className={styles.filter}>
            <div className={styles.dropdownContainer} ref={clientDropdownRef}>
              <div
                className={styles.dropdownTrigger}
                onClick={(e) => {
                  animateClick(e.currentTarget);
                  setIsClientDropdownOpen((prev) => {
                    if (!prev) {
                      setIsPriorityDropdownOpen(false);
                      setIsUserDropdownOpen(false);
                    }
                    return !prev;
                  });
                }}
              >
                <Image className="filterIcon" src="/filter.svg" alt="Client" width={12} height={12} />
                <span>{clients.find((c) => c.id === clientFilter)?.name || 'Cuenta'}</span>
              </div>
              {isClientDropdownOpen && (
                <AnimatePresence>
                  <motion.div 
                    className={styles.dropdownItems}
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {[{ id: '', name: 'Todos' }, ...clients].map((client, index) => (
                      <motion.div
                      key={client.id || 'all'}
                      className={styles.dropdownItem}
                      onClick={(e) => handleClientSelect(client.id, e)}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      {client.name}
                      </motion.div>
                  ))}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
          <span className={styles.tooltip}>Filtrar por Cuenta</span>
        </div>
        {isAdmin && (
          <>
            <div className={styles.buttonWithTooltip}>
              <div className={styles.filter}>
                <div className={styles.dropdownContainer} ref={userDropdownRef}>
                  <div
                    className={styles.dropdownTrigger}
                    onClick={(e) => {
                      animateClick(e.currentTarget);
                      setIsUserDropdownOpen((prev) => {
                        if (!prev) {
                          setIsPriorityDropdownOpen(false);
                          setIsClientDropdownOpen(false);
                        }
                        return !prev;
                      });
                    }}
                  >
                    <Image className="filterIcon" src="/filter.svg" alt="User" width={12} height={12} />
                    <span>
                      {userFilter === ''
                        ? 'Todos'
                        : userFilter === 'me'
                        ? 'Mis tareas'
                        : users.find((u) => u.id === userFilter)?.fullName || 'Usuario'}
                    </span>
                  </div>
                  {isUserDropdownOpen && (
                    <AnimatePresence>
                      <motion.div 
                        className={styles.dropdownItems}
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      >
                        <motion.div
                          className={styles.dropdownItem}
                          style={{ fontWeight: userFilter === '' ? 700 : 400 }}
                          onClick={() => handleUserFilter('')}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: 0 * 0.05 }}
                        >
                          Todos
                        </motion.div>
                        <motion.div
                          className={styles.dropdownItem}
                          style={{ fontWeight: userFilter === 'me' ? 700 : 400 }}
                          onClick={() => handleUserFilter('me')}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: 1 * 0.05 }}
                        >
                          Mis tareas
                        </motion.div>
                        {users
                          .filter((u) => u.id !== userId)
                          .map((u, index) => (
                            <motion.div
                              key={u.id}
                              className={styles.dropdownItem}
                              style={{ fontWeight: userFilter === u.id ? 700 : 400 }}
                              onClick={() => handleUserFilter(u.id)}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2, delay: (index + 2) * 0.05 }}
                            >
                              {u.fullName}
                            </motion.div>
                          ))}
                      </motion.div>
                    </AnimatePresence>
                  )}
                </div>
              </div>
              <span className={styles.tooltip}>Filtrar por Usuario</span>
            </div>
            <div className={styles.buttonWithTooltip}>
              <button
                className={styles.createButton}
                onClick={(e) => {
                  animateClick(e.currentTarget);
                  onNewTaskOpen();
                }}
              >
                <Image src="/square-dashed-mouse-pointer.svg" alt="New Task" width={16} height={16} />
                Crear Tarea
              </button>
              <span className={styles.tooltip}>Crear Nueva Tarea</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const TasksKanban: React.FC<TasksKanbanProps> = ({
  onNewTaskOpen,
  onEditTaskOpen,
  onViewChange,
  onDeleteTaskOpen,
  onArchiveTableOpen,
}) => {
  const { user } = useUser();
  const { isAdmin } = useAuth();

  // ✅ Hook centralizado para archivado/desarchivado
  const {
    handleArchiveTask: archiveTaskCentralized,
    handleUndo: undoCentralized,
    undoStack: centralizedUndoStack,
    showUndo: centralizedShowUndo
  } = useTaskArchiving({
    onSuccess: () => {
      // En Kanban no necesitamos actualizar filteredTasks locales
      // El dataStore ya maneja la actualización automática
    },
    onError: (error, _task, action) => {
      // eslint-disable-next-line no-console
      console.error(`Error ${action}ing task:`, error);
    }
  });

  // ✅ Hook común centralizado
  const {
    tasks: commonTasks,
    clients: commonClients,
    users: commonUsers,
    userId: commonUserId,
    isAdmin: commonIsAdmin,
    applyTaskFilters,
    getInvolvedUserIds,
    canUserViewTask,
    getClientName,
    animateClick,
    createPrioritySelectHandler,
    createClientSelectHandler,
    createUserFilterHandler,
    normalizeStatus,
  } = useTasksCommon();

  // Usa useDataStore/useShallow para obtener tasks, users, clients, etc. directamente
  const tasks = useDataStore(useShallow(state => state.tasks));
  const clients = useDataStore(useShallow(state => state.clients));
  const users = useDataStore(useShallow(state => state.users));
  const isLoadingTasks = useDataStore(useShallow(state => state.isLoadingTasks));
  // const isLoadingClients = useDataStore(useShallow(state => state.isLoadingClients));
  // const isLoadingUsers = useDataStore(useShallow(state => state.isLoadingUsers));

  // ✅ Usar datos externos solo si están disponibles, de lo contrario usar dataStore
  const effectiveTasks = tasks;
  const effectiveClients = clients;
  const effectiveUsers = users;

  // ✅ ELIMINADO: getInvolvedUserIds ahora viene del hook centralizado useTasksCommon

  // Helper function to normalize status values with memoization
  // ✅ ELIMINADO: normalizeStatus ahora viene del hook centralizado useTasksCommon



  // Notification system removed - using NodeMailer instead

  // Configurar sensores con restricciones para evitar drag accidental
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms delay before drag starts
        tolerance: 5, // 5px tolerance for finger movement during delay
      },
    })
  );

  // Optimizar selectores de Zustand para evitar re-renders innecesarios
  const {
    // Estado
    searchQuery,
    priorityFilter,
    clientFilter,
    userFilter,
    isPriorityDropdownOpen,
    isClientDropdownOpen,
    isUserDropdownOpen,
    isTouchDevice,
    activeTask,
    // Acciones
    setSearchQuery,
    setPriorityFilter,
    setClientFilter,
    setIsPriorityDropdownOpen,
    setIsClientDropdownOpen,
    setIsUserDropdownOpen,
    setIsTouchDevice,
    setActiveTask,
  } = useStore(
    tasksKanbanStore,
    useShallow((state) => ({
      // Estado
      searchQuery: state.searchQuery,
      priorityFilter: state.priorityFilter,
      clientFilter: state.clientFilter,
      userFilter: state.userFilter,
      isPriorityDropdownOpen: state.isPriorityDropdownOpen,
      isClientDropdownOpen: state.isClientDropdownOpen,
      isUserDropdownOpen: state.isUserDropdownOpen,
      isTouchDevice: state.isTouchDevice,
      activeTask: state.activeTask,
      // Acciones
      setSearchQuery: state.setSearchQuery,
      setPriorityFilter: state.setPriorityFilter,
      setClientFilter: state.setClientFilter,
      setIsPriorityDropdownOpen: state.setIsPriorityDropdownOpen,
      setIsClientDropdownOpen: state.setIsClientDropdownOpen,
      setIsUserDropdownOpen: state.setIsUserDropdownOpen,
      setIsTouchDevice: state.setIsTouchDevice,
      setActiveTask: state.setActiveTask,
    }))
  );

  // Add this function to handle user filter
  const handleUserFilter = useCallback((id: string) => {
    const { setUserFilter } = tasksKanbanStore.getState();
    setUserFilter(id);
    setIsUserDropdownOpen(false);
  }, [setIsUserDropdownOpen]);

  const containerRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const userId = useMemo(() => user?.id || '', [user]);

  // Only log significant changes to reduce console noise
  useEffect(() => {
    // Silent monitoring - no logging needed
  }, [effectiveTasks]);

  useEffect(() => {
    const checkTouchDevice = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsTouchDevice(isTouch);
    };

    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);

    return () => {
      window.removeEventListener('resize', checkTouchDevice);
    };
  }, [setIsTouchDevice]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    gsap.fromTo(
      container,
      { opacity: 0, y: 50, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power2.out' }
    );

    return () => {
      gsap.to(container, {
        opacity: 0,
        y: -50,
        scale: 0.95,
        duration: 0.3,
        ease: 'power2.in',
      });
    };
  }, []);

  // Setup de tasks con actualizaciones en tiempo real
  useEffect(() => {
    if (!user?.id) return;

    // No establecer onSnapshot aquí - usar siempre datos del store de Zustand
    if (effectiveTasks.length > 0) {
      // No necesitamos setIsLoadingTasks ya que dataStore maneja esto
    }
  }, [user?.id, effectiveTasks]);

  // ✅ ELIMINADO: Clients ya manejados centralmente por dataStore
  // No necesitamos setup duplicado de clientes aquí

  // Users are now managed centrally by useSharedTasksState
  // No independent user fetching needed

  // Cleanup all table listeners when component unmounts
  useEffect(() => {
    return () => {
  
      cleanupTasksKanbanListeners();
    };
  }, []);

  // ✅ ELIMINADO: animateClick ahora viene del hook centralizado useTasksCommon

  // ✅ CENTRALIZADAS: Funciones de dropdown usando hook centralizado
  const handlePrioritySelect = createPrioritySelectHandler(setPriorityFilter, setIsPriorityDropdownOpen);
  const handleClientSelect = createClientSelectHandler(setClientFilter, setIsClientDropdownOpen);

  // Group tasks by status - essential for Kanban functionality
  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: Task[] } = {};
    
    // Initialize empty arrays for all columns
    statusColumns.forEach(column => {
      groups[column.id] = [];
    });
    
    // Only process non-archived tasks with permission filtering
    effectiveTasks
      .filter(task => !task.archived)
      .filter(task => {
        // 🔒 FILTRO DE PERMISOS: Solo admins o usuarios involucrados pueden ver la tarea
        const canViewTask = isAdmin || getInvolvedUserIds(task).includes(userId);
        
        if (!canViewTask) {
          // Silent permission filtering - no logging needed
        }
        
        return canViewTask;
      })
      .forEach(task => {
      const normalizedStatus = normalizeStatus(task.status);
      const columnId = normalizedStatus.toLowerCase().replace(/\s+/g, '-');
      
      // Map status to column IDs
      const statusToColumnMap: { [key: string]: string } = {
        'por-iniciar': 'por-iniciar',
        'en-proceso': 'en-proceso',
        'backlog': 'backlog',
          'por-finalizar': 'por-finalizar',
          'finalizado': 'finalizado',
        'cancelado': 'cancelado'
      };
      
      const targetColumn = statusToColumnMap[columnId] || 'por-iniciar';
        
        // Apply filters exactly like TasksTable
        const matchesSearch = !searchQuery || 
          task.name.toLowerCase().includes(searchQuery.toLowerCase());
          
        const matchesPriority = !priorityFilter || task.priority === priorityFilter;
        
        const matchesClient = !clientFilter || task.clientId === clientFilter;
        
        let matchesUser = true;
        if (userFilter === 'me') {
          const involvedUserIds = getInvolvedUserIds(task);
          matchesUser = involvedUserIds.includes(userId);
        } else if (userFilter && userFilter !== 'me') {
          const involvedUserIds = getInvolvedUserIds(task);
          matchesUser = involvedUserIds.includes(userFilter);
        }

        if (matchesSearch && matchesPriority && matchesClient && matchesUser) {
    if (groups[targetColumn]) {
      groups[targetColumn].push(task);
        }
      }
    });
    
    // Sort tasks within each column by lastActivity
    Object.keys(groups).forEach(columnId => {
      groups[columnId].sort((a, b) => {
        const dateA = new Date(a.lastActivity || a.createdAt).getTime();
        const dateB = new Date(b.lastActivity || b.createdAt).getTime();
        return dateB - dateA; // Most recent first
      });
    });
    
    return groups;
  }, [
    effectiveTasks, 
    searchQuery, 
    priorityFilter, 
    clientFilter, 
    userFilter, 
    userId, 
    getInvolvedUserIds, 
    normalizeStatus,
    isAdmin
  ]);

  // Drag and drop handlers - essential for Kanban functionality
  const handleDragStart = (event: DragStartEvent) => {
    // 🔒 Bloquear drag para usuarios no admin
    if (!isAdmin) {
      return;
    }

    const taskId = event.active.id;
    const task = effectiveTasks.find(t => t.id === taskId);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    
    if (!over || !isAdmin) {
      return;
    }

    const taskId = String(active.id);
    let targetColumnId = over.id as string;
    
    // Fix: Si over.id NO es una columna válida, buscar la columna padre
    if (!statusColumns.some(col => col.id === targetColumnId)) {
      // Si over es una tarea, usar la columna de esa tarea
      const overTask = effectiveTasks.find(t => t.id === targetColumnId);
      if (overTask) {
        const normalized = normalizeStatus(overTask.status);
        targetColumnId = normalized.toLowerCase().replace(/\s+/g, '-');
      } else {
        return;
      }
    }

    // Verificar que tenemos una columna válida
    if (!statusColumns.some(col => col.id === targetColumnId)) {
      return;
    }
    
    // Map column IDs back to proper status names
    const columnToStatusMap: { [key: string]: string } = {
      'por-iniciar': 'Por Iniciar',
      'en-proceso': 'En Proceso',
      'backlog': 'Backlog',
      'por-finalizar': 'Por Finalizar',
      'finalizado': 'Finalizado',
      'cancelado': 'Cancelado'
    };
    
    const newStatusName = columnToStatusMap[targetColumnId];
    
    if (!newStatusName) {
      return;
    }

    try {
      const task = effectiveTasks.find(t => t.id === taskId);
      if (task && task.status !== newStatusName) {
        // Importar funciones de Firestore
        const { updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
        const { updateTaskActivity } = await import('@/lib/taskUtils');
        
        // Actualizar el estado en Firestore
        await updateDoc(doc(db, 'tasks', taskId), {
          status: newStatusName,
          lastActivity: serverTimestamp(),
        });
        
        // Fix 2: Actualización optimista en dataStore para UI inmediata
        const { updateTask } = useDataStore.getState();
        updateTask(taskId, {
          status: newStatusName,
          lastActivity: new Date().toISOString(),
        });
        
        // Actualizar la actividad de la tarea
        await updateTaskActivity(taskId, 'status_change');
      }
    } catch (error) {
      console.error('[TasksKanban] Error updating task status:', error);
    }
  };

  // ✅ CENTRALIZADO: Usar hook centralizado para archivar tareas
  const handleArchiveTask = useCallback(async (task: Task) => {
    if (!isAdmin) {
      // eslint-disable-next-line no-console
      console.warn('[TasksKanban] Archive intentado por usuario no admin');
      return;
    }
    
    try {
      await archiveTaskCentralized(task, userId, isAdmin);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[TasksKanban] Error archiving task:', error);
    }
  }, [isAdmin, userId, archiveTaskCentralized]);

  // ✅ CENTRALIZADO: Usar hook centralizado para deshacer
  const handleUndo = useCallback(async (undoItem?: {task: Task, action: 'archive' | 'unarchive', timestamp: number}) => {
    try {
      // Usar la función centralizada de undo
      if (undoItem) {
        const mappedUndoItem = {
          task: undoItem.task,
          action: undoItem.action,
          timestamp: undoItem.timestamp
        };
        await undoCentralized(mappedUndoItem);
      } else {
        await undoCentralized();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[TasksKanban] Error undoing action:', error);
    }
  }, [undoCentralized]);

  if (isLoadingTasks) {
    return (
      <div className={styles.container}>
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>

        <div className={styles.header} style={{margin:'30px 0px'}}>
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
        <SkeletonLoader type="kanban" rows={6} />
      </div>
    );
  }

  // ✅ NUEVO: Mostrar estado vacío elegante cuando no hay tareas
  const hasAnyTasks = Object.values(groupedTasks).some(tasks => tasks.length > 0);
  if (!hasAnyTasks && !searchQuery && !priorityFilter && !clientFilter && !userFilter) {
    return (
      <div className={styles.container}>
        <TasksKanbanHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onViewChange={onViewChange}
          onArchiveTableOpen={onArchiveTableOpen}
          onNewTaskOpen={onNewTaskOpen}
          priorityFilter={priorityFilter}
          clientFilter={clientFilter}
          userFilter={userFilter}
          clients={effectiveClients}
          users={effectiveUsers}
          userId={userId}
          isAdmin={isAdmin}
          isPriorityDropdownOpen={isPriorityDropdownOpen}
          isClientDropdownOpen={isClientDropdownOpen}
          isUserDropdownOpen={isUserDropdownOpen}
          setIsPriorityDropdownOpen={setIsPriorityDropdownOpen}
          setIsClientDropdownOpen={setIsClientDropdownOpen}
          setIsUserDropdownOpen={setIsUserDropdownOpen}
          priorityDropdownRef={priorityDropdownRef}
          clientDropdownRef={clientDropdownRef}
          userDropdownRef={userDropdownRef}
          handlePrioritySelect={handlePrioritySelect}
          handleClientSelect={handleClientSelect}
          handleUserFilter={handleUserFilter}
          animateClick={animateClick}
        />
        
        <SkeletonLoader 
          type="kanban" 
          isEmpty={true}
          emptyMessage="¡Comienza creando tu primera tarea!"
        />
      </div>
    );
  }

  return (
    <div className={styles.container} ref={containerRef}>

      <TasksKanbanHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onViewChange={onViewChange}
        onArchiveTableOpen={onArchiveTableOpen}
        onNewTaskOpen={onNewTaskOpen}
        priorityFilter={priorityFilter}
        clientFilter={clientFilter}
        userFilter={userFilter}
        clients={effectiveClients}
        users={effectiveUsers}
        userId={userId}
        isAdmin={isAdmin}
        isPriorityDropdownOpen={isPriorityDropdownOpen}
        isClientDropdownOpen={isClientDropdownOpen}
        isUserDropdownOpen={isUserDropdownOpen}
        setIsPriorityDropdownOpen={setIsPriorityDropdownOpen}
        setIsClientDropdownOpen={setIsClientDropdownOpen}
        setIsUserDropdownOpen={setIsUserDropdownOpen}
        priorityDropdownRef={priorityDropdownRef}
        clientDropdownRef={clientDropdownRef}
        userDropdownRef={userDropdownRef}
        handlePrioritySelect={handlePrioritySelect}
        handleClientSelect={handleClientSelect}
        handleUserFilter={handleUserFilter}
        animateClick={animateClick}
      />
      <DndContext
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        sensors={sensors}
      >
        <div className={styles.kanbanBoard}>
          {statusColumns.map((column) => (
            <DroppableColumn
              key={column.id}
              id={column.id}
              className={`${styles.kanbanColumn} ${groupedTasks[column.id]?.length ? '' : styles.empty}`}
            >
              <div className={styles.columnHeader}>
                <h2 className={styles.columnTitle}>{column.label}</h2>
                <span className={styles.taskCount}>{groupedTasks[column.id]?.length || 0}</span>
              </div>
              <SortableContext
                id={column.id}
                items={groupedTasks[column.id]?.map((task) => task.id) || []}
                strategy={verticalListSortingStrategy}
              >
                <div className={styles.taskList}>
                  {groupedTasks[column.id]?.map((task, index) => (
                    <SortableItem
                      key={`${task.id}-${index}`}
                      id={task.id}
                      task={task}
                      isAdmin={isAdmin}
                      userId={userId}
                      onEditTaskOpen={onEditTaskOpen}
                      onDeleteTaskOpen={onDeleteTaskOpen}
                      onArchiveTask={handleArchiveTask}
                      animateClick={animateClick}
                      actionButtonRefs={actionButtonRefs}
                      actionMenuRef={actionMenuRef}
                      isTouchDevice={isTouchDevice}
                      clients={effectiveClients}
                      users={effectiveUsers}
                      normalizeStatus={normalizeStatus}
                    />
                  ))}
                </div>
              </SortableContext>
            </DroppableColumn>
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div
              className={`${styles.taskCard} ${styles.dragging}`}
              style={{
                zIndex: 10000,
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                cursor: 'grabbing',
              }}
            >
              <div className={styles.taskHeader}>
                <span className={styles.taskName}>{activeTask.name}</span>
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
                      {effectiveClients.find((c) => c.id === activeTask.clientId) ? (
                        <Image
                          style={{ borderRadius: '999px' }}
                          src={effectiveClients.find((c) => c.id === activeTask.clientId)?.imageUrl || '/empty-image.png'}
                          alt={effectiveClients.find((c) => c.id === activeTask.clientId)?.name || 'Client Image'}
                          width={24}
                          height={24}
                          className={styles.clientImage}
                        />
                      ) : (
                        <span className={styles.noClient}>Sin cuenta</span>
                      )}
                    </div>
                    <div className={styles.priorityWrapper}>
                      <Image
                        src={
                          activeTask.priority === 'Alta'
                            ? '/arrow-up.svg'
                            : activeTask.priority === 'Media'
                            ? '/arrow-right.svg'
                            : '/arrow-down.svg'
                        }
                        alt={activeTask.priority}
                        width={16}
                        height={16}
                      />
                      <span className={styles[`priority-${activeTask.priority}`]}>{activeTask.priority}</span>
                    </div>
                  </div>
                </div>
                <AvatarGroup assignedUserIds={activeTask.AssignedTo} leadedByUserIds={activeTask.LeadedBy} users={effectiveUsers} currentUserId={userId} />
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      
      {/* Undo Notification */}
      <AnimatePresence>
        {centralizedShowUndo && centralizedUndoStack.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
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
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                backgroundColor: 'white',
                borderRadius: '50%',
                animation: 'pulse 2s infinite'
              }} />
              <span>
                {centralizedUndoStack[centralizedUndoStack.length - 1]?.action === 'unarchive' 
                  ? 'Tarea desarchivada' 
                  : 'Tarea archivada'}
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
                whiteSpace: 'nowrap'
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

TasksKanban.displayName = 'TasksKanban';

export default TasksKanban;