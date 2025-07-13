'use client';

import { useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, onSnapshot, query } from 'firebase/firestore';
import Image from 'next/image';
import { gsap } from 'gsap';
import { DndContext, DragOverlay, closestCenter, useSensor, useSensors, PointerSensor, TouchSensor, useDroppable, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { db } from '@/lib/firebase';
import ActionMenu from './ui/ActionMenu';
import styles from './TasksKanban.module.scss';
import avatarStyles from './ui/AvatarGroup.module.scss';
import UserSwiper from '@/components/UserSwiper';
import { useAuth } from '@/contexts/AuthContext';
import SkeletonLoader from '@/components/SkeletonLoader';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';
import NotificationDot from '@/components/ui/NotificationDot';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { tasksKanbanStore } from '@/stores/tasksKanbanStore';





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
  console.log('[TasksKanban] Cleaning up all kanban listeners');
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
  onChatSidebarOpen: (task: Task) => void;
  onMessageSidebarOpen: (user: User) => void;
  onOpenProfile: (user: { id: string; imageUrl: string }) => void;
  onViewChange: (view: TaskView) => void;
  onDeleteTaskOpen: (taskId: string) => void;
  onArchiveTableOpen: () => void;
  externalTasks?: Task[];
  externalClients?: Client[];
  externalUsers?: User[];
}

interface SortableItemProps {
  id: string;
  task: Task;
  onChatSidebarOpen: (task: Task) => void;
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
  getUnreadCount: (task: Task) => number;
  markAsViewed: (taskId: string) => Promise<void>;
  normalizeStatus: (status: string) => string;
}

