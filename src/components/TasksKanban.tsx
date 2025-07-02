'use client';

import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, onSnapshot, query, getDocs } from 'firebase/firestore';
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
// Remove unused imports - functions handled by parent component
import { motion, AnimatePresence } from 'framer-motion';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';
import NotificationDot from '@/components/ui/NotificationDot';





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

const tasksKanbanCache = {
  tasks: new Map<string, { data: Task[]; timestamp: number }>(),
  clients: new Map<string, { data: Client[]; timestamp: number }>(),
  users: new Map<string, { data: User[]; timestamp: number }>(),
  listeners: new Map<string, { tasks: (() => void) | null; clients: (() => void) | null; users: (() => void) | null }>(),
};

const CACHE_DURATION = 10 * 60 * 1000;

export const cleanupTasksKanbanListeners = () => {
  console.log('[TasksKanban] Cleaning up all listeners');
  tasksKanbanCache.listeners.forEach((listener) => {
    if (listener.tasks) listener.tasks();
    if (listener.clients) listener.clients();
    if (listener.users) listener.users();
  });
  tasksKanbanCache.listeners.clear();
  tasksKanbanCache.tasks.clear();
  tasksKanbanCache.clients.clear();
  tasksKanbanCache.users.clear();
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
  setActionMenuOpenId: (id: string | null) => void;
  actionMenuOpenId: string | null;
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
}

