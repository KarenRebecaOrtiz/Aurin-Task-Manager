'use client';

import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, addDoc, doc, updateDoc, onSnapshot, query, getDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import Image from 'next/image';
import { gsap } from 'gsap';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { db } from '@/lib/firebase'; // Kept for deleteTask and dragEnd logic
import ActionMenu from './ui/ActionMenu';
import styles from './TasksTable.module.scss';
import avatarStyles from './ui/AvatarGroup.module.scss';
import UserSwiper from '@/components/UserSwiper';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import Loader from '@/components/Loader'; // Import Loader for loading state
import { updateTaskActivity } from '@/lib/taskUtils';

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
}

type TaskView = 'table' | 'kanban';

// Cache global persistente para TasksKanban
const tasksKanbanCache = {
  tasks: new Map<string, { data: Task[]; timestamp: number }>(),
  clients: new Map<string, { data: Client[]; timestamp: number }>(),
  users: new Map<string, { data: User[]; timestamp: number }>(),
  listeners: new Map<string, { tasks: (() => void) | null; clients: (() => void) | null; users: (() => void) | null }>(),
};

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

// Función para limpiar listeners de TasksKanban
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
    
    // Estados optimizados con refs para evitar re-renders
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
    
    const containerRef = useRef<HTMLDivElement>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const priorityDropdownRef = useRef<HTMLDivElement>(null);
    const clientDropdownRef = useRef<HTMLDivElement>(null);
    const userDropdownRef = useRef<HTMLDivElement>(null);
    const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

    const userId = useMemo(() => user?.id || '', [user]);

    // Función para verificar cache válido
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
      // Animate filter change
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

    // Función helper para manejar shortcuts de teclado en inputs
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

    // Removed local isAdmin fetch useEffect

    // Detect touch device
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

    // GSAP Animation for appearance and disappearance
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
        ? tasks // Admins see all tasks
        : tasks.filter((task) => task.AssignedTo.includes(userId) || task.CreatedBy === userId); // Non-admins see only assigned or created tasks
      
      const filtered = visibleTasks.filter((task) => {
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

      // Animate task cards when filtering changes - use setTimeout to avoid DOM access during render
      setTimeout(() => {
        const taskCards = document.querySelectorAll(`.${styles.taskCard}`);
        taskCards.forEach((card, index) => {
          gsap.fromTo(
            card,
            { 
              opacity: 0, 
              y: 20, 
              scale: 0.95,
              rotationX: -5
            },
            { 
              opacity: 1, 
              y: 0, 
              scale: 1,
              rotationX: 0,
              duration: 0.4,
              delay: index * 0.05,
              ease: 'power2.out'
            }
          );
        });

        // Animate column headers with task counts
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
                ease: 'power2.out'
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
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
      }
    }, [isPriorityDropdownOpen]);

    useEffect(() => {
      const clientItems = clientDropdownRef.current?.querySelector(`.${styles.dropdownItems}`);
      if (isClientDropdownOpen && clientItems) {
        gsap.fromTo(
          clientItems,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
      }
    }, [isClientDropdownOpen]);

    useEffect(() => {
      const userItems = userDropdownRef.current?.querySelector(`.${styles.dropdownItems}`);
      if (isUserDropdownOpen && userItems) {
        gsap.fromTo(
          userItems,
          { opacity: 0, y: -10, scale: 0.95 },
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
      
      setClientFilter(clientId);
      setIsClientDropdownOpen(false);
    };

    const handleDragEnd = async (result: DropResult) => {
      const { destination, source, draggableId } = result;

      if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
        console.log('[TasksKanban] Drag cancelled: No valid destination or same position', {
          draggableId,
          source: source.droppableId,
          destination: destination?.droppableId,
        });
        return;
      }

      if (!isAdmin) {
        console.warn('[TasksKanban] Non-admin attempted to drag task:', { userId, draggableId });
        alert('Solo los administradores pueden mover tareas.');
        return;
      }

      const sourceStatus = statusColumns.find((status) => status.id === source.droppableId)?.title;
      const destStatus = statusColumns.find((status) => status.id === destination.droppableId)?.title;

      if (!sourceStatus || !destStatus) {
        console.error('[TasksKanban] Invalid status mapping:', {
          sourceStatus,
          destStatus,
          sourceId: source.droppableId,
          destId: destination.droppableId,
        });
        return;
      }

      const task = filteredTasks.find((t) => t.id === draggableId);
      if (!task) {
        console.error('[TasksKanban] Task not found:', { draggableId });
        return;
      }

      try {
        // Optimistic UI update
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: destStatus } : t))
        );

        // Animate the task card
        const taskElement = document.querySelector(`[data-rfd-draggable-id="${draggableId}"]`);
        if (taskElement) {
          gsap.to(taskElement, {
            scale: 1.05,
            backgroundColor: '#e6f4ff',
            duration: 0.2,
            ease: 'power2.out',
            yoyo: true,
            repeat: 1,
          });
        }

        // Update Firestore
        await updateDoc(doc(db, 'tasks', task.id), { status: destStatus });
        
        // Actualizar la actividad de la tarea
        await updateTaskActivity(task.id, 'status_change');
        
        console.log('[TasksKanban] Task moved successfully:', {
          taskId: task.id,
          taskName: task.name,
          fromStatus: sourceStatus,
          toStatus: destStatus,
        });

        // Notify involved users
        const recipients = new Set<string>([...task.AssignedTo, ...task.LeadedBy]);
        if (task.CreatedBy) recipients.add(task.CreatedBy);
        recipients.delete(userId);
        for (const recipientId of Array.from(recipients)) {
          await addDoc(collection(db, 'notifications'), {
            userId: userId,
            taskId: task.id,
            message: `${user?.firstName || 'Usuario'} cambió el estado de la tarea ${task.name} a ${destStatus}`,
            timestamp: Timestamp.now(),
            read: false,
            recipientId,
          });
        }
      } catch (error) {
        console.error('[TasksKanban] Error moving task:', {
          taskId: task.id,
          error: error instanceof Error ? error.message : JSON.stringify(error),
        });
        // Revert optimistic update
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: sourceStatus } : t))
        );
        alert('Error al mover la tarea. Por favor, intenta de nuevo.');
      }
    };

    const groupedTasks = useMemo(() => {
      const groups: { [key: string]: Task[] } = {};
      statusColumns.forEach((status) => {
        groups[status.id] = filteredTasks.filter((task) => task.status === status.title);
      });
      
      console.log('[TasksKanban] Tasks grouped by status:', {
        groups: Object.keys(groups).map((statusId) => ({
          status: statusColumns.find((s) => s.id === statusId)?.title,
          taskCount: groups[statusId].length,
          taskIds: groups[statusId].map((t) => t.id),
          assignedToUser: groups[statusId].filter((t) => t.AssignedTo.includes(userId)).map((t) => t.id),
        })),
      });
      return groups;
    }, [filteredTasks, userId, statusColumns]);

    // Handle animations for empty columns
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
                  ease: 'power2.out'
                });
              } else {
                gsap.to(taskList, {
                  opacity: 1,
                  scale: 1,
                  duration: 0.3,
                  ease: 'power2.out'
                });
              }
            }
          }
        });
      };

      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(animateEmptyColumns);
    }, [groupedTasks, statusColumns]);

    // Setup de tasks con cache optimizado
    useEffect(() => {
      if (!user?.id) return;

      const cacheKey = `tasks_${user.id}`;
      
      // Verificar si ya existe un listener para este usuario
      const existingListener = tasksKanbanCache.listeners.get(cacheKey);
      
      if (existingListener?.tasks) {
        console.log('[TasksKanban] Reusing existing tasks listener');
        // El listener ya existe, solo actualizar los datos si hay cache
        if (tasksKanbanCache.tasks.has(cacheKey)) {
          const cachedData = tasksKanbanCache.tasks.get(cacheKey)!.data;
          tasksRef.current = cachedData;
          setTasks(cachedData);
          setIsLoadingTasks(false);
        }
        return;
      }
      
      // Verificar cache primero
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
            startDate: doc.data().startDate ? doc.data().startDate.toDate().toISOString() : null,
            endDate: doc.data().endDate ? doc.data().endDate.toDate().toISOString() : null,
            LeadedBy: doc.data().LeadedBy || [],
            AssignedTo: doc.data().AssignedTo || [],
            createdAt: doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
            CreatedBy: doc.data().CreatedBy || '',
            lastActivity: doc.data().lastActivity?.toDate().toISOString() || doc.data().createdAt?.toDate().toISOString() || new Date().toISOString(),
            hasUnreadUpdates: doc.data().hasUnreadUpdates || false,
            lastViewedBy: doc.data().lastViewedBy || {},
          }));

          console.log('[TasksKanban] Tasks onSnapshot update:', tasksData.length);
          
          tasksRef.current = tasksData;
          setTasks(tasksData);
          
          // Actualizar cache
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

      // Guardar el listener en el cache global
      tasksKanbanCache.listeners.set(cacheKey, {
        tasks: unsubscribeTasks,
        clients: existingListener?.clients || null,
        users: existingListener?.users || null,
      });

      return () => {
        // No limpiar el listener aquí, solo marcar como no disponible para este componente
      };
    }, [user?.id, isCacheValid]);

    // Setup de clients con cache optimizado
    useEffect(() => {
      if (!user?.id) return;

      const cacheKey = `clients_${user.id}`;
      
      // Verificar si ya existe un listener para este usuario
      const existingListener = tasksKanbanCache.listeners.get(cacheKey);
      
      if (existingListener?.clients) {
        console.log('[TasksKanban] Reusing existing clients listener');
        // El listener ya existe, solo actualizar los datos si hay cache
        if (tasksKanbanCache.clients.has(cacheKey)) {
          const cachedData = tasksKanbanCache.clients.get(cacheKey)!.data;
          clientsRef.current = cachedData;
          setClients(cachedData);
          setIsLoadingClients(false);
        }
        return;
      }
      
      // Verificar cache primero
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
          
          // Actualizar cache
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

      // Guardar el listener en el cache global
      tasksKanbanCache.listeners.set(cacheKey, {
        tasks: existingListener?.tasks || null,
        clients: unsubscribeClients,
        users: existingListener?.users || null,
      });

      return () => {
        // No limpiar el listener aquí, solo marcar como no disponible para este componente
      };
    }, [user?.id, isCacheValid]);

    // Setup de users con cache optimizado
    useEffect(() => {
      if (!user?.id) return;

      const cacheKey = `users_${user.id}`;
      
      // Verificar si ya existe un listener para este usuario
      const existingListener = tasksKanbanCache.listeners.get(cacheKey);
      
      if (existingListener?.users) {
        console.log('[TasksKanban] Reusing existing users listener');
        // El listener ya existe, solo actualizar los datos si hay cache
        if (tasksKanbanCache.users.has(cacheKey)) {
          const cachedData = tasksKanbanCache.users.get(cacheKey)!.data;
          usersRef.current = cachedData;
          setUsers(cachedData);
          setIsLoadingUsers(false);
        }
        return;
      }
      
      // Verificar cache primero
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

      // Usar la misma lógica de fetch que MembersTable
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
          
          // Actualizar cache
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

      // Guardar el listener en el cache global (para este caso, no hay onSnapshot)
      tasksKanbanCache.listeners.set(cacheKey, {
        tasks: existingListener?.tasks || null,
        clients: existingListener?.clients || null,
        users: null, // No hay listener para users, solo fetch
      });

      return () => {
        // No limpiar el listener aquí, solo marcar como no disponible para este componente
      };
    }, [user?.id, isCacheValid]);

    // Handle loading state
    if (isLoading || isLoadingTasks || isLoadingClients || isLoadingUsers) {
      return <Loader />;
    }

    return (
      <div className={styles.container} ref={containerRef}>
        <div className={styles.swiperContainer}>
          <UserSwiper onOpenProfile={onOpenProfile} onMessageSidebarOpen={onMessageSidebarOpen} />
        </div>
        <div className={styles.header} style={{margin: '20px 0px'}}>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Buscar Tareas"
              value={searchQuery}
              onChange={(e) => {
                const newValue = e.target.value;
                setSearchQuery(newValue);
                
                // Animate search input when typing
                const searchInput = e.currentTarget;
                gsap.to(searchInput, {
                  scale: 1.02,
                  duration: 0.2,
                  ease: 'power2.out',
                  yoyo: true,
                  repeat: 1
                });
                
                console.log('[TasksKanban] Search query updated:', newValue);
              }}
              className={styles.searchInput}
              aria-label="Buscar tareas"
              onKeyDown={handleInputKeyDown}
            />
          </div>

          <div className={styles.filtersWrapper}>
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
            <div className={styles.filter}>
              <div className={styles.dropdownContainer} ref={priorityDropdownRef}>
                <div
                  className={styles.dropdownTrigger}
                  onClick={(e) => {
                    animateClick(e.currentTarget);
                    setIsPriorityDropdownOpen((prev) => !prev);
                  }}
                >
                  <Image className="filterIcon" src="/filter.svg" alt="Priority" width={12} height={12} />
                  <span>{priorityFilter || 'Prioridad'}</span>
                </div>
                {isPriorityDropdownOpen && (
                  <div className={styles.dropdownItems}>
                    {['Alta', 'Media', 'Baja', ''].map((priority) => (
                      <div
                        key={priority || 'all'}
                        className={styles.dropdownItem}
                        onClick={(e) => handlePrioritySelect(priority, e)}
                      >
                        {priority || 'Todos'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className={styles.filter}>
              <div className={styles.dropdownContainer} ref={clientDropdownRef}>
                <div
                  className={styles.dropdownTrigger}
                  onClick={(e) => {
                    animateClick(e.currentTarget);
                    setIsClientDropdownOpen((prev) => !prev);
                  }}
                >
                  <Image className="filterIcon" src="/filter.svg" alt="Client" width={12} height={12} />
                  <span>{clients.find((c) => c.id === clientFilter)?.name || 'Cuenta'}</span>
                </div>
                {isClientDropdownOpen && (
                  <div className={styles.dropdownItems}>
                    {[{ id: '', name: 'Todos' }, ...clients].map((client) => (
                      <div
                        key={client.id || 'all'}
                        className={styles.dropdownItem}
                        onClick={(e) => handleClientSelect(client.id, e)}
                      >
                        {client.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {isAdmin && (
              <div className={styles.filter}>
                <div className={styles.dropdownContainer} ref={userDropdownRef}>
                  <div
                    className={styles.dropdownTrigger}
                    onClick={(e) => {
                      animateClick(e.currentTarget);
                      setIsUserDropdownOpen((prev) => !prev);
                      console.log('[TasksKanban] User dropdown toggled');
                    }}
                  >
                    <Image className="filterIcon" src="/filter.svg" alt="User" width={12} height={12} />
                    <span>
                      {userFilter === '' 
                        ? 'Todos' 
                        : userFilter === 'me' 
                        ? 'Mis tareas' 
                        : users.find(u => u.id === userFilter)?.fullName || 'Usuario'}
                    </span>
                  </div>
                  {isUserDropdownOpen && (
                    <div className={styles.dropdownItems}>
                      <div
                        className={styles.dropdownItem}
                        style={{fontWeight: userFilter === '' ? 700 : 400}}
                        onClick={() => handleUserFilter('')}
                      >
                        Todos
                      </div>
                      <div
                        className={styles.dropdownItem}
                        style={{fontWeight: userFilter === 'me' ? 700 : 400}}
                        onClick={() => handleUserFilter('me')}
                      >
                        Mis tareas
                      </div>
                      {users
                        .filter((u) => u.id !== userId)
                        .map((u) => (
                          <div
                            key={u.id}
                            className={styles.dropdownItem}
                            style={{fontWeight: userFilter === u.id ? 700 : 400}}
                            onClick={() => handleUserFilter(u.id)}
                          >
                            {u.fullName}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}
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
          </div>
        </div>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className={styles.kanbanBoard}>
            {statusColumns.map((column) => (
              <Droppable droppableId={column.id} key={column.id}>
                {(provided, snapshot) => (
                  <div
                    className={`${styles.kanbanColumn} ${snapshot.isDraggingOver ? styles.draggingOver : ''}`}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    data-status={column.id}
                  >
                    <div className={styles.columnHeader}>
                      <h2 className={styles.columnTitle}>{column.title}</h2>
                      <span className={styles.taskCount}>
                        {groupedTasks[column.id]?.length || 0}
                      </span>
                    </div>
                    <div className={styles.taskList}>
                      {groupedTasks[column.id]?.map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={task.id}
                          index={index}
                          isDragDisabled={!isAdmin} // Dragging reserved for admins
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`${styles.taskCard} ${snapshot.isDragging ? styles.dragging : ''} ${isAdmin && isTouchDevice ? styles.touchDraggable : ''}`}
                              onClick={() => {
                                onChatSidebarOpen(task);
                                console.log('[TasksKanban] Task card clicked, opening chat for task:', task.id);
                              }}
                              style={{
                                ...provided.draggableProps.style,
                                cursor: isAdmin ? 'grab' : 'pointer',
                                touchAction: isAdmin ? 'none' : 'auto', // Enable touch dragging for admins
                              }}
                            >
                              <div className={styles.taskHeader}>
                                <span className={styles.taskName}>{task.name}</span>
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
                                <AvatarGroup assignedUserIds={task.AssignedTo} users={users} currentUserId={userId} />
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>
    );
  },
);

TasksKanban.displayName = 'TasksKanban';

export default TasksKanban;