'use client';

import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import Image from 'next/image';
import { gsap } from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, onSnapshot, query, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Table from './Table';
import ActionMenu from './ui/ActionMenu';
import styles from './TasksTable.module.scss';
import avatarStyles from './ui/AvatarGroup.module.scss';
import UserSwiper from '@/components/UserSwiper';
import { useAuth } from '@/contexts/AuthContext';
import SkeletonLoader from '@/components/SkeletonLoader';
import { getLastActivityTimestamp, archiveTask } from '@/lib/taskUtils';
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







// Helper function to normalize status values (same as TasksKanban)
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
};

interface AvatarGroupProps {
  assignedUserIds: string[];
  leadedByUserIds: string[];
  users: User[];
  currentUserId: string;
}

// Eliminar todo el sistema de caché global
const cleanupTasksTableListeners = () => {
  console.log('[TasksTable] Cleaning up all table listeners');
};

const AvatarGroup: React.FC<AvatarGroupProps> = ({ assignedUserIds, leadedByUserIds, users, currentUserId }) => {
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
              width={40}
              height={40}
              className={avatarStyles.avatarImage}
              onError={(e) => {
                e.currentTarget.src = '/empty-image.png';
              }}
            />
          </div>
        ))
      ) : (
        <span>No asignados</span>
      )}
    </div>
  );
};

interface TasksTableProps {
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

const TasksTable: React.FC<TasksTableProps> = memo(
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
    



    // Estados optimizados con refs para evitar re-renders
    // const tasksRef = useRef<Task[]>([]);
    // const clientsRef = useRef<Client[]>([]);
    // const usersRef = useRef<User[]>([]);
    
    // Estados locales - solo se usan si no hay externalTasks
    // const [tasks, setTasks] = useState<Task[]>([]);
    // const [clients, setClients] = useState<Client[]>([]);
    // const [users, setUsers] = useState<User[]>([]);
    const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
    const [sortKey, setSortKey] = useState<string>('lastActivity');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [searchQuery, setSearchQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState<string>('');
    const [clientFilter, setClientFilter] = useState<string>('');
    const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);
    const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    const [isLoadingClients, setIsLoadingClients] = useState(true);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);

    const actionMenuRef = useRef<HTMLDivElement>(null);
    const priorityDropdownRef = useRef<HTMLDivElement>(null);
    const clientDropdownRef = useRef<HTMLDivElement>(null);
    const userDropdownRef = useRef<HTMLDivElement>(null);
    const actionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
    const [userFilter, setUserFilter] = useState<string>('');

    // Estado para undo
    const [undoStack, setUndoStack] = useState<Array<{task: Task, action: 'archive' | 'unarchive', timestamp: number}>>([]);
    const [showUndo, setShowUndo] = useState(false);
    const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const userId = useMemo(() => user?.id || '', [user]);

    // PRIORIZAR external data para asegurar sincronización con TasksPage
    const effectiveTasks = useMemo(() => externalTasks ?? [], [externalTasks]);
    const effectiveClients = useMemo(() => externalClients ?? [], [externalClients]);
    const effectiveUsers = useMemo(() => externalUsers ?? [], [externalUsers]);

    // Usar un ref para trackear los IDs de tareas en lugar del array completo
    const effectiveTasksIds = useMemo(() => effectiveTasks.map(t => t.id).join(','), [effectiveTasks]);

    // Extraer expresión compleja de dependencias
    const statusChangesString = useMemo(() => effectiveTasks.map(t => t.status).join(','), [effectiveTasks]);

    // Agregar logging para debuggear cambios de estado
    useEffect(() => {
      console.log('[TasksTable] Effective tasks updated:', {
        count: effectiveTasks.length,
        taskIds: effectiveTasks.map(t => t.id),
        statuses: effectiveTasks.map(t => ({ id: t.id, status: t.status, name: t.name })),
        timestamp: new Date().toISOString(),
        hasExternalTasks: !!externalTasks
      });
    }, [effectiveTasks, externalTasks]);