const SortableItem: React.FC<SortableItemProps> = ({
  id,
  task,
  onChatSidebarOpen,
  isAdmin,
  userId,
  setActionMenuOpenId,
  actionMenuOpenId,
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
        {(isAdmin || task.CreatedBy === userId) && (
          <ActionMenu
            task={task}
            userId={userId}
            isOpen={actionMenuOpenId === task.id}
            onOpen={() => {
              setActionMenuOpenId(task.id);
              console.log('[TasksKanban] Action menu opened for task:', task.id);
            }}
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
                setActionMenuOpenId(null);
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
interface FirestoreTimestamp {
  toDate(): Date;
}

// Type guard for Firestore timestamp
const isFirestoreTimestamp = (timestamp: unknown): timestamp is FirestoreTimestamp => {
  return timestamp !== null && 
         typeof timestamp === 'object' && 
         'toDate' in timestamp && 
         typeof (timestamp as FirestoreTimestamp).toDate === 'function';
};

// Helper function to safely convert Firestore timestamp or string to ISO string
const safeTimestampToISO = (timestamp: unknown): string => {
  if (!timestamp) return new Date().toISOString();
  
  // If it's already a string, return it
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  
  // If it's a Firestore timestamp, convert it
  if (isFirestoreTimestamp(timestamp)) {
    return timestamp.toDate().toISOString();
  }
  
  // If it's a Date object, convert it
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  // Fallback to current date
  return new Date().toISOString();
};

// Helper function to safely convert Firestore timestamp or string to ISO string or null
const safeTimestampToISOOrNull = (timestamp: unknown): string | null => {
  if (!timestamp) return null;
  
  // If it's already a string, return it
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  
  // If it's a Firestore timestamp, convert it
  if (isFirestoreTimestamp(timestamp)) {
    return timestamp.toDate().toISOString();
  }
  
  // If it's a Date object, convert it
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  // Fallback to null
  return null;
};

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
    const { isAdmin, isLoading } = useAuth();

    const tasksRef = useRef<Task[]>([]);
    const clientsRef = useRef<Client[]>([]);
    const usersRef = useRef<User[]>([]);

    const [tasks, setTasks] = useState<Task[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [priorityFilter] = useState<string>('');
    const [clientFilter] = useState<string>('');
    const [userFilter, setUserFilter] = useState<string>('');
    const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
    const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [isLoadingClients, setIsLoadingClients] = useState(true);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    // Eliminar estados de undo ya no necesarios



    const containerRef = useRef<HTMLDivElement>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const priorityDropdownRef = useRef<HTMLDivElement>(null);
    const clientDropdownRef = useRef<HTMLDivElement>(null);
    const userDropdownRef = useRef<HTMLDivElement>(null);
    const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    const userId = useMemo(() => user?.id || '', [user]);

    // Use external data if provided, otherwise use internal state
    const effectiveTasks = externalTasks || tasks;
    const effectiveClients = externalClients || clients;
    const effectiveUsers = externalUsers || users;

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



    const isCacheValid = useCallback((cacheKey: string, cacheMap: Map<string, { data: Task[] | Client[] | User[]; timestamp: number }>) => {
      const cached = cacheMap.get(cacheKey);
      if (!cached) return false;

      const now = Date.now();
      return (now - cached.timestamp) < CACHE_DURATION;
    }, []);



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
    }, []);

    const statusColumns = useMemo(
      () => [
        { id: 'por-iniciar', title: 'Por Iniciar' },
        { id: 'diseno', title: 'Diseño' },
        { id: 'desarrollo', title: 'Desarrollo' },
        { id: 'en-proceso', title: 'En Proceso' },
        { id: 'finalizado', title: 'Finalizado' },
        { id: 'backlog', title: 'Backlog' },
        { id: 'cancelado', title: 'Cancelado' },
      ],
      [],
    );

    // Helper function to normalize status values
    const normalizeStatus = (status: string): string => {
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
        'diseno': 'Diseño',
        'diseño': 'Diseño',
        'design': 'Diseño',
        'desarrollo': 'Desarrollo',
        'development': 'Desarrollo',
        'dev': 'Desarrollo',
        'en proceso': 'En Proceso',
        'en-proceso': 'En Proceso',
        'in progress': 'En Proceso',
        'progreso': 'En Proceso',
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
      };
      
      return statusMap[normalized.toLowerCase()] || normalized;
    };

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
    }, []);

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

    // CRÍTICO: Usar datos externos inmediatamente cuando estén disponibles
    useEffect(() => {
      if (externalTasks && externalTasks.length > 0) {
        console.log('[TasksKanban] Using external tasks immediately:', externalTasks.length);
        tasksRef.current = externalTasks;
        setTasks(externalTasks);
        setIsLoadingTasks(false);
      }
    }, [externalTasks]);

    useEffect(() => {
      if (externalClients && externalClients.length > 0) {
        console.log('[TasksKanban] Using external clients immediately:', externalClients.length);
        clientsRef.current = externalClients;
        setClients(externalClients);
        setIsLoadingClients(false);
      }
    }, [externalClients]);

    useEffect(() => {
      if (externalUsers && externalUsers.length > 0) {
        console.log('[TasksKanban] Using external users immediately:', externalUsers.length);
        usersRef.current = externalUsers;
        setUsers(externalUsers);
        setIsLoadingUsers(false);
      }
    }, [externalUsers]);

    const memoizedFilteredTasks = useMemo(() => {
      // Helper function inside useMemo to avoid dependency issues
      const getInvolvedUserIds = (task: Task) => {
        const ids = new Set<string>();
        if (task.CreatedBy) ids.add(task.CreatedBy);
        if (Array.isArray(task.AssignedTo)) task.AssignedTo.forEach((id) => ids.add(id));
        if (Array.isArray(task.LeadedBy)) task.LeadedBy.forEach((id) => ids.add(id));
        return Array.from(ids);
      };

      // Debug: verificar status de admin
      console.log('[TasksKanban] Admin status check:', {
        isAdmin,
        userId,
        isLoading,
        totalTasks: effectiveTasks.length,
        taskIds: effectiveTasks.map(t => t.id)
      });
      
      // Los admins deben poder ver todas las tareas, no solo las asignadas
      const visibleTasks = effectiveTasks;

      // CRÍTICO: TasksKanban SIEMPRE filtra tareas archivadas (archived: true)
      const nonArchivedTasks = visibleTasks.filter((task) => {
        // Verificar multiple formas de detectar si está archivada
        const isArchived = task.archived === true || String(task.archived) === 'true' || Boolean(task.archived);
        
        console.log('[TasksKanban] Task archive check:', {
          table: 'TasksKanban',
          taskId: task.id,
          taskName: task.name,
          taskStatus: task.status,
          archived: task.archived,
          archivedType: typeof task.archived,
          archivedString: JSON.stringify(task.archived),
          isArchived,
          willExclude: isArchived,
          archivedAt: task.archivedAt,
          archivedBy: task.archivedBy,
          filterPurpose: 'Checking if task should be excluded from Kanban'
        });
        
        if (isArchived) {
                  console.log('[TasksKanban] EXCLUDING archived task:', {
          table: 'TasksKanban',
          taskId: task.id,
          taskName: task.name,
          taskStatus: task.status,
          archived: task.archived,
          archivedAt: task.archivedAt,
          archivedBy: task.archivedBy,
          reason: 'Task is archived, filtering out from Kanban view'
        });
        }
        return !isArchived; // Solo mostrar tareas NO archivadas
      });

      console.log('[TasksKanban] Archive filtering results:', {
        table: 'TasksKanban',
        totalTasks: visibleTasks.length,
        archivedTasksCount: visibleTasks.filter(t => Boolean(t.archived)).length,
        nonArchivedTasksCount: nonArchivedTasks.length,
        archivedTaskIds: visibleTasks.filter(t => Boolean(t.archived)).map(t => t.id),
        nonArchivedTaskIds: nonArchivedTasks.map(t => t.id),
        filterPurpose: 'Show only non-archived tasks in Kanban columns'
      });

      // Aplicar otros filtros solo a tareas NO archivadas
      const filtered = nonArchivedTasks.filter((task) => {
        const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPriority = !priorityFilter || task.priority === priorityFilter;
        const matchesClient = !clientFilter || task.clientId === clientFilter;
        let matchesUser = true;
        if (userFilter === 'me') {
          matchesUser = getInvolvedUserIds(task).includes(userId);
        } else if (userFilter && userFilter !== 'me') {
          matchesUser = getInvolvedUserIds(task).includes(userFilter);
        }
        
        return matchesSearch && matchesPriority && matchesClient && matchesUser;
      });

      console.log('[TasksKanban] Final filtered tasks (NON-ARCHIVED only):', {
        table: 'TasksKanban',
        filteredCount: filtered.length,
        filteredTaskIds: filtered.map(t => t.id),
        filterResult: 'Only non-archived tasks that match all filters',
        appliedFilters: {
          search: searchQuery,
          priority: priorityFilter,
          client: clientFilter,
          user: userFilter
        }
      });

      return filtered;
    }, [effectiveTasks, searchQuery, priorityFilter, clientFilter, userFilter, userId, isAdmin, isLoading]);

    // ARREGLAR: Remover el useEffect problemático y asignar directamente
    const finalFilteredTasks = memoizedFilteredTasks;

    useEffect(() => {
      // Solo animar las tarjetas cuando hay cambios reales
      console.log('[TasksKanban] Updated filteredTasks:', {
        filteredCount: finalFilteredTasks.length,
        filteredTaskIds: finalFilteredTasks.map((t) => t.id),
        assignedToUser: finalFilteredTasks.filter((t) => t.AssignedTo.includes(userId)).map((t) => t.id),
      });

      setTimeout(() => {
        const taskCards = document.querySelectorAll(`.${styles.taskCard}`);
        taskCards.forEach((card, index) => {
          gsap.fromTo(
            card,
            {
              opacity: 0,
              y: 20,
              scale: 0.95,
              rotationX: -5,
            },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              rotationX: 0,
              duration: 0.4,
              delay: index * 0.05,
              ease: 'power2.out',
            }
          );
        });

        const columnHeaders = document.querySelectorAll(`.${styles.columnHeader}`);
        columnHeaders.forEach((header) => {
          const taskCount = header.querySelector(`.${styles.taskCount}`);
          if (taskCount) {
            gsap.fromTo(
              taskCount,
              { scale: 1.2, backgroundColor: '#e6f4ff' },
              {
                scale: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                duration: 0.3,
                ease: 'power2.out',
              }
            );
          }
        });
      }, 0);
    }, [finalFilteredTasks, userId]);

    // CRÍTICO: Usar datos externos inmediatamente cuando estén disponibles
    useEffect(() => {
      if (externalTasks && externalTasks.length > 0) {
        console.log('[TasksKanban] Using external tasks immediately:', externalTasks.length);
        tasksRef.current = externalTasks;
        setTasks(externalTasks);
        setIsLoadingTasks(false);
        }
    }, [externalTasks]);

    useEffect(() => {
      if (externalClients && externalClients.length > 0) {
        console.log('[TasksKanban] Using external clients immediately:', externalClients.length);
        clientsRef.current = externalClients;
        setClients(externalClients);
        setIsLoadingClients(false);
      }
    }, [externalClients]);

    useEffect(() => {
      if (externalUsers && externalUsers.length > 0) {
        console.log('[TasksKanban] Using external users immediately:', externalUsers.length);
        usersRef.current = externalUsers;
        setUsers(externalUsers);
        setIsLoadingUsers(false);
      }
    }, [externalUsers]);

    useEffect(() => {
      // CRÍTICO: Solo cargar datos de tareas si no hay datos externos
      if (externalTasks || !user?.id) return;

      const cacheKey = `tasks_${user.id}`;

      const existingListener = tasksKanbanCache.listeners.get(cacheKey);

      if (existingListener?.tasks) {
        console.log('[TasksKanban] Reusing existing tasks listener');
        if (tasksKanbanCache.tasks.has(cacheKey)) {
          const cachedData = tasksKanbanCache.tasks.get(cacheKey)!.data;
          tasksRef.current = cachedData;
          setTasks(cachedData);
          setIsLoadingTasks(false);
        }
        return;
      }

      if (isCacheValid(cacheKey, tasksKanbanCache.tasks)) {
        const cachedData = tasksKanbanCache.tasks.get(cacheKey)!.data;
        tasksRef.current = cachedData;
        setTasks(cachedData);
        setIsLoadingTasks(false);
        console.log('[TasksKanban] Using cached tasks on remount:', cachedData.length);
        return;
      }

      console.log('[TasksKanban] Setting up new tasks onSnapshot listener');
      setIsLoadingTasks(true);

      const tasksQuery = query(collection(db, 'tasks'));
      const unsubscribeTasks = onSnapshot(
        tasksQuery,
        (snapshot) => {
          const tasksData: Task[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            clientId: doc.data().clientId || '',
            project: doc.data().project || '',
            name: doc.data().name || '',
            description: doc.data().description || '',
            status: doc.data().status || '',
            priority: doc.data().priority || '',
            startDate: safeTimestampToISOOrNull(doc.data().startDate),
            endDate: safeTimestampToISOOrNull(doc.data().endDate),
            LeadedBy: doc.data().LeadedBy || [],
            AssignedTo: doc.data().AssignedTo || [],
            createdAt: safeTimestampToISO(doc.data().createdAt),
            CreatedBy: doc.data().CreatedBy || '',
            lastActivity: safeTimestampToISO(doc.data().lastActivity) || safeTimestampToISO(doc.data().createdAt) || new Date().toISOString(),
            hasUnreadUpdates: doc.data().hasUnreadUpdates || false,
            lastViewedBy: doc.data().lastViewedBy || {},
            archived: doc.data().archived || false,
            archivedAt: safeTimestampToISOOrNull(doc.data().archivedAt),
            archivedBy: doc.data().archivedBy || '',
          }));

          console.log('[TasksKanban] Tasks onSnapshot update:', tasksData.length);

          tasksRef.current = tasksData;
          setTasks(tasksData);

          tasksKanbanCache.tasks.set(cacheKey, {
            data: tasksData,
            timestamp: Date.now(),
          });

          setIsLoadingTasks(false);
        },
        (error) => {
          console.error('[TasksKanban] Error in tasks onSnapshot:', error);
          setTasks([]);
          setIsLoadingTasks(false);
        }
      );

      tasksKanbanCache.listeners.set(cacheKey, {
        tasks: unsubscribeTasks,
        clients: existingListener?.clients || null,
        users: existingListener?.users || null,
      });

      return () => {};
    }, [user?.id, isCacheValid, externalTasks, externalClients, externalUsers]);

    useEffect(() => {
      // CRÍTICO: Solo cargar datos de clientes si no hay datos externos
      if (!externalTasks && !externalClients && !externalUsers) return;

      const cacheKey = `clients_${user.id}`;

      const existingListener = tasksKanbanCache.listeners.get(cacheKey);

      if (existingListener?.clients) {
        console.log('[TasksKanban] Reusing existing clients listener');
        if (tasksKanbanCache.clients.has(cacheKey)) {
          const cachedData = tasksKanbanCache.clients.get(cacheKey)!.data;
          clientsRef.current = cachedData;
          setClients(cachedData);
          setIsLoadingClients(false);
        }
        return;
      }

      if (isCacheValid(cacheKey, tasksKanbanCache.clients)) {
        const cachedData = tasksKanbanCache.clients.get(cacheKey)!.data;
        clientsRef.current = cachedData;
        setClients(cachedData);
        setIsLoadingClients(false);
        console.log('[TasksKanban] Using cached clients on remount:', cachedData.length);
        return;
      }

      console.log('[TasksKanban] Setting up new clients onSnapshot listener');
      setIsLoadingClients(true);

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

          clientsRef.current = clientsData;
          setClients(clientsData);

          tasksKanbanCache.clients.set(cacheKey, {
            data: clientsData,
            timestamp: Date.now(),
          });

          setIsLoadingClients(false);
        },
        (error) => {
          console.error('[TasksKanban] Error in clients onSnapshot:', error);
          setClients([]);
          setIsLoadingClients(false);
        }
      );

      tasksKanbanCache.listeners.set(cacheKey, {
        tasks: existingListener?.tasks || null,
        clients: unsubscribeClients,
        users: existingListener?.users || null,
      });

      return () => {};
    }, [user?.id, isCacheValid, externalTasks, externalClients, externalUsers]);

    useEffect(() => {
      // CRÍTICO: Solo cargar datos de usuarios si no hay datos externos
      if (!externalTasks && !externalClients && !externalUsers) return;

      const cacheKey = `users_${user.id}`;

      const existingListener = tasksKanbanCache.listeners.get(cacheKey);

      if (existingListener?.users) {
        console.log('[TasksKanban] Reusing existing users listener');
        if (tasksKanbanCache.users.has(cacheKey)) {
          const cachedData = tasksKanbanCache.users.get(cacheKey)!.data;
          usersRef.current = cachedData;
          setUsers(cachedData);
          setIsLoadingUsers(false);
        }
        return;
      }

      if (isCacheValid(cacheKey, tasksKanbanCache.users)) {
        const cachedData = tasksKanbanCache.users.get(cacheKey)!.data;
        usersRef.current = cachedData;
        setUsers(cachedData);
        setIsLoadingUsers(false);
        console.log('[TasksKanban] Using cached users on remount:', cachedData.length);
        return;
      }

      console.log('[TasksKanban] Setting up new users onSnapshot listener');
      setIsLoadingUsers(true);

      const fetchUsers = async () => {
        try {
          console.log('[TasksKanban] Fetching users: imageUrl from Clerk API, other data from Firestore');
          
          // 1. Obtener imageUrl de Clerk
          const response = await fetch('/api/users');
          if (!response.ok) throw new Error('Failed to fetch users from Clerk');

          const clerkUsers: {
            id: string;
            imageUrl?: string;
            firstName?: string;
            lastName?: string;
            publicMetadata: { role?: string };
          }[] = await response.json();

          // Crear un mapa de imageUrls de Clerk
          const clerkImageMap = new Map<string, string>();
          clerkUsers.forEach(clerkUser => {
            if (clerkUser.imageUrl) {
              clerkImageMap.set(clerkUser.id, clerkUser.imageUrl);
            }
          });
          
          // 2. Obtener todos los demás datos de Firestore
          const usersQuery = query(collection(db, 'users'));
          const firestoreSnapshot = await getDocs(usersQuery);
          
          const usersData: User[] = firestoreSnapshot.docs.map((doc) => {
            const userData = doc.data();
                return {
              id: doc.id,
              imageUrl: userData.imageUrl || clerkImageMap.get(doc.id) || '', // Firestore first, then Clerk
              fullName: userData.fullName || userData.name || 'Sin nombre', // de Firestore
              role: userData.role || 'Sin rol', // de Firestore
                };
          });

          usersRef.current = usersData;
          setUsers(usersData);

          tasksKanbanCache.users.set(cacheKey, {
            data: usersData,
            timestamp: Date.now(),
          });
          
          console.log('[TasksKanban] Users fetched and cached:', {
            total: usersData.length,
            withImages: usersData.filter(u => u.imageUrl).length,
            withoutImages: usersData.filter(u => !u.imageUrl).length
          });
        } catch (error) {
          console.error('[TasksKanban] Error fetching users:', error);
          setUsers([]);
        } finally {
          setIsLoadingUsers(false);
        }
      };

      fetchUsers();

      tasksKanbanCache.listeners.set(cacheKey, {
        tasks: existingListener?.tasks || null,
        clients: existingListener?.clients || null,
        users: null,
      });

      return () => {};
    }, [user?.id, isCacheValid, externalTasks, externalClients, externalUsers]);

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
      
      // Note: setPriorityFilter is removed since priorityFilter is read-only now
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
      
      // Note: setClientFilter is removed since clientFilter is read-only now
      setIsClientDropdownOpen(false);
    };

    // Group tasks by status - essential for Kanban functionality
    const groupedTasks = useMemo(() => {
      const groups: { [key: string]: Task[] } = {};
      
      statusColumns.forEach(column => {
        groups[column.id] = [];
      });
      
      finalFilteredTasks.forEach(task => {
        const normalizedStatus = normalizeStatus(task.status);
        const columnId = normalizedStatus.toLowerCase().replace(/\s+/g, '-');
        
        // Map status to column IDs
        const statusToColumnMap: { [key: string]: string } = {
          'por-iniciar': 'por-iniciar',
          'diseño': 'diseno',
          'desarrollo': 'desarrollo',
          'en-proceso': 'en-proceso',
          'finalizado': 'finalizado',
          'backlog': 'backlog',
          'cancelado': 'cancelado'
        };
        
        const targetColumn = statusToColumnMap[columnId] || 'por-iniciar';
        if (groups[targetColumn]) {
          groups[targetColumn].push(task);
        }
      });
      
      return groups;
    }, [finalFilteredTasks, statusColumns]);

    // Drag and drop handlers - essential for Kanban functionality
    const handleDragStart = (event: DragStartEvent) => {
      const taskId = event.active.id;
      const task = finalFilteredTasks.find(t => t.id === taskId);
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

      const taskId = active.id;
      const newStatus = over.id;
      
      // Map column IDs back to proper status names
      const columnToStatusMap: { [key: string]: string } = {
        'por-iniciar': 'Por Iniciar',
        'diseno': 'Diseño',
        'desarrollo': 'Desarrollo',
        'en-proceso': 'En Proceso',
        'finalizado': 'Finalizado',
        'backlog': 'Backlog',
        'cancelado': 'Cancelado'
      };
      
      const newStatusName = columnToStatusMap[newStatus] || newStatus;
      
      console.log('[TasksKanban] Drag ended - attempting to update task status:', {
        taskId,
        newStatus: newStatusName,
        columnId: newStatus
      });

      try {
        // Update task status via external handler if available
        // This should be handled by the parent component
        const task = finalFilteredTasks.find(t => t.id === taskId);
        if (task && task.status !== newStatusName) {
          // For now, just log - the parent should handle actual updates
          console.log('[TasksKanban] Task status change requested:', {
            taskId,
            oldStatus: task.status,
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

    // Eliminar función handleUndo ya no necesaria

    if (isLoading || isLoadingTasks || isLoadingClients || isLoadingUsers) {
      return <SkeletonLoader type="kanban" rows={6} />;
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
          clients={clients}
          users={users}
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
                    {groupedTasks[column.id]?.map((task) => (
                      <SortableItem
                        key={task.id}
                        id={task.id}
                        task={task}
                        onChatSidebarOpen={onChatSidebarOpen}
                        isAdmin={isAdmin}
                        userId={userId}
                        setActionMenuOpenId={setActionMenuOpenId}
                        actionMenuOpenId={actionMenuOpenId}
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