const SortableItem: React.FC<SortableItemProps> = ({
  id,
  task,
  onChatSidebarOpen,
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
  getUnreadCount,
  markAsViewed,
  normalizeStatus,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

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
      {...listeners}
      className={`${styles.taskCard} ${isDragging ? styles.dragging : ''} ${isAdmin && isTouchDevice ? styles.touchDraggable : ''}`}
      onClick={async () => {
        // Marcar la tarea como vista usando el nuevo sistema
        await markAsViewed(task.id);
        
        onChatSidebarOpen(task);
        console.log('[TasksKanban] Task card clicked, opening chat for task:', task.id);
      }}
    >
      <div className={styles.taskHeader}>
        <div className={styles.taskStatusAndName}>
        <div className={styles.taskNameWrapper}>
        <span className={styles.taskName}>{task.name}</span>
          {(() => {
            const updateCount = getUnreadCount(task);
            console.log('[TasksKanban] Task:', task.id, 'Count:', updateCount, 'HasUpdates:', task.hasUnreadUpdates);
            return (
              <NotificationDot count={updateCount} />
            );
          })()}
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
              console.log('[TasksKanban] Edit task requested:', task.id);
            }}
            onDelete={() => {
              onDeleteTaskOpen(task.id);
              console.log('[TasksKanban] Delete task requested:', task.id);
            }}
            onArchive={async () => {
              try {
                // Usar la función directamente del prop
                await onArchiveTask(task);
                console.log('[TasksKanban] Task archived successfully:', task.id);
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
  handleUserFilter: (id: string) => void;
  animateClick: (element: HTMLElement) => void;
  handleInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
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
  handleUserFilter,
  animateClick,
  handleInputKeyDown,
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

            console.log('[TasksKanban] Search query updated:', newValue);
          }}
          className={styles.searchInput}
          aria-label="Buscar tareas"
          onKeyDown={handleInputKeyDown}
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
              console.log('[TasksKanban] Opening Archive Table');
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
                  'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.filter =
                  'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.84)) drop-shadow(0 8px 25px rgba(0, 0, 0, 0.93))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.filter =
                  'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))';
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
                      console.log('[TasksKanban] User dropdown toggled');
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

const TasksKanban: React.FC<TasksKanbanProps> = memo(
  ({
    onNewTaskOpen,
    onEditTaskOpen,
    onChatSidebarOpen,
    onMessageSidebarOpen,
    onOpenProfile,
    onViewChange,
    onDeleteTaskOpen,
    onArchiveTableOpen,
    externalTasks,
    externalClients,
    externalUsers,
  }) => {
    const { user } = useUser();
    const { isAdmin } = useAuth();

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
      isLoadingTasks,
      activeTask,
      // Acciones
      setSearchQuery,
      setPriorityFilter,
      setClientFilter,
      setUserFilter,
      setIsPriorityDropdownOpen,
      setIsClientDropdownOpen,
      setIsUserDropdownOpen,
      setIsTouchDevice,
      setIsLoadingTasks,
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
        isLoadingTasks: state.isLoadingTasks,
        activeTask: state.activeTask,
        // Acciones
        setSearchQuery: state.setSearchQuery,
        setPriorityFilter: state.setPriorityFilter,
        setClientFilter: state.setClientFilter,
        setUserFilter: state.setUserFilter,
        setIsPriorityDropdownOpen: state.setIsPriorityDropdownOpen,
        setIsClientDropdownOpen: state.setIsClientDropdownOpen,
        setIsUserDropdownOpen: state.setIsUserDropdownOpen,
        setIsTouchDevice: state.setIsTouchDevice,
        setIsLoadingTasks: state.setIsLoadingTasks,
        setActiveTask: state.setActiveTask,
      }))
    );

    const containerRef = useRef<HTMLDivElement>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const priorityDropdownRef = useRef<HTMLDivElement>(null);
    const clientDropdownRef = useRef<HTMLDivElement>(null);
    const userDropdownRef = useRef<HTMLDivElement>(null);
    const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    const userId = useMemo(() => user?.id || '', [user]);

    // PRIORIZAR external data para asegurar sincronización con TasksPage
    const effectiveTasks = useMemo(() => externalTasks ?? [], [externalTasks]);
    const effectiveClients = useMemo(() => externalClients ?? [], [externalClients]);
    const effectiveUsers = useMemo(() => externalUsers ?? [], [externalUsers]);



    // Only log significant changes to reduce console noise
    useEffect(() => {
      if (effectiveTasks.length > 0) {
        const hasStatusChanges = effectiveTasks.some(task => 
          task.status && task.status !== 'Por Iniciar'
        );
        
        if (hasStatusChanges) {
          console.log('[TasksKanban] Tasks updated with status changes:', effectiveTasks.length);
        }
      }
    }, [effectiveTasks]);

    // Usar el hook de notificaciones simplificado
    const { getUnreadCount, markAsViewed } = useTaskNotifications();

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

    const handleUserFilter = (id: string) => {
      const userDropdownTrigger = userDropdownRef.current?.querySelector(`.${styles.dropdownTrigger}`);
      if (userDropdownTrigger) {
        const filterIcon = userDropdownTrigger.querySelector('img');
        if (filterIcon) {
          gsap.to(filterIcon, {
            rotation: 360,
            scale: 1.2,
            duration: 0.3,
            ease: 'power2.out',
            yoyo: true,
            repeat: 1
          });
        }
      }

      setUserFilter(id);
      setIsUserDropdownOpen(false);
    };

    const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'a':
            e.preventDefault();
            e.currentTarget.select();
            break;
          case 'c':
            e.preventDefault();
            const targetC = e.currentTarget as HTMLInputElement;
            if (targetC.selectionStart !== targetC.selectionEnd) {
              const selectedText = targetC.value.substring(targetC.selectionStart || 0, targetC.selectionEnd || 0);
              navigator.clipboard.writeText(selectedText).catch(() => {
                const textArea = document.createElement('textarea');
                textArea.value = selectedText;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
              });
            }
            break;
          case 'v':
            e.preventDefault();
            const targetV = e.currentTarget as HTMLInputElement;
            navigator.clipboard.readText().then(text => {
              if (typeof targetV.selectionStart === 'number' && typeof targetV.selectionEnd === 'number') {
                const start = targetV.selectionStart;
                const end = targetV.selectionEnd;
                const newValue = targetV.value.substring(0, start) + text + targetV.value.substring(end);
                setSearchQuery(newValue);
                setTimeout(() => {
                  targetV.setSelectionRange(start + text.length, start + text.length);
                }, 0);
              } else {
                setSearchQuery(targetV.value + text);
              }
            }).catch(() => {
              document.execCommand('paste');
            });
            break;
          case 'x':
            e.preventDefault();
            const targetX = e.currentTarget as HTMLInputElement;
            if (targetX.selectionStart !== targetX.selectionEnd) {
              const selectedText = targetX.value.substring(targetX.selectionStart || 0, targetX.selectionEnd || 0);
              navigator.clipboard.writeText(selectedText).then(() => {
                if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                  const start = targetX.selectionStart;
                  const end = targetX.selectionEnd;
                  const newValue = targetX.value.substring(0, start) + targetX.value.substring(end);
                  setSearchQuery(newValue);
                } else {
                  setSearchQuery('');
                }
              }).catch(() => {
                const textArea = document.createElement('textarea');
                textArea.value = selectedText;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                  const start = targetX.selectionStart;
                  const end = targetX.selectionEnd;
                  const newValue = targetX.value.substring(0, start) + targetX.value.substring(end);
                  setSearchQuery(newValue);
                } else {
                  setSearchQuery('');
                }
              });
            }
            break;
        }
      }
    }, [setSearchQuery]);

    const statusColumns = useMemo(
      () => [
        { id: 'por-iniciar', title: 'Por Iniciar' },
        { id: 'en-proceso', title: 'En Proceso' },
        { id: 'backlog', title: 'Backlog' },
        { id: 'por-finalizar', title: 'Por Finalizar' },
        { id: 'finalizado', title: 'Finalizado' },
        { id: 'cancelado', title: 'Cancelado' },
      ],
      [],
    );

    // Helper function to normalize status values
    const normalizeStatus = useCallback((status: string): string => {
      if (!status) return 'Por Iniciar'; // Default for empty/null status
      
      const normalized = status.trim();
      
      // Handle common variations
      const statusMap: { [key: string]: string } = {
        'por iniciar': 'Por Iniciar',
        'por-iniciar': 'Por Iniciar',
        'pendiente': 'Por Iniciar',
        'pending': 'Por Iniciar',
        'to do': 'Por Iniciar',
        'todo': 'Por Iniciar',
        'en proceso': 'En Proceso',
        'en-proceso': 'En Proceso',
        'in progress': 'En Proceso',
        'progreso': 'En Proceso',
        'por finalizar': 'Por Finalizar',
        'por-finalizar': 'Por Finalizar',
        'to finish': 'Por Finalizar',
        'finalizado': 'Finalizado',
        'finalizada': 'Finalizado',
        'completed': 'Finalizado',
        'completado': 'Finalizado',
        'completada': 'Finalizado',
        'done': 'Finalizado',
        'terminado': 'Finalizado',
        'terminada': 'Finalizado',
        'finished': 'Finalizado',
        'backlog': 'Backlog',
        'cancelado': 'Cancelado',
        'cancelada': 'Cancelado',
        'cancelled': 'Cancelado',
        // Legacy status mapping
        'diseno': 'Por Iniciar',
        'diseño': 'Por Iniciar',
        'design': 'Por Iniciar',
        'desarrollo': 'En Proceso',
        'development': 'En Proceso',
        'dev': 'En Proceso',
      };
      
      return statusMap[normalized.toLowerCase()] || normalized;
    }, []);

    useEffect(() => {
      const checkTouchDevice = () => {
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        setIsTouchDevice(isTouch);
        console.log('[TasksKanban] Touch device detected:', isTouch);
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

    // Setup de tasks con actualizaciones en tiempo real - ELIMINAR DUPLICADO
    useEffect(() => {
      if (!user?.id) return;

      console.log('[TasksKanban] Using shared tasks state - no duplicate onSnapshot');
      
      // No establecer onSnapshot aquí - usar siempre externalTasks del hook compartido
      if (externalTasks) {
        console.log('[TasksKanban] Using external tasks from shared state:', externalTasks.length);
        setIsLoadingTasks(false);
      }
    }, [user?.id, externalTasks, setIsLoadingTasks]);

    // Setup de clients con actualizaciones en tiempo real
    useEffect(() => {
      if (!user?.id || externalClients) return;

      console.log('[TasksKanban] Setting up clients listener');
      setIsLoadingTasks(true);

      const clientsQuery = query(collection(db, 'clients'));
      const unsubscribeClients = onSnapshot(
        clientsQuery,
        (snapshot) => {
          const clientsData: Client[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name || '',
            imageUrl: doc.data().imageUrl || '/empty-image.png',
          }));

          console.log('[TasksKanban] Clients onSnapshot update:', clientsData.length);

          // Actualizar estado directamente sin caché
          setIsLoadingTasks(false);
        },
        (error) => {
          console.error('[TasksKanban] Error in clients onSnapshot:', error);
          setIsLoadingTasks(false);
        }
      );

      return () => {
        unsubscribeClients();
      };
    }, [user?.id, externalClients]);

    // Users are now managed centrally by useSharedTasksState
    // No independent user fetching needed

    // Cleanup all table listeners when component unmounts
    useEffect(() => {
      return () => {
        console.log('[TasksKanban] Cleaning up all table listeners on unmount');
        cleanupTasksKanbanListeners();
      };
    }, []);

    const animateClick = (element: HTMLElement) => {
      gsap.to(element, {
        scale: 0.95,
        opacity: 0.8,
        duration: 0.15,
        ease: 'power1.out',
        yoyo: true,
        repeat: 1,
      });
      console.log('[TasksKanban] Click animation triggered');
    };

    const handlePrioritySelect = (priority: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      
      // Animate filter change
      const filterIcon = e.currentTarget.querySelector('img');
      if (filterIcon) {
        gsap.to(filterIcon, {
          rotation: 360,
          scale: 1.2,
          duration: 0.3,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1
        });
      }
      
      console.log('[TasksKanban] Priority filter selected:', priority);
      setPriorityFilter(priority);
      setIsPriorityDropdownOpen(false);
    };

    const handleClientSelect = (clientId: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);
      
      // Animate filter change
      const filterIcon = e.currentTarget.querySelector('img');
      if (filterIcon) {
        gsap.to(filterIcon, {
          rotation: 360,
          scale: 1.2,
          duration: 0.3,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1
        });
      }
      
      console.log('[TasksKanban] Client filter selected:', clientId);
      setClientFilter(clientId);
      setIsClientDropdownOpen(false);
    };

    // Helper function to get involved user IDs
    const getInvolvedUserIds = useCallback((task: Task) => {
      const ids = new Set<string>();
      if (task.CreatedBy) ids.add(task.CreatedBy);
      if (Array.isArray(task.AssignedTo)) task.AssignedTo.forEach((id) => ids.add(id));
      if (Array.isArray(task.LeadedBy)) task.LeadedBy.forEach((id) => ids.add(id));
      return Array.from(ids);
    }, []);

    // Group tasks by status - essential for Kanban functionality
    const groupedTasks = useMemo(() => {
      console.log('[TasksKanban] Grouping tasks:', {
        total: effectiveTasks.length,
        filtered: effectiveTasks.filter(t => !t.archived).length
      });

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
            console.log('[TasksKanban] Task excluded by permissions:', {
              taskId: task.id,
              taskName: task.name,
              isAdmin,
              userId,
              involvedUserIds: getInvolvedUserIds(task)
            });
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
      statusColumns, 
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
      const taskId = event.active.id;
      const task = effectiveTasks.find(t => t.id === taskId);
      if (task) {
        setActiveTask(task);
        console.log('[TasksKanban] Drag started for task:', taskId);
      }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);
      
      if (!over || !isAdmin) {
        console.log('[TasksKanban] Drag ended without valid drop or insufficient permissions');
        return;
      }

      const taskId = String(active.id);
      const newStatus = over.id;
      
      // Map column IDs back to proper status names
      const columnToStatusMap: { [key: string]: string } = {
        'por-iniciar': 'Por Iniciar',
        'en-proceso': 'En Proceso',
        'backlog': 'Backlog',
        'por-finalizar': 'Por Finalizar',
        'finalizado': 'Finalizado',
        'cancelado': 'Cancelado'
      };
      
      const newStatusName = columnToStatusMap[newStatus] || newStatus;
      
      console.log('[TasksKanban] Drag ended - attempting to update task status:', {
        taskId,
        newStatus: newStatusName,
        columnId: newStatus
      });

      try {
        const task = effectiveTasks.find(t => t.id === taskId);
        if (task && task.status !== newStatusName) {
          console.log('[TasksKanban] Updating task status in Firestore:', {
            taskId,
            oldStatus: task.status,
            newStatus: newStatusName
          });

          // Importar funciones de Firestore
          const { updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
          const { updateTaskActivity } = await import('@/lib/taskUtils');
          
          // Actualizar el estado en Firestore
          await updateDoc(doc(db, 'tasks', taskId), {
            status: newStatusName,
            lastActivity: serverTimestamp(),
          });
          
          // Actualizar la actividad de la tarea
          await updateTaskActivity(taskId, 'status_change');
          
          console.log('[TasksKanban] Task status updated successfully via drag & drop:', {
            taskId,
            newStatus: newStatusName
          });
        }
      } catch (error) {
        console.error('[TasksKanban] Error updating task status:', error);
      }
    };

    // Handler para archivar localmente
    const handleArchiveTask = useCallback(async (task: Task) => {
      if (!isAdmin) {
        console.warn('[TasksKanban] Archive intentado por usuario no admin');
        return;
      }
      
      try {
        console.log('[TasksKanban] Archiving task locally:', {
          table: 'TasksKanban',
          taskId: task.id,
          taskName: task.name,
          taskStatus: task.status,
          currentState: {
            archived: task.archived,
            archivedAt: task.archivedAt,
            archivedBy: task.archivedBy
          },
          action: 'Archive task from Kanban view',
          userId,
          isAdmin
        });
        
        // Importar las funciones de archivado
        const { archiveTask } = await import('@/lib/taskUtils');
        
        // Archivar en Firestore
        await archiveTask(task.id, userId, isAdmin, task);
        
        console.log('[TasksKanban] Task archived successfully:', {
          table: 'TasksKanban',
          taskId: task.id,
          taskName: task.name,
          taskStatus: task.status,
          finalState: 'archived',
          source: 'Kanban view'
        });
      } catch (error) {
        console.error('[TasksKanban] Error archiving task:', error);
      }
    }, [isAdmin, userId]);

    if (isLoadingTasks) {
      return (
        <div className={styles.container}>
          <style jsx>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>
          <div className={styles.swiperContainer}>
            <UserSwiper onOpenProfile={onOpenProfile} onMessageSidebarOpen={onMessageSidebarOpen} />
          </div>
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

    return (
      <div className={styles.container} ref={containerRef}>
        <div className={styles.swiperContainer}>
          <UserSwiper onOpenProfile={onOpenProfile} onMessageSidebarOpen={onMessageSidebarOpen} />
        </div>
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
          handleInputKeyDown={handleInputKeyDown}
        />
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className={styles.kanbanBoard}>
            {statusColumns.map((column) => (
              <DroppableColumn
                key={column.id}
                id={column.id}
                className={`${styles.kanbanColumn} ${groupedTasks[column.id]?.length ? '' : styles.empty}`}
              >
                <div className={styles.columnHeader}>
                  <h2 className={styles.columnTitle}>{column.title}</h2>
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
                        onChatSidebarOpen={onChatSidebarOpen}
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
                        getUnreadCount={getUnreadCount}
                        markAsViewed={markAsViewed}
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
      </div>
    );
  }
);

TasksKanban.displayName = 'TasksKanban';

export default TasksKanban;