    // Forzar refresco cuando cambie el estado de cualquier tarea
    useEffect(() => {
      const statusChanges = effectiveTasks.map(t => `${t.id}-${t.status}`).join(',');
      console.log('[TasksTable] Status changes detected:', statusChanges);
      
      // Forzar re-render del componente
      setFilteredTasks([...effectiveTasks]);
      
      // Forzar re-render adicional para cambios de estado
      if (effectiveTasks.length > 0) {
        const hasStatusChanges = effectiveTasks.some(task => 
          task.status && task.status !== 'Por Iniciar'
        );
        
        if (hasStatusChanges) {
          console.log('[TasksTable] Forcing immediate re-render due to status changes');
          // Forzar re-render del componente
          setFilteredTasks([...effectiveTasks]);
        }
      }
    }, [statusChangesString, effectiveTasks]);

    // Usar el hook de notificaciones simplificado
    const { getUnreadCount, markAsViewed } = useTaskNotifications();

    // Setup de tasks con actualizaciones en tiempo real - ELIMINAR DUPLICADO
    useEffect(() => {
      if (!user?.id) return;

      console.log('[TasksTable] Using shared tasks state - no duplicate onSnapshot');
      
      // No establecer onSnapshot aquí - usar siempre externalTasks del hook compartido
      if (externalTasks) {
        console.log('[TasksTable] Using external tasks from shared state:', externalTasks.length);
        setIsLoadingTasks(false);
      }
    }, [user?.id, externalTasks]);

    // Setup de clients con actualizaciones en tiempo real
    useEffect(() => {
      if (!user?.id || externalClients) return;

      console.log('[TasksTable] Setting up clients listener');
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

          console.log('[TasksTable] Clients onSnapshot update:', clientsData.length);
          
          // Actualizar estado directamente sin caché
          // clientsRef.current = clientsData;
          // setClients(clientsData);
          setIsLoadingClients(false);
        },
        (error) => {
          console.error('[TasksTable] Error in clients onSnapshot:', error);
          // setClients([]);
          setIsLoadingClients(false);
        }
      );

