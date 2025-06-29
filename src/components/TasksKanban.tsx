'use client';

import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, doc, updateDoc, onSnapshot, query, getDoc, addDoc, Timestamp } from 'firebase/firestore';
import Image from 'next/image';
import { gsap } from 'gsap';
import { DndContext, DragOverlay, closestCenter, useSensor, useSensors, PointerSensor, TouchSensor, DragStartEvent, DragEndEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { db } from '@/lib/firebase';
import ActionMenu from './ui/ActionMenu';
import styles from './TasksKanban.module.scss';
import avatarStyles from './ui/AvatarGroup.module.scss';
import UserSwiper from '@/components/UserSwiper';
import { useAuth } from '@/contexts/AuthContext';
import SkeletonLoader from '@/components/SkeletonLoader';
import { updateTaskActivity, archiveTask } from '@/lib/taskUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';
import NotificationDot from '@/components/ui/NotificationDot';

interface DebugInfo {
  cursorPosition: { x: number; y: number };
  cardPosition: { x: number; y: number; width: number; height: number };
  cardOffset: { x: number; y: number };
  dragStartPosition: { x: number; y: number };
  isDragging: boolean;
  taskId: string | null;
  timestamp: number;
}

const DebugOverlay: React.FC<{ debugInfo: DebugInfo | null }> = ({ debugInfo }) => {
  if (!debugInfo || !debugInfo.isDragging) return null;

  const offsetMagnitude = Math.sqrt(
    Math.pow(debugInfo.cardOffset.x, 2) + Math.pow(debugInfo.cardOffset.y, 2)
  );
  const isWellCentered = offsetMagnitude < 20;

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        background: isWellCentered ? 'rgba(0, 128, 0, 0.9)' : 'rgba(255, 0, 0, 0.9)',
        color: 'white',
        padding: '10px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 10000,
        maxWidth: '300px',
        whiteSpace: 'pre-wrap',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
        🔍 DRAG DEBUG {isWellCentered ? '✅' : '❌'}
      </div>
      <div>Cursor: ({debugInfo.cursorPosition.x.toFixed(1)}, {debugInfo.cursorPosition.y.toFixed(1)})</div>
      <div>
        Card Center: (
        {(debugInfo.cardPosition.x + debugInfo.cardPosition.width / 2).toFixed(1)},{' '}
        {(debugInfo.cardPosition.y + debugInfo.cardPosition.height / 2).toFixed(1)})
      </div>
      <div>Card Size: {debugInfo.cardPosition.width.toFixed(1)} × {debugInfo.cardPosition.height.toFixed(1)}</div>
      <div>Offset: ({debugInfo.cardOffset.x.toFixed(1)}, {debugInfo.cardOffset.y.toFixed(1)})</div>
      <div>Offset Magnitude: {offsetMagnitude.toFixed(1)}px</div>
      <div>Start: ({debugInfo.dragStartPosition.x.toFixed(1)}, {debugInfo.dragStartPosition.y.toFixed(1)})</div>
      <div>Task ID: {debugInfo.taskId}</div>
      <div>Time: {new Date(debugInfo.timestamp).toLocaleTimeString()}</div>
      <div style={{ marginTop: '5px', fontWeight: 'bold' }}>
        {isWellCentered ? '✅ WELL CENTERED' : '❌ NEEDS FIX'}
      </div>
    </div>
  );
};

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
  users: User[];
  currentUserId: string;
}