      return () => {
        unsubscribeClients();
      };
    }, [user?.id, externalClients]);

    // Setup de users con actualizaciones en tiempo real
    useEffect(() => {
      if (!user?.id || externalUsers) return;

      console.log('[TasksTable] Setting up users fetch');
      setIsLoadingUsers(true);

      // Fetch users
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
          
          // Actualizar estado directamente sin caché
          // usersRef.current = usersData;
          // setUsers(usersData);
          
          console.log('[TasksTable] Users fetched:', {
            total: usersData.length,
            withImages: usersData.filter(u => u.imageUrl).length,
            withoutImages: usersData.filter(u => !u.imageUrl).length
          });
        } catch (error) {
          console.error('[TasksTable] Error fetching users:', error);
          if (/* usersRef.current.length === 0 */ false) {
            // setUsers([]);
          }
        } finally {
          setIsLoadingUsers(false);
        }
      };

      // Ejecutar fetch inicial
      fetchUsers();

      // Setup listener para cambios en usuarios
      const usersQuery = query(collection(db, 'users'));
      const unsubscribeUsers = onSnapshot(usersQuery, () => {
        // Re-fetch users cuando hay cambios
        fetchUsers();
      });

      return () => {
        unsubscribeUsers();
      };
    }, [user?.id, externalUsers]);

    useEffect(() => {
      // Inicializar filteredTasks directamente con effectiveTasks
      // NO comparar con JSON.stringify ya que esto interfiere con los filtros
      setFilteredTasks(effectiveTasks);
    }, [effectiveTasksIds, effectiveTasks]); // Usar string de IDs en lugar del array completo

    const getInvolvedUserIds = useCallback((task: Task) => {
      const ids = new Set<string>();
      if (task.CreatedBy) ids.add(task.CreatedBy);
      if (Array.isArray(task.AssignedTo)) task.AssignedTo.forEach((id) => ids.add(id));
      if (Array.isArray(task.LeadedBy)) task.LeadedBy.forEach((id) => ids.add(id));
      return Array.from(ids);
    }, []);

    const handleUserFilter = useCallback((id: string) => {
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
    }, []);

    const memoizedFilteredTasks = useMemo(() => {
      console.log('[TasksTable] Recalculating filtered tasks:', {
        effectiveTasksCount: effectiveTasks.length,
        effectiveTasksIds: effectiveTasks.map(t => t.id),
        effectiveTasksStatuses: effectiveTasks.map(t => ({ id: t.id, status: t.status })),
        searchQuery,
        priorityFilter,
        clientFilter,
        userFilter
      });

      const filtered = effectiveTasks.filter((task) => {
        // Excluir tareas archivadas (redundante ahora que TasksPage filtra)
        if (task.archived) {
          return false;
        }
        
        // Filtro de búsqueda
        const matchesSearch = !searchQuery || task.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Filtro de prioridad
        const matchesPriority = !priorityFilter || task.priority === priorityFilter;
        
        // Filtro de cliente
        const matchesClient = !clientFilter || task.clientId === clientFilter;
        
        // Filtro de usuario
        let matchesUser = true;
        if (userFilter === 'me') {
          const involvedUserIds = getInvolvedUserIds(task);
          matchesUser = involvedUserIds.includes(userId);
        } else if (userFilter && userFilter !== 'me') {
          const involvedUserIds = getInvolvedUserIds(task);
          matchesUser = involvedUserIds.includes(userFilter);
        }

        return matchesSearch && matchesPriority && matchesClient && matchesUser;
      });

      console.log('[TasksTable] Filtered tasks result:', {
        filteredCount: filtered.length,
        filteredTaskIds: filtered.map(t => t.id),
        filteredTaskStatuses: filtered.map(t => ({ id: t.id, status: t.status }))
      });

      return filtered;
    }, [effectiveTasks, searchQuery, priorityFilter, clientFilter, userFilter, userId, getInvolvedUserIds]);

    // Crear un ID estable para las tareas filtradas
    const filteredTasksIds = useMemo(() => memoizedFilteredTasks.map(t => t.id).join(','), [memoizedFilteredTasks]);
    
    // Usar ref para evitar problemas de dependencias
    const memoizedFilteredTasksRef = useRef(memoizedFilteredTasks);
    memoizedFilteredTasksRef.current = memoizedFilteredTasks;

    useEffect(() => {
      setFilteredTasks(memoizedFilteredTasksRef.current);
    }, [filteredTasksIds]); // Solo usar el ID estable como dependencia

    // Función para manejar el clic en una fila de tarea
    const handleTaskRowClick = async (task: Task) => {
      // Marcar la tarea como vista usando el nuevo sistema
      await markAsViewed(task.id);
      
      // Abrir el chat de la tarea
      onChatSidebarOpen(task);
      console.log('[TasksTable] Row clicked, opening chat for task:', task.id);
    };

    useEffect(() => {
      const currentActionMenuRef = actionMenuRef.current;
      if (actionMenuOpenId && currentActionMenuRef) {
        gsap.fromTo(
          currentActionMenuRef,
          { opacity: 0, y: -10, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
        );
        console.log('[TasksTable] Action menu animated for task:', actionMenuOpenId);
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
        console.log('[TasksTable] Priority dropdown animated');
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
        console.log('[TasksTable] Client dropdown animated');
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
        console.log('[TasksTable] User dropdown animated');
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
          console.log('[TasksTable] Action menu closed via outside click');
        }
        if (
          priorityDropdownRef.current &&
          !priorityDropdownRef.current.contains(event.target as Node) &&
          isPriorityDropdownOpen
        ) {
          setIsPriorityDropdownOpen(false);
          console.log('[TasksTable] Priority dropdown closed via outside click');
        }
        if (
          clientDropdownRef.current &&
          !clientDropdownRef.current.contains(event.target as Node) &&
          isClientDropdownOpen
        ) {
          setIsClientDropdownOpen(false);
          console.log('[TasksTable] Client dropdown closed via outside click');
        }
        if (
          userDropdownRef.current &&
          !userDropdownRef.current.contains(event.target as Node) &&
          isUserDropdownOpen
        ) {
          setIsUserDropdownOpen(false);
          console.log('[TasksTable] User dropdown closed via outside click');
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [actionMenuOpenId, isPriorityDropdownOpen, isClientDropdownOpen, isUserDropdownOpen]);

    const handleSort = (key: string) => {
      if (key === sortKey) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDirection(key === 'createdAt' ? 'desc' : 'asc');
      }
      console.log('[TasksTable] Sorting tasks:', { sortKey: key, sortDirection });
    };

    const sortedTasks = useMemo(() => {
      const sorted = [...filteredTasks];
      if (sortKey === 'lastActivity') {
        sorted.sort((a, b) => {
          const activityA = getLastActivityTimestamp(a);
          const activityB = getLastActivityTimestamp(b);
          return sortDirection === 'asc' ? activityA - activityB : activityB - activityA;
        });
      } else if (sortKey === 'clientId') {
        sorted.sort((a, b) => {
          const clientA = effectiveClients.find((c) => c.id === a.clientId)?.name || '';
          const clientB = effectiveClients.find((c) => c.id === b.clientId)?.name || '';
          return sortDirection === 'asc'
            ? clientA.localeCompare(clientB)
            : clientB.localeCompare(clientA);
        });
      } else if (sortKey === 'status') {
        const statusOrder = ['Por Iniciar', 'Diseño', 'Desarrollo', 'En Proceso', 'Finalizado', 'Backlog', 'Cancelado'];
        sorted.sort((a, b) => {
          const indexA = statusOrder.indexOf(normalizeStatus(a.status));
          const indexB = statusOrder.indexOf(normalizeStatus(b.status));
          return sortDirection === 'asc' ? indexA - indexB : indexB - indexA;
        });
      } else if (sortKey === 'priority') {
        const priorityOrder = ['Alta', 'Media', 'Baja'];
        sorted.sort((a, b) => {
          const indexA = priorityOrder.indexOf(a.priority);
          const indexB = priorityOrder.indexOf(b.priority);
          return sortDirection === 'asc' ? indexA - indexB : indexB - indexA;
        });
      } else if (sortKey === 'createdAt') {
        sorted.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        });
      } else {
        sorted.sort((a, b) =>
          sortDirection === 'asc'
            ? String(a[sortKey as keyof Task]).localeCompare(String(b[sortKey as keyof Task]))
            : String(b[sortKey as keyof Task]).localeCompare(String(a[sortKey as keyof Task])),
        );
      }
      console.log('[TasksTable] Tasks sorted:', {
        sortedCount: sorted.length,
        sortedTaskIds: sorted.map((t) => t.id),
        sortKey,
        sortDirection,
      });
      return sorted;
    }, [filteredTasks, sortKey, sortDirection, effectiveClients]);

    const animateClick = (element: HTMLElement) => {
      gsap.to(element, {
        scale: 0.95,
        opacity: 0.8,
        duration: 0.15,
        ease: 'power1.out',
        yoyo: true,
        repeat: 1,
      });
      console.log('[TasksTable] Click animation triggered');
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

    // Función para obtener las clases CSS de una fila de tarea
    const getRowClassName = useCallback(() => {
      return ''; // Removido el indicador de actualización de la fila completa
    }, []);

    const baseColumns = [
      {
        key: 'clientId',
        label: 'Cuenta',
        width: '20%',
        mobileVisible: false,
      },
      {
        key: 'name',
        label: 'Tarea',
        width: '60%', 
        mobileVisible: true,
      },
      {
        key: 'notificationDot',
        label: '',
        width: '20%',
        mobileVisible: true,
      },
      {
        key: 'assignedTo',
        label: 'Asignados',
        width: '20%',
        mobileVisible: false,
      },
      {
        key: 'status',
        label: 'Estado',
        width: '30%', 
        mobileVisible: false,
      },
      {
        key: 'priority',
        label: 'Prioridad',
        width: '10%',
        mobileVisible: false,
      },
      {
        key: 'action',
        label: 'Acciones',
        width: '10%',
        mobileVisible: false,
      },
    ];

    const columns = baseColumns.map((col) => {
      if (col.key === 'clientId') {
        return {
          ...col,
          render: (task: Task) => {
            const client = effectiveClients.find((c) => c.id === task.clientId);
            console.log('[TasksTable] Rendering client column:', {
              taskId: task.id,
              clientId: task.clientId,
              clientName: client?.name,
            });
            return client ? (
              <div className={styles.clientWrapper}>
                <Image
                  style={{ borderRadius: '999px' }}
                  src={client.imageUrl || '/empty-image.png'}
                  alt={client.name || 'Client Image'}
                  width={40}
                  height={40}
                  className={styles.clientImage}
                  onError={(e) => {
                    e.currentTarget.src = '/empty-image.png';
                  }}
                />
              </div>
            ) : 'Sin cuenta';
          },
        };
      }
      if (col.key === 'name') {
        return {
          ...col,
          render: (task: Task) => {
            return (
              <div className={styles.taskNameWrapper}>
                <span className={styles.taskName}>{task.name}</span>
              </div>
            );
          },
        };
      }
      if (col.key === 'notificationDot') {
        return {
          ...col,
          render: (task: Task) => {
            const updateCount = getUnreadCount(task);
            console.log('[TasksTable] Task:', task.id, 'Count:', updateCount, 'HasUpdates:', task.hasUnreadUpdates);
            return (
              <div className={styles.notificationDotWrapper}>
                <NotificationDot count={updateCount} />
              </div>
            );
          },
        };
      }
      if (col.key === 'assignedTo') {
        return {
          ...col,
          render: (task: Task) => {
            console.log('[TasksTable] Rendering assignedTo column:', {
              taskId: task.id,
              assignedUserIds: task.AssignedTo,
              leadedByUserIds: task.LeadedBy,
              currentUserId: userId,
            });
            return <AvatarGroup assignedUserIds={task.AssignedTo} leadedByUserIds={task.LeadedBy} users={effectiveUsers} currentUserId={userId} />;
          },
        };
      }
      if (col.key === 'status') {
        return {
          ...col,
          render: (task: Task) => {
            const normalizedStatus = normalizeStatus(task.status);
            let icon = '/timer.svg';
            if (normalizedStatus === 'En Proceso') icon = '/timer.svg';
            else if (normalizedStatus === 'Backlog') icon = '/circle-help.svg';
            else if (normalizedStatus === 'Por Iniciar') icon = '/circle.svg';
            else if (normalizedStatus === 'Cancelado') icon = '/circle-x.svg';
            else if (normalizedStatus === 'Por Finalizar') icon = '/circle-check.svg';
            else if (normalizedStatus === 'Finalizado') icon = '/check-check.svg';
            
            console.log('[TasksTable] Rendering status column - REAL TIME:', {
              taskId: task.id,
              taskName: task.name,
              originalStatus: task.status,
              normalizedStatus: normalizedStatus,
              icon: icon,
              timestamp: new Date().toISOString(),
              renderCount: Math.random() // Para verificar si se re-renderiza
            });
            
            return (
              <div className={styles.statusWrapper}>
                <Image
                  src={icon}
                  alt={normalizedStatus}
                  width={16}
                  height={16}
                  style={{ opacity: 0.7 }}
                />
                <span className={styles[`status-${normalizedStatus.replace(/\s/g, '-')}`]}>{normalizedStatus}</span>
              </div>
            );
          },
        };
      }
      if (col.key === 'priority') {
        return {
          ...col,
          render: (task: Task) => {
            console.log('[TasksTable] Rendering priority column:', {
              taskId: task.id,
              priority: task.priority,
            });
            return (
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
            );
          },
        };
      }
      if (col.key === 'action') {
        return {
          ...col,
          render: (task: Task) => {
            if (isAdmin) {
              return (
                <ActionMenu
                  task={task}
                  userId={userId}
                  isOpen={actionMenuOpenId === task.id}
                  onOpen={() => {
                    setActionMenuOpenId(actionMenuOpenId === task.id ? null : task.id);
                  }}
                  onEdit={() => {
                    onEditTaskOpen(task.id);
                    setActionMenuOpenId(null);
                  }}
                  onDelete={() => {
                    onDeleteTaskOpen(task.id);
                    setActionMenuOpenId(null);
                  }}
                  onArchive={async () => {
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
                      
                      // Ejecutar la función de archivo
                      await archiveTask(task.id, userId, isAdmin, task);
                      setActionMenuOpenId(null);
                    } catch (error) {
                      console.error('Error archiving task:', error);
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
              );
            } else {
              console.log('❌ [DEBUG] Not rendering action menu - user is not admin:', {
                taskId: task.id,
                isAdmin,
                userId
              });
            }
            return null;
          },
        };
      }
      return col;
    });

    useEffect(() => {
      const containerElement = document.querySelector('.tasks-container');

      let startX = 0;
      let currentX = 0;

      const handleTouchStart = (event: TouchEvent) => {
        startX = event.touches[0].clientX;
      };

      const handleTouchMove = (event: TouchEvent) => {
        currentX = event.touches[0].clientX;
      };

      const handleTouchEnd = () => {
        const deltaX = currentX - startX;
        if (Math.abs(deltaX) > 50) {
          if (deltaX > 0) {
            console.log('Swipe right detected');
            // Logic to switch to the previous container
          } else {
            console.log('Swipe left detected');
            // Logic to switch to the next container
          }
        }
      };

      if (containerElement) {
        containerElement.addEventListener('touchstart', handleTouchStart);
        containerElement.addEventListener('touchmove', handleTouchMove);
        containerElement.addEventListener('touchend', handleTouchEnd);
      }

      return () => {
        if (containerElement) {
          containerElement.removeEventListener('touchstart', handleTouchStart);
          containerElement.removeEventListener('touchmove', handleTouchMove);
          containerElement.removeEventListener('touchend', handleTouchEnd);
        }
      };
    }, []);

    // Función para deshacer
    const handleUndo = useCallback(async (undoItem: {task: Task, action: 'archive' | 'unarchive', timestamp: number}) => {
      if (!undoItem || !userId || !isAdmin) {
        console.error('Cannot undo: missing required data');
        return;
      }

      try {
        if (undoItem.action === 'archive') {
          // Desarchivar la tarea
          await archiveTask(undoItem.task.id, userId, isAdmin, undoItem.task);
          
          // Actualizar estado local
          setFilteredTasks((prevTasks) => {
            return prevTasks.map((t) => 
              t.id === undoItem.task.id 
                ? { ...t, archived: false, archivedAt: undefined, archivedBy: undefined }
                : t
            );
          });
        }
        
        // Remover del undo stack
        setUndoStack(prev => prev.filter(item => item.timestamp !== undoItem.timestamp));
        setShowUndo(false);
        
        if (undoTimeoutRef.current) {
          clearTimeout(undoTimeoutRef.current);
        }
      } catch (error) {
        console.error('Error in undo process:', error);
      }
    }, [userId, isAdmin]);

    // Cleanup all table listeners when component unmounts
    useEffect(() => {
      return () => {
        console.log('[TasksTable] Cleaning up all table listeners on unmount');
        cleanupTasksTableListeners();
        
        // Cleanup undo timeout
        if (undoTimeoutRef.current) {
          clearTimeout(undoTimeoutRef.current);
        }
      };
    }, []);

    // Handle loading state - PRIORIZADO para mostrar TasksTable inmediatamente
    const shouldShowLoader = useMemo(() => {
      // Si hay datos externos, nunca mostrar loader
      if (externalTasks && externalClients && externalUsers) {
        return false;
      }
      
      // Si hay CUALQUIER dato en caché (tareas, clientes o usuarios), mostrar tabla
      const hasAnyData = effectiveTasks.length > 0 || effectiveClients.length > 0 || effectiveUsers.length > 0;
      
      // Solo mostrar loader si NO hay ningún dato Y está cargando tareas (lo más importante)
      const isReallyLoading = !hasAnyData && isLoadingTasks;
      
      console.log('[TasksTable] Loading state decision:', {
        hasExternalData: !!(externalTasks && externalClients && externalUsers),
        hasAnyData,
        isLoadingTasks,
        isLoadingClients,
        isLoadingUsers,
        shouldShow: isReallyLoading,
        tasksCount: effectiveTasks.length,
        clientsCount: effectiveClients.length,
        usersCount: effectiveUsers.length
      });
      
      return isReallyLoading;
    }, [externalTasks, externalClients, externalUsers, effectiveTasks.length, effectiveClients.length, effectiveUsers.length, isLoadingTasks, isLoadingClients, isLoadingUsers]);

    if (shouldShowLoader) {
      return (
        <div className={styles.container}>
          <style jsx>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>
          <UserSwiper
            onOpenProfile={onOpenProfile}
            onMessageSidebarOpen={onMessageSidebarOpen}
            className={styles.hideOnMobile}
          />
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
          <SkeletonLoader type="tasks" rows={8} />
        </div>
      );
    }

    return (
      <div className={styles.container}>
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
        <UserSwiper
          onOpenProfile={onOpenProfile}
          onMessageSidebarOpen={onMessageSidebarOpen}
          className={styles.hideOnMobile}
        />
        <div className={styles.header} style={{margin:'30px 0px'}}>
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
                
                console.log('[TasksTable] Search query updated:', newValue);
              }}
              className={styles.searchInput}
              aria-label="Buscar tareas"
              disabled={isLoading}
              onKeyDown={(e) => {
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
                        const selectedText = searchQuery.substring(targetC.selectionStart || 0, targetC.selectionEnd || 0);
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
                          const newValue = searchQuery.substring(0, start) + text + searchQuery.substring(end);
                          setSearchQuery(newValue);
                          setTimeout(() => {
                            targetV.setSelectionRange(start + text.length, start + text.length);
                          }, 0);
                        } else {
                          setSearchQuery(searchQuery + text);
                        }
                      }).catch(() => {
                        document.execCommand('paste');
                      });
                      break;
                    case 'x':
                      e.preventDefault();
                      const targetX = e.currentTarget as HTMLInputElement;
                      if (targetX.selectionStart !== targetX.selectionEnd) {
                        const selectedText = searchQuery.substring(targetX.selectionStart || 0, targetX.selectionEnd || 0);
                        navigator.clipboard.writeText(selectedText).then(() => {
                          if (typeof targetX.selectionStart === 'number' && typeof targetX.selectionEnd === 'number') {
                            const start = targetX.selectionStart;
                            const end = targetX.selectionEnd;
                            const newValue = searchQuery.substring(0, start) + searchQuery.substring(end);
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
                            const newValue = searchQuery.substring(0, start) + searchQuery.substring(end);
                            setSearchQuery(newValue);
                          } else {
                            setSearchQuery('');
                          }
                        });
                      }
                      break;
                  }
                }
              }}
            />
          </div>

          <div className={styles.filtersWrapper}>
            <div className={styles.buttonWithTooltip}>
              <button
                className={`${styles.viewButton} ${styles.hideOnMobile}`}
                onClick={(e) => {
                  animateClick(e.currentTarget);
                  onViewChange('kanban');
                  console.log('[TasksTable] Switching to Kanban view');
                }}
              >
                <Image
                  src="/kanban.svg"
                  draggable="false"
                  alt="kanban"
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
              <span className={styles.tooltip}>Vista Kanban</span>
            </div>
            <div className={styles.buttonWithTooltip}>
              <button
                className={styles.viewButton}
                onClick={(e) => {
                  animateClick(e.currentTarget);
                  onArchiveTableOpen();
                  console.log('[TasksTable] Opening Archive Table');
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
                      setIsPriorityDropdownOpen((prev) => {
                        if (!prev) {
                          setIsClientDropdownOpen(false);
                          setIsUserDropdownOpen(false);
                        }
                        return !prev;
                      });
                      console.log('[TasksTable] Priority dropdown toggled');
                    }}
                  >
                    <Image className="filterIcon" src="/filter.svg" alt="Priority" width={12} height={12} />
                    <span>{priorityFilter || 'Prioridad'}</span>
                  </div>
                  {isPriorityDropdownOpen && (
                    <AnimatePresence>
                      <motion.div 
                        className={styles.dropdownItems}
                        initial={{ opacity: 0, y: -16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      >
                        {['Alta', 'Media', 'Baja', ''].map((priority, index) => (
                          <motion.div
                            key={priority || 'all'}
                            className={styles.dropdownItem}
                            onClick={(e) => handlePrioritySelect(priority, e)}
                            initial={{ opacity: 0, y: -16 }}
                            animate={{ opacity: 1, y: 0 }}
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
                      console.log('[TasksTable] Client dropdown toggled');
                    }}
                  >
                    <Image className="filterIcon" src="/filter.svg" alt="Client" width={12} height={12} />
                    <span>{effectiveClients.find((c) => c.id === clientFilter)?.name || 'Cuenta'}</span>
                  </div>
                  {isClientDropdownOpen && (
                    <AnimatePresence>
                      <motion.div 
                        className={styles.dropdownItems}
                        initial={{ opacity: 0, y: -16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      >
                        {[{ id: '', name: 'Todos' }, ...effectiveClients].map((client, index) => (
                          <motion.div
                            key={client.id || 'all'}
                            className={styles.dropdownItem}
                            onClick={(e) => handleClientSelect(client.id, e)}
                            initial={{ opacity: 0, y: -16 }}
                            animate={{ opacity: 1, y: 0 }}
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
                        console.log('[TasksTable] User dropdown toggled');
                      }}
                    >
                      <Image className="filterIcon" src="/filter.svg" alt="User" width={12} height={12} />
                      <span>
                        {userFilter === '' 
                          ? 'Todos' 
                          : userFilter === 'me' 
                          ? 'Mis tareas' 
                          : effectiveUsers.find(u => u.id === userFilter)?.fullName || 'Usuario'}
                      </span>
                    </div>
                    {isUserDropdownOpen && (
                      <AnimatePresence>
                        <motion.div 
                          className={styles.dropdownItems}
                          initial={{ opacity: 0, y: -16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -16 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                          <motion.div
                            className={styles.dropdownItem}
                            style={{fontWeight: userFilter === '' ? 700 : 400}}
                            onClick={() => handleUserFilter('')}
                            initial={{ opacity: 0, y: -16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0 * 0.05 }}
                          >
                            Todos
                          </motion.div>
                          <motion.div
                            className={styles.dropdownItem}
                            style={{fontWeight: userFilter === 'me' ? 700 : 400}}
                            onClick={() => handleUserFilter('me')}
                            initial={{ opacity: 0, y: -16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 1 * 0.05 }}
                          >
                            Mis tareas
                          </motion.div>
                          {effectiveUsers
                            .filter((u) => u.id !== userId)
                            .map((u, index) => (
                              <motion.div
                                key={u.id}
                                className={styles.dropdownItem}
                                style={{fontWeight: userFilter === u.id ? 700 : 400}}
                                onClick={() => handleUserFilter(u.id)}
                                initial={{ opacity: 0, y: -16 }}
                                animate={{ opacity: 1, y: 0 }}
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
                  console.log('[TasksTable] New task creation triggered');
                }}
              >
                <Image src="/square-dashed-mouse-pointer.svg" alt="New Task" width={16} height={16} />
                <span className={styles.createButtonText}>Crear Tarea</span>
              </button>
              <span className={styles.tooltip}>Crear Nueva Tarea</span>
            </div>
          </div>
        </div>

        <Table
          key={`tasks-table-${effectiveTasksIds}`}
          data={sortedTasks}
          columns={columns}
          itemsPerPage={10}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          onRowClick={(task: Task) => {
            handleTaskRowClick(task);
          }}
          getRowClassName={getRowClassName}
          emptyStateType="tasks"
        />
        
        {/* Undo Notification */}
        <AnimatePresence>
          {showUndo && undoStack.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={styles.undoNotification}
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
                  handleUndo(undoStack[undoStack.length - 1]);
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
  },
);

TasksTable.displayName = 'TasksTable';

export default TasksTable;