const AvatarGroup: React.FC<AvatarGroupProps> = ({ assignedUserIds, users, currentUserId }) => {
  const avatars = useMemo(() => {
    if (!Array.isArray(users)) {
      console.warn('[AvatarGroup] Users prop is not an array:', users);
      return [];
    }
    const matchedUsers = users.filter((user) => assignedUserIds.includes(user.id)).slice(0, 5);
    return matchedUsers.sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return 0;
    });
  }, [assignedUserIds, users, currentUserId]);

  return (
    <div className={avatarStyles.avatarGroup}>
      {avatars.length > 0 ? (
        avatars.map((user) => (
          <div key={user.id} className={avatarStyles.avatar}>
            <span className={avatarStyles.avatarName}>{user.fullName}</span>
            <Image
              src={user.imageUrl}
              alt={`${user.fullName}'s avatar`}
              width={24}
              height={24}
              className={avatarStyles.avatarImage}
              onError={(e) => {
                e.currentTarget.src = '';
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
                // Actualizar estado local optimísticamente
                const updatedTask = { ...task, archived: true, archivedAt: new Date().toISOString(), archivedBy: userId };
                await onArchiveTask(updatedTask);
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
        <AvatarGroup assignedUserIds={task.AssignedTo} users={users} currentUserId={userId} />
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

const TasksKanban: React.FC<TasksKanbanProps> = memo(
  ({
    onNewTaskOpen,
    onEditTaskOpen,
    onChatSidebarOpen,
    onMessageSidebarOpen,
    onOpenProfile,
    onViewChange,
    onDeleteTaskOpen,
  }) => {
    const { user } = useUser();
    const { isAdmin, isLoading } = useAuth();

    const tasksRef = useRef<Task[]>([]);
    const clientsRef = useRef<Client[]>([]);
    const usersRef = useRef<User[]>([]);

    const [tasks, setTasks] = useState<Task[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState<string>('');
    const [clientFilter, setClientFilter] = useState<string>('');
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

    // Undo functionality for archive actions
    const [undoStack, setUndoStack] = useState<Array<{task: Task, action: 'archive' | 'unarchive', timestamp: number}>>([]);
    const [showUndo, setShowUndo] = useState(false);
    const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
    const debugRef = useRef<DebugInfo | null>(null);
    const dragStartRef = useRef<{ x: number; y: number; taskId: string } | null>(null);
    const currentDraggedElementRef = useRef<HTMLElement | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const priorityDropdownRef = useRef<HTMLDivElement>(null);
    const clientDropdownRef = useRef<HTMLDivElement>(null);
    const userDropdownRef = useRef<HTMLDivElement>(null);
    const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    const userId = useMemo(() => user?.id || '', [user]);

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

    const updateDebugInfo = useCallback((info: Partial<DebugInfo>) => {
      const newInfo = {
        ...debugRef.current,
        ...info,
        timestamp: Date.now(),
      } as DebugInfo;

      debugRef.current = newInfo;
      setDebugInfo(newInfo);

      console.log('🔍 DRAG DEBUG:', {
        cursor: newInfo.cursorPosition,
        card: newInfo.cardPosition,
        offset: newInfo.cardOffset,
        start: newInfo.dragStartPosition,
        taskId: newInfo.taskId,
        isDragging: newInfo.isDragging,
        offsetMagnitude: Math.sqrt(
          Math.pow(newInfo.cardOffset.x, 2) + Math.pow(newInfo.cardOffset.y, 2)
        ),
        shouldBeCentered: newInfo.cardOffset.x < 50 && newInfo.cardOffset.y < 50,
      });
    }, []);

    const handleMouseMove = useCallback(
      (e: MouseEvent) => {
        if (!debugRef.current?.isDragging || !currentDraggedElementRef.current) return;

        const cursorPos = {
          x: e.clientX,
          y: e.clientY,
        };

        const cardElement = currentDraggedElementRef.current;
        const cardRect = cardElement.getBoundingClientRect();

        const cardPos = {
          x: cardRect.left,
          y: cardRect.top,
          width: cardRect.width,
          height: cardRect.height,
        };

        const cardCenterX = cardPos.x + cardPos.width / 2;
        const cardCenterY = cardPos.y + cardPos.height / 2;
        const cardOffset = {
          x: cursorPos.x - cardCenterX,
          y: cursorPos.y - cardCenterY,
        };

        updateDebugInfo({
          cursorPosition: cursorPos,
          cardPosition: cardPos,
          cardOffset,
        });
      },
      [updateDebugInfo]
    );

    const handleTouchMove = useCallback(
      (e: TouchEvent) => {
        if (!debugRef.current?.isDragging || !currentDraggedElementRef.current) return;

        const touch = e.touches[0];
        const cursorPos = {
          x: touch.clientX,
          y: touch.clientY,
        };

        const cardElement = currentDraggedElementRef.current;
        const cardRect = cardElement.getBoundingClientRect();

        const cardPos = {
          x: cardRect.left,
          y: cardRect.top,
          width: cardRect.width,
          height: cardRect.height,
        };

        const cardCenterX = cardPos.x + cardPos.width / 2;
        const cardCenterY = cardPos.y + cardPos.height / 2;
        const cardOffset = {
          x: cursorPos.x - cardCenterX,
          y: cursorPos.y - cardCenterY,
        };

        updateDebugInfo({
          cursorPosition: cursorPos,
          cardPosition: cardPos,
          cardOffset,
        });
      },
      [updateDebugInfo]
    );

    const startDragDebug = useCallback((taskId: string, startX: number, startY: number) => {
      dragStartRef.current = { x: startX, y: startY, taskId };

      const draggedElement = document.querySelector(`[data-dnd-id="${taskId}"]`) as HTMLElement;
      if (!draggedElement) return;

      const rect = draggedElement.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const cardCenterY = rect.top + rect.height / 2;

      const centerOffsetX = startX - cardCenterX;
      const centerOffsetY = startY - cardCenterY;

      updateDebugInfo({
        isDragging: true,
        taskId,
        dragStartPosition: { x: startX, y: startY },
        cursorPosition: { x: startX, y: startY },
        cardPosition: {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        },
        cardOffset: { x: centerOffsetX, y: centerOffsetY },
      });

      currentDraggedElementRef.current = draggedElement;

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });

      console.log('🔍 DRAG STARTED:', { taskId, startX, startY, centerOffsetX, centerOffsetY });
    }, [updateDebugInfo, handleMouseMove, handleTouchMove]);

    const stopDragDebug = useCallback(() => {
      if (debugRef.current?.isDragging) {
        updateDebugInfo({
          isDragging: false,
          taskId: null,
        });

        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('touchmove', handleTouchMove);

        dragStartRef.current = null;
        currentDraggedElementRef.current = null;

        console.log('🔍 DRAG STOPPED');
      }
    }, [updateDebugInfo, handleMouseMove, handleTouchMove]);

    useEffect(() => {
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('touchmove', handleTouchMove);
      };
    }, [handleMouseMove, handleTouchMove]);

    const isCacheValid = useCallback((cacheKey: string, cacheMap: Map<string, { data: Task[] | Client[] | User[]; timestamp: number }>) => {
      const cached = cacheMap.get(cacheKey);
      if (!cached) return false;

      const now = Date.now();
      return (now - cached.timestamp) < CACHE_DURATION;
    }, []);

    const getInvolvedUserIds = (task: Task) => {
      const ids = new Set<string>();
      if (task.CreatedBy) ids.add(task.CreatedBy);
      if (Array.isArray(task.AssignedTo)) task.AssignedTo.forEach((id) => ids.add(id));
      if (Array.isArray(task.LeadedBy)) task.LeadedBy.forEach((id) => ids.add(id));
      return Array.from(ids);
    };

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

    useEffect(() => {
      setFilteredTasks(tasks);
      console.log('[TasksKanban] Initialized filteredTasks:', {
        totalTasks: tasks.length,
        taskIds: tasks.map((t) => t.id),
        assignedToUser: tasks.filter((t) => t.AssignedTo.includes(userId)).map((t) => t.id),
      });
    }, [tasks, userId]);

    const memoizedFilteredTasks = useMemo(() => {
      const visibleTasks = isAdmin
        ? tasks
        : tasks.filter((task) => task.AssignedTo.includes(userId) || task.CreatedBy === userId);

      const filtered = visibleTasks.filter((task) => {
        // Excluir tareas archivadas (como en TasksTable)
        if (task.archived) {
          return false;
        }
        
        const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPriority = !priorityFilter || task.priority === priorityFilter;
        const matchesClient = !clientFilter || task.clientId === clientFilter;
        let matchesUser = true;
        if (userFilter === 'me') {
          matchesUser = getInvolvedUserIds(task).includes(userId);
        } else if (userFilter && userFilter !== 'me') {
          matchesUser = getInvolvedUserIds(task).includes(userFilter);
        }
        const passesFilters = matchesSearch && matchesPriority && matchesClient && matchesUser;

        console.log('[TasksKanban] Task filter check:', {
          taskId: task.id,
          taskName: task.name,
          status: task.status,
          archived: task.archived,
          assignedTo: task.AssignedTo,
          isAssignedToUser: task.AssignedTo.includes(userId),
          matchesSearch,
          matchesPriority,
          matchesClient,
          matchesUser,
          passesFilters,
        });
        return passesFilters;
      });

      return filtered;
    }, [tasks, searchQuery, priorityFilter, clientFilter, userFilter, userId, isAdmin]);

    useEffect(() => {
      setFilteredTasks(memoizedFilteredTasks);
      console.log('[TasksKanban] Updated filteredTasks:', {
        filteredCount: memoizedFilteredTasks.length,
        filteredTaskIds: memoizedFilteredTasks.map((t) => t.id),
        assignedToUser: memoizedFilteredTasks.filter((t) => t.AssignedTo.includes(userId)).map((t) => t.id),
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
    }, [memoizedFilteredTasks, userId]);

    useEffect(() => {
      const currentActionMenuRef = actionMenuRef.current;
      if (actionMenuOpenId && currentActionMenuRef) {
        gsap.fromTo(
          currentActionMenuRef,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
      }
      return () => {
        if (currentActionMenuRef) {
          gsap.killTweensOf(currentActionMenuRef);
        }
      };
    }, [actionMenuOpenId]);

    useEffect(() => {
      const priorityItems = priorityDropdownRef.current?.querySelector(`.${styles.dropdownItems}`);
      if (isPriorityDropdownOpen && priorityItems) {
        gsap.fromTo(
          priorityItems,
          { opacity: 0, y: -16, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
      }
    }, [isPriorityDropdownOpen]);

    useEffect(() => {
      const clientItems = clientDropdownRef.current?.querySelector(`.${styles.dropdownItems}`);
      if (isClientDropdownOpen && clientItems) {
        gsap.fromTo(
          clientItems,
          { opacity: 0, y: -16, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
      }
    }, [isClientDropdownOpen]);

    useEffect(() => {
      const userItems = userDropdownRef.current?.querySelector(`.${styles.dropdownItems}`);
      if (isUserDropdownOpen && userItems) {
        gsap.fromTo(
          userItems,
          { opacity: 0, y: -16, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
        console.log('[TasksKanban] User dropdown animated');
      }
    }, [isUserDropdownOpen]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          actionMenuRef.current &&
          !actionMenuRef.current.contains(event.target as Node) &&
          !actionButtonRefs.current.get(actionMenuOpenId || '')?.contains(event.target as Node)
        ) {
          setActionMenuOpenId(null);
        }
        if (
          priorityDropdownRef.current &&
          !priorityDropdownRef.current.contains(event.target as Node) &&
          isPriorityDropdownOpen
        ) {
          setIsPriorityDropdownOpen(false);
        }
        if (
          clientDropdownRef.current &&
          !clientDropdownRef.current.contains(event.target as Node) &&
          isClientDropdownOpen
        ) {
          setIsClientDropdownOpen(false);
        }
        if (
          userDropdownRef.current &&
          !userDropdownRef.current.contains(event.target as Node) &&
          isUserDropdownOpen
        ) {
          setIsUserDropdownOpen(false);
          console.log('[TasksKanban] User dropdown closed via outside click');
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [actionMenuOpenId, isPriorityDropdownOpen, isClientDropdownOpen, isUserDropdownOpen]);

    const animateClick = (element: HTMLElement) => {
      gsap.to(element, {
        scale: 0.95,
        opacity: 0.8,
        duration: 0.15,
        ease: 'power1.out',
        yoyo: true,
        repeat: 1,
      });
    };

    const handlePrioritySelect = (priority: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);

      const filterIcon = e.currentTarget.querySelector('img');
      if (filterIcon) {
        gsap.to(filterIcon, {
          rotation: 360,
          scale: 1.2,
          duration: 0.3,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
        });
      }

      setPriorityFilter(priority);
      setIsPriorityDropdownOpen(false);
    };

    const handleClientSelect = (clientId: string, e: React.MouseEvent<HTMLDivElement>) => {
      animateClick(e.currentTarget);

      const filterIcon = e.currentTarget.querySelector('img');
      if (filterIcon) {
        gsap.to(filterIcon, {
          rotation: 360,
          scale: 1.2,
          duration: 0.3,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
        });
      }

      setClientFilter(clientId);
      setIsClientDropdownOpen(false);
    };

    const handleDragStart = (event: DragStartEvent) => {
      const task = filteredTasks.find((t) => t.id === event.active.id);
      if (!task) return;

      setActiveTask(task);
      
      // Add visual feedback for touch devices
      if (isTouchDevice) {
        const taskElement = document.querySelector(`[data-dnd-id="${event.active.id}"]`);
        if (taskElement) {
          gsap.to(taskElement, {
            scale: 1.05,
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)',
            duration: 0.2,
            ease: 'power2.out',
          });
        }
      }
      
      const rect = document.querySelector(`[data-dnd-id="${event.active.id}"]`)?.getBoundingClientRect();
      if (rect) {
        startDragDebug(event.active.id.toString(), rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
      console.log('[TasksKanban] handleDragEnd called with:', {
        activeId: event.active.id,
        overId: event.over?.id,
        isAdmin,
        userId
      });

      stopDragDebug();
      setActiveTask(null);

      if (!isAdmin) {
        console.warn('[TasksKanban] Non-admin attempted to drag task:', { userId, draggableId: event.active.id });
        return;
      }

      if (!event.over) {
        console.log('[TasksKanban] Task dropped outside valid drop zone:', event.active.id);
        return;
      }

      const task = filteredTasks.find((t) => t.id === event.active.id);
      if (!task) {
        console.error('[TasksKanban] Task not found:', { draggableId: event.active.id });
        return;
      }

      console.log('[TasksKanban] Found task:', {
        id: task.id,
        name: task.name,
        status: task.status
      });

      // AGGRESSIVE SOLUTION: Direct mapping from drop target ID to status
      const dropTargetToStatus: { [key: string]: string } = {
        'por-iniciar': 'Por Iniciar',
        'diseno': 'Diseño',
        'desarrollo': 'Desarrollo',
        'en-proceso': 'En Proceso',
        'finalizado': 'Finalizado',
        'backlog': 'Backlog',
        'cancelado': 'Cancelado',
      };

      let targetColumnId = event.over.id.toString();
      
      // If the drop target is a task ID (not a column ID), find its parent column
      if (!dropTargetToStatus[targetColumnId]) {
        console.log('[TasksKanban] Drop target is not a column, looking for parent column:', targetColumnId);
        
        // Find which column contains this task
        const targetTask = filteredTasks.find(t => t.id === targetColumnId);
        if (targetTask) {
          const normalizedTargetStatus = normalizeStatus(targetTask.status);
          const targetColumn = statusColumns.find(col => col.title === normalizedTargetStatus);
          if (targetColumn) {
            targetColumnId = targetColumn.id;
            console.log('[TasksKanban] Found parent column for task:', targetColumnId);
          }
        }
      }

      const newStatus = dropTargetToStatus[targetColumnId];
      
      console.log('[TasksKanban] Aggressive mapping result:', {
        originalDropTargetId: event.over.id,
        resolvedColumnId: targetColumnId,
        newStatus,
        currentTaskStatus: task.status,
        willUpdate: newStatus && newStatus !== task.status
      });

      if (!newStatus) {
        console.error('[TasksKanban] Unknown drop target after resolution:', {
          originalId: event.over.id,
          resolvedColumnId: targetColumnId,
          availableColumns: Object.keys(dropTargetToStatus)
        });
        return;
      }

      if (newStatus === task.status) {
        console.log('[TasksKanban] Task dropped in same status, no update needed');
          return;
        }

      try {
        const taskElement = document.querySelector(`[data-dnd-id="${event.active.id}"]`);
        if (taskElement) {
          gsap.to(taskElement, {
            scale: 1,
            rotation: 0,
            duration: 0.2,
            ease: 'power2.out',
          });
        }

        console.log('[TasksKanban] Updating task status from', task.status, 'to', newStatus);

        const taskRef = doc(db, 'tasks', event.active.id.toString());
        await updateDoc(taskRef, {
          status: newStatus,
          lastActivity: new Date().toISOString(),
        });

        // Actualizar actividad y notificar
        await updateTaskActivity(event.active.id.toString(), 'status_change');

        // Enviar notificaciones a los usuarios involucrados
        const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
        if (task.CreatedBy) recipients.add(task.CreatedBy);
        recipients.delete(userId); // Excluir al usuario que realiza la acción
        const now = Timestamp.now();
        for (const recipientId of recipients) {
          await addDoc(collection(db, 'notifications'), {
            userId, // ID del usuario que realiza la acción
            taskId: task.id,
            message: `Usuario cambió el estado de la tarea "${task.name}" a "${newStatus}"`,
            timestamp: now,
            read: false,
            recipientId, // ID del usuario que recibe la notificación
            type: 'task_status_changed',
          });
          console.log('[TasksKanban] Sent status change notification to:', recipientId);
        }

        console.log('[TasksKanban] Task status updated successfully:', {
          taskId: event.active.id,
          fromStatus: task.status,
          toStatus: newStatus,
        });

        if (taskElement) {
          gsap.fromTo(
            taskElement,
            {
              scale: 1.05,
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            },
            {
              scale: 1,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              duration: 0.3,
              ease: 'power2.out',
            }
          );
        }

        const animateEmptyColumns = () => {
          const columns = document.querySelectorAll(`.${styles.kanbanColumn}`);
          columns.forEach((column) => {
            const taskList = column.querySelector(`.${styles.taskList}`);
            if (taskList && taskList.children.length === 0) {
              gsap.fromTo(
                taskList,
                { opacity: 0.5, scale: 0.95 },
                { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }
              );
            }
          });
        };

        setTimeout(animateEmptyColumns, 100);
      } catch (error) {
        console.error('[TasksKanban] Error updating task status:', error);

        const taskElement = document.querySelector(`[data-dnd-id="${event.active.id}"]`);
        if (taskElement) {
          gsap.to(taskElement, {
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            duration: 0.3,
            ease: 'power2.out',
          });
        }
      }
    };

    const handleArchiveTask = async (task: Task) => {
      try {
        // Guardar en undo stack
        const undoItem = {
          task: { ...task },
          action: 'archive' as const,
          timestamp: Date.now()
        };
        setUndoStack(prev => [...prev, undoItem]);
        setShowUndo(true);

        // Limpiar timeout anterior
        if (undoTimeoutRef.current) {
          clearTimeout(undoTimeoutRef.current);
        }

        // Configurar timeout para limpiar undo
        undoTimeoutRef.current = setTimeout(() => {
          setShowUndo(false);
          setUndoStack(prev => prev.filter(item => item.timestamp !== undoItem.timestamp));
        }, 3000);

        // Actualizar estado local optimísticamente
        setTasks((prevTasks) => 
          prevTasks.map((t) => 
            t.id === task.id 
              ? { ...t, archived: true, archivedAt: new Date().toISOString(), archivedBy: userId }
              : t
          )
        );
        
        // Ejecutar la función de archivo
        await archiveTask(task.id, userId, isAdmin, task);
        console.log('[TasksKanban] Task archived successfully:', task.id);
      } catch (error) {
        // Revertir el cambio si hay error
        setTasks((prevTasks) => 
          prevTasks.map((t) => 
            t.id === task.id 
              ? { ...t, archived: false, archivedAt: undefined, archivedBy: undefined }
              : t
          )
        );
        console.error('[TasksKanban] Error archiving task:', error);
      }
    };

    // Función para deshacer
    const handleUndo = useCallback(async (undoItem: {task: Task, action: 'archive' | 'unarchive', timestamp: number}) => {
      try {
        if (undoItem.action === 'archive') {
          // Desarchivar la tarea
          await archiveTask(undoItem.task.id, userId, isAdmin, undoItem.task);
          setTasks((prevTasks) => 
            prevTasks.map((t) => 
              t.id === undoItem.task.id 
                ? { ...t, archived: false, archivedAt: undefined, archivedBy: undefined }
                : t
            )
          );
        }
        
        // Remover del undo stack
        setUndoStack(prev => prev.filter(item => item.timestamp !== undoItem.timestamp));
        setShowUndo(false);
        
        if (undoTimeoutRef.current) {
          clearTimeout(undoTimeoutRef.current);
        }
      } catch (error) {
        console.error('[TasksKanban] Error undoing action:', error);
      }
    }, [userId, isAdmin]);

    const groupedTasks = useMemo(() => {
      const groups: { [key: string]: Task[] } = {};
      statusColumns.forEach((status) => {
        groups[status.id] = filteredTasks.filter((task) => normalizeStatus(task.status) === status.title);
      });

      console.log('[TasksKanban] Tasks grouped by status:', {
        groups: Object.keys(groups).map((statusId) => ({
          status: statusColumns.find((s) => s.id === statusId)?.title,
          taskCount: groups[statusId].length,
          taskIds: groups[statusId].map((t) => t.id),
          assignedToUser: groups[statusId].filter((t) => t.AssignedTo.includes(userId)).map((t) => t.id),
        })),
        allTaskStatuses: [...new Set(filteredTasks.map(t => t.status))],
        normalizedStatuses: [...new Set(filteredTasks.map(t => normalizeStatus(t.status)))]
      });
      return groups;
    }, [filteredTasks, userId, statusColumns]);

    useEffect(() => {
      const animateEmptyColumns = () => {
        statusColumns.forEach((status) => {
          const columnElement = document.querySelector(`[data-status="${status.id}"]`);
          if (columnElement) {
            const taskList = columnElement.querySelector(`.${styles.taskList}`);
            const taskCount = groupedTasks[status.id]?.length || 0;

            if (taskList) {
              if (taskCount === 0) {
                gsap.to(taskList, {
                  opacity: 0.5,
                  scale: 0.98,
                  duration: 0.3,
                  ease: 'power2.out',
                });
              } else {
                gsap.to(taskList, {
                  opacity: 1,
                  scale: 1,
                  duration: 0.3,
                  ease: 'power2.out',
                });
              }
            }
          }
        });
      };

      requestAnimationFrame(animateEmptyColumns);
    }, [groupedTasks, statusColumns]);

    useEffect(() => {
      if (!user?.id) return;

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
    }, [user?.id, isCacheValid]);

    useEffect(() => {
      if (!user?.id) return;

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
    }, [user?.id, isCacheValid]);

    useEffect(() => {
      if (!user?.id) return;

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
          const response = await fetch('/api/users');
          if (!response.ok) {
            throw new Error(`Failed to fetch users: ${response.status}`);
          }

          const clerkUsers: {
            id: string;
            imageUrl?: string;
            firstName?: string;
            lastName?: string;
            publicMetadata: { role?: string; description?: string };
          }[] = await response.json();

          const usersData: User[] = await Promise.all(
            clerkUsers.map(async (clerkUser) => {
              try {
                const userDoc = await getDoc(doc(db, 'users', clerkUser.id));
                return {
                  id: clerkUser.id,
                  imageUrl: clerkUser.imageUrl || '',
                  fullName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Sin nombre',
                  role: userDoc.exists() && userDoc.data().role
                    ? userDoc.data().role
                    : (clerkUser.publicMetadata.role || 'Sin rol'),
                };
              } catch {
                return {
                  id: clerkUser.id,
                  imageUrl: clerkUser.imageUrl || '',
                  fullName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Sin nombre',
                  role: clerkUser.publicMetadata.role || 'Sin rol',
                };
              }
            }),
          );

          usersRef.current = usersData;
          setUsers(usersData);

          tasksKanbanCache.users.set(cacheKey, {
            data: usersData,
            timestamp: Date.now(),
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
    }, [user?.id, isCacheValid]);

    // Cleanup all table listeners when component unmounts
    useEffect(() => {
      return () => {
        console.log('[TasksKanban] Cleaning up all table listeners on unmount');
        cleanupTasksKanbanListeners();
        
        // Cleanup undo timeout
        if (undoTimeoutRef.current) {
          clearTimeout(undoTimeoutRef.current);
        }
      };
    }, []);

    if (isLoading || isLoadingTasks || isLoadingClients || isLoadingUsers) {
      return <SkeletonLoader type="kanban" rows={6} />;
    }

    return (
      <div className={styles.container} ref={containerRef}>
        <div className={styles.swiperContainer}>
          <UserSwiper onOpenProfile={onOpenProfile} onMessageSidebarOpen={onMessageSidebarOpen} />
        </div>
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
              <div className={styles.filter}>
                <div className={styles.dropdownContainer} ref={priorityDropdownRef}>
                  <div
                    className={styles.dropdownTrigger}
                    onClick={(e) => {
                      animateClick(e.currentTarget);
                      setIsPriorityDropdownOpen((prev) => {
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
            )}
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
          </div>
        </div>
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
                        clients={clients}
                        users={users}
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
                        {clients.find((c) => c.id === activeTask.clientId) ? (
                          <Image
                            style={{ borderRadius: '999px' }}
                            src={clients.find((c) => c.id === activeTask.clientId)?.imageUrl || '/empty-image.png'}
                            alt={clients.find((c) => c.id === activeTask.clientId)?.name || 'Client Image'}
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
                  <AvatarGroup assignedUserIds={activeTask.AssignedTo} users={users} currentUserId={userId} />
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        <DebugOverlay debugInfo={debugInfo} />
        
        {/* Undo notification */}
        <AnimatePresence>
          {showUndo && undoStack.length > 0 && (
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
                <span>Tarea archivada</span>
              </div>
              <button
                onClick={() => {
                  const lastUndoItem = undoStack[undoStack.length - 1];
                  if (lastUndoItem) {
                    handleUndo(lastUndoItem);
                  }
                }}
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
  }
);

TasksKanban.displayName = 'TasksKanban';

export default TasksKanban;