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
import { useAuth } from '@/contexts/AuthContext';
import SkeletonLoader from '@/components/SkeletonLoader';
import { hasUnreadUpdates, markTaskAsViewed, unarchiveTask, archiveTask, getUnreadCount } from '@/lib/taskUtils';

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

interface AvatarGroupProps {
  assignedUserIds: string[];
  users: User[];
  currentUserId: string;
}

// Cache global persistente para ArchiveTable
const archiveTableCache = {
  tasks: new Map<string, { data: Task[]; timestamp: number }>(),
  clients: new Map<string, { data: Client[]; timestamp: number }>(),
  users: new Map<string, { data: User[]; timestamp: number }>(),
  listeners: new Map<string, { tasks: (() => void) | null; clients: (() => void) | null; users: (() => void) | null }>(),
  persistentCache: {
    tasks: new Map<string, { data: Task[]; timestamp: number }>(),
    clients: new Map<string, { data: Client[]; timestamp: number }>(),
    users: new Map<string, { data: User[]; timestamp: number }>(),
  }
};

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos
const PERSISTENT_CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

// Función para limpiar listeners de ArchiveTable
export const cleanupArchiveTableListeners = () => {
  console.log('[ArchiveTable] Cleaning up all listeners');
  archiveTableCache.listeners.forEach((listener) => {
    if (listener.tasks) listener.tasks();
    if (listener.clients) listener.clients();
    if (listener.users) listener.users();
  });
  archiveTableCache.listeners.clear();
  archiveTableCache.tasks.clear();
  archiveTableCache.clients.clear();
  archiveTableCache.users.clear();
};

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
              width={40}
              height={40}
              className={avatarStyles.avatarImage}
              onError={(e) => {
                e.currentTarget.src = '';
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

interface ArchiveTableProps {
  onEditTaskOpen: (taskId: string) => void;
  onViewChange: (view: TaskView) => void;
  onDeleteTaskOpen: (taskId: string) => void;
  onClose: () => void;
  onChatSidebarOpen: (task: Task) => void;
}

const ArchiveTable: React.FC<ArchiveTableProps> = memo(
  ({
    onEditTaskOpen,
    onViewChange,
    onDeleteTaskOpen,
    onClose,
    onChatSidebarOpen,
  }) => {
    const { user } = useUser();
    const { isAdmin } = useAuth();
    
    // Estados optimizados con refs para evitar re-renders
    const tasksRef = useRef<Task[]>([]);
    const clientsRef = useRef<Client[]>([]);
    const usersRef = useRef<User[]>([]);
    
    const [tasks, setTasks] = useState<Task[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
    const [sortKey, setSortKey] = useState<string>('archivedAt');
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

    // Función para verificar cache válido
    const isCacheValid = useCallback((cacheKey: string, cacheMap: Map<string, { data: Task[] | Client[] | User[]; timestamp: number }>) => {
      const cached = cacheMap.get(cacheKey);
      if (!cached) return false;
      
      const now = Date.now();
      return (now - cached.timestamp) < CACHE_DURATION;
    }, []);

    // Función para verificar cache persistente válido
    const isPersistentCacheValid = useCallback((cacheKey: string, cacheMap: Map<string, { data: Task[] | Client[] | User[]; timestamp: number }>) => {
      const cached = cacheMap.get(cacheKey);
      if (!cached) return false;
      
      const now = Date.now();
      return (now - cached.timestamp) < PERSISTENT_CACHE_DURATION;
    }, []);

    // Setup de tasks archivadas con cache optimizado
    useEffect(() => {
      if (!user?.id) return;

      const cacheKey = `archived_tasks_${user.id}`;
      
      // Verificar si ya existe un listener para este usuario
      const existingListener = archiveTableCache.listeners.get(cacheKey);
      
      if (existingListener?.tasks) {
        console.log('[ArchiveTable] Reusing existing tasks listener');
        // El listener ya existe, solo actualizar los datos si hay cache
        if (archiveTableCache.tasks.has(cacheKey)) {
          const cachedData = archiveTableCache.tasks.get(cacheKey)!.data;
          tasksRef.current = cachedData;
          setTasks([...cachedData]);
          setIsLoadingTasks(false);
          console.log('[ArchiveTable] Using cached tasks data, loading set to false');
        } else {
          console.log('[ArchiveTable] No cached tasks data, but listener exists, setting loading to false');
          setIsLoadingTasks(false);
        }
        return;
      }
      
      // Verificar cache persistente primero (más rápido)
      if (isPersistentCacheValid(cacheKey, archiveTableCache.persistentCache.tasks)) {
        const cachedData = archiveTableCache.persistentCache.tasks.get(cacheKey)!.data;
        tasksRef.current = cachedData;
        setTasks(cachedData);
        setIsLoadingTasks(false);
        console.log('[ArchiveTable] Using persistent cached tasks:', cachedData.length);
        
        // Restaurar en cache principal
        archiveTableCache.tasks.set(cacheKey, {
          data: cachedData,
          timestamp: Date.now(),
        });
      }
      
      // Verificar cache principal
      if (isCacheValid(cacheKey, archiveTableCache.tasks)) {
        const cachedData = archiveTableCache.tasks.get(cacheKey)!.data;
        tasksRef.current = cachedData;
        setTasks(cachedData);
        setIsLoadingTasks(false);
        console.log('[ArchiveTable] Using cached tasks on remount:', cachedData.length);
        return;
      }

      console.log('[ArchiveTable] Setting up new tasks listener');
      setIsLoadingTasks(true);

      // Usar el mismo método que TasksTable
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
            archived: doc.data().archived || false,
            archivedAt: doc.data().archivedAt?.toDate().toISOString(),
            archivedBy: doc.data().archivedBy || '',
          }));

          // Filtrar solo tareas archivadas
          const archivedTasks = tasksData.filter(task => task.archived);

          console.log('[ArchiveTable] Tasks onSnapshot update:', archivedTasks.length);
          
          tasksRef.current = archivedTasks;
          setTasks(archivedTasks);
          
          // Actualizar cache
          archiveTableCache.tasks.set(cacheKey, {
            data: archivedTasks,
            timestamp: Date.now(),
          });
          
          // Actualizar cache persistente
          archiveTableCache.persistentCache.tasks.set(cacheKey, {
            data: archivedTasks,
            timestamp: Date.now(),
          });
          
          setIsLoadingTasks(false);
        },
        (error) => {
          console.error('[ArchiveTable] Error in tasks onSnapshot:', error);
          setTasks([]);
          setIsLoadingTasks(false);
        }
      );

      // Guardar el listener en el cache global
      archiveTableCache.listeners.set(cacheKey, {
        tasks: unsubscribeTasks,
        clients: existingListener?.clients || null,
        users: existingListener?.users || null,
      });

      return () => {
        // No limpiar el listener aquí, solo marcar como no disponible para este componente
      };
    }, [user?.id, isCacheValid, isPersistentCacheValid]);

    // Setup de clients con cache optimizado
    useEffect(() => {
      if (!user?.id) return;

      const cacheKey = `clients_${user.id}`;
      
      // Verificar si ya existe un listener para este usuario
      const existingListener = archiveTableCache.listeners.get(cacheKey);
      
      if (existingListener?.clients) {
        console.log('[ArchiveTable] Reusing existing clients listener');
        // El listener ya existe, solo actualizar los datos si hay cache
        if (archiveTableCache.clients.has(cacheKey)) {
          const cachedData = archiveTableCache.clients.get(cacheKey)!.data;
          clientsRef.current = cachedData;
          setClients(cachedData);
          setIsLoadingClients(false);
          console.log('[ArchiveTable] Using cached clients data, loading set to false');
        } else {
          console.log('[ArchiveTable] No cached clients data, but listener exists, setting loading to false');
          setIsLoadingClients(false);
        }
        return;
      }
      
      // Verificar cache persistente primero (más rápido)
      if (isPersistentCacheValid(cacheKey, archiveTableCache.persistentCache.clients)) {
        const cachedData = archiveTableCache.persistentCache.clients.get(cacheKey)!.data;
        clientsRef.current = cachedData;
        setClients(cachedData);
        setIsLoadingClients(false);
        console.log('[ArchiveTable] Using persistent cached clients:', cachedData.length);
        
        // Restaurar en cache principal
        archiveTableCache.clients.set(cacheKey, {
          data: cachedData,
          timestamp: Date.now(),
        });
      }
      
      // Verificar cache principal
      if (isCacheValid(cacheKey, archiveTableCache.clients)) {
        const cachedData = archiveTableCache.clients.get(cacheKey)!.data;
        clientsRef.current = cachedData;
        setClients(cachedData);
        setIsLoadingClients(false);
        console.log('[ArchiveTable] Using cached clients on remount:', cachedData.length);
        return;
      }

      console.log('[ArchiveTable] Setting up new clients listener');
      setIsLoadingClients(true);

      // Usar el mismo método que TasksTable
      const clientsQuery = query(collection(db, 'clients'));
      const unsubscribeClients = onSnapshot(
        clientsQuery,
        (snapshot) => {
          const clientsData: Client[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            name: doc.data().name || '',
            imageUrl: doc.data().imageUrl || '/empty-image.png',
          }));

          console.log('[ArchiveTable] Clients onSnapshot update:', clientsData.length);
          
          clientsRef.current = clientsData;
          setClients(clientsData);
          
          // Actualizar cache
          archiveTableCache.clients.set(cacheKey, {
            data: clientsData,
            timestamp: Date.now(),
          });
          
          // Actualizar cache persistente
          archiveTableCache.persistentCache.clients.set(cacheKey, {
            data: clientsData,
            timestamp: Date.now(),
          });
          
          setIsLoadingClients(false);
        },
        (error) => {
          console.error('[ArchiveTable] Error in clients onSnapshot:', error);
          setClients([]);
          setIsLoadingClients(false);
        }
      );

      // Guardar el listener en el cache global
      archiveTableCache.listeners.set(cacheKey, {
        tasks: existingListener?.tasks || null,
        clients: unsubscribeClients,
        users: existingListener?.users || null,
      });

      return () => {
        // No limpiar el listener aquí, solo marcar como no disponible para este componente
      };
    }, [user?.id, isCacheValid, isPersistentCacheValid]);

    // Setup de users con cache optimizado
    useEffect(() => {
      if (!user?.id) return;

      const cacheKey = `users_${user.id}`;
      
      // Verificar si ya existe un listener para este usuario
      const existingListener = archiveTableCache.listeners.get(cacheKey);
      
      if (existingListener?.users) {
        console.log('[ArchiveTable] Reusing existing users listener');
        // El listener ya existe, solo actualizar los datos si hay cache
        if (archiveTableCache.users.has(cacheKey)) {
          const cachedData = archiveTableCache.users.get(cacheKey)!.data;
          usersRef.current = cachedData;
          setUsers(cachedData);
          setIsLoadingUsers(false);
          console.log('[ArchiveTable] Using cached users data, loading set to false');
        } else {
          console.log('[ArchiveTable] No cached users data, but listener exists, setting loading to false');
          setIsLoadingUsers(false);
        }
        return;
      }
      
      // Verificar cache persistente primero (más rápido)
      if (isPersistentCacheValid(cacheKey, archiveTableCache.persistentCache.users)) {
        const cachedData = archiveTableCache.persistentCache.users.get(cacheKey)!.data;
        usersRef.current = cachedData;
        setUsers(cachedData);
        setIsLoadingUsers(false);
        console.log('[ArchiveTable] Using persistent cached users:', cachedData.length);
        
        // Restaurar en cache principal
        archiveTableCache.users.set(cacheKey, {
          data: cachedData,
          timestamp: Date.now(),
        });
      }
      
      // Verificar cache principal
      if (isCacheValid(cacheKey, archiveTableCache.users)) {
        const cachedData = archiveTableCache.users.get(cacheKey)!.data;
        usersRef.current = cachedData;
        setUsers(cachedData);
        setIsLoadingUsers(false);
        console.log('[ArchiveTable] Using cached users on remount:', cachedData.length);
        return;
      }

      console.log('[ArchiveTable] Setting up new users fetch');
      setIsLoadingUsers(true);

      // Usar la misma lógica de fetch que TasksTable
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
          archiveTableCache.users.set(cacheKey, {
            data: usersData,
            timestamp: Date.now(),
          });
          
          // Actualizar cache persistente
          archiveTableCache.persistentCache.users.set(cacheKey, {
            data: usersData,
            timestamp: Date.now(),
          });
          
        } catch (error) {
          console.error('[ArchiveTable] Error fetching users:', error);
          setUsers([]);
        } finally {
          setIsLoadingUsers(false);
        }
      };

      fetchUsers();

      // Guardar el listener en el cache global (para este caso, no hay onSnapshot)
      archiveTableCache.listeners.set(cacheKey, {
        tasks: existingListener?.tasks || null,
        clients: existingListener?.clients || null,
        users: null, // No hay listener para users, solo fetch
      });

      return () => {
        // No limpiar el listener aquí, solo marcar como no disponible para este componente
      };
    }, [user?.id, isCacheValid, isPersistentCacheValid]);

    // Filtrar tareas basado en búsqueda y filtros
    useEffect(() => {
      let filtered = tasks;

      // Filtro de búsqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (task: Task) =>
            task.name.toLowerCase().includes(query) ||
            task.description.toLowerCase().includes(query) ||
            task.project.toLowerCase().includes(query) ||
            clients.find((c: Client) => c.id === task.clientId)?.name.toLowerCase().includes(query)
        );
      }

      // Filtro de prioridad
      if (priorityFilter) {
        filtered = filtered.filter((task) => task.priority === priorityFilter);
      }

      // Filtro de cliente
      if (clientFilter) {
        filtered = filtered.filter((task) => task.clientId === clientFilter);
      }

      // Filtro de usuario
      if (userFilter) {
        const getInvolvedUserIds = (task: Task) => {
          return [...task.LeadedBy, ...task.AssignedTo];
        };

        if (userFilter === 'me') {
          filtered = filtered.filter((task) => getInvolvedUserIds(task).includes(userId));
        } else {
          filtered = filtered.filter((task) => getInvolvedUserIds(task).includes(userFilter));
        }
      }

      setFilteredTasks(filtered);
    }, [tasks, searchQuery, priorityFilter, clientFilter, userFilter, clients, userId]);

    const handleUserFilter = (id: string) => {
      setUserFilter(id);
      setIsUserDropdownOpen(false);
    };

    // Función para obtener el nombre del cliente
    const getClientName = useCallback((clientId: string) => {
      const client = clients.find((c) => c.id === clientId);
      return client?.name || 'Cliente no encontrado';
    }, [clients]);

    // Handler reforzado para desarchivar
    const handleUnarchiveTask = useCallback(async (task: Task) => {
      if (!isAdmin) {
        console.warn('[ArchiveTable] Unarchive intentado por usuario no admin');
        return;
      }
      try {
        await unarchiveTask(task.id, userId, isAdmin, task);
      } catch (error) {
        console.error('[ArchiveTable] Error unarchiving task:', error);
        throw error; // Re-lanzar el error para que onArchive lo maneje
      }
    }, [userId, isAdmin]);

    // Función para deshacer
    const handleUndo = useCallback(async (undoItem: {task: Task, action: 'archive' | 'unarchive', timestamp: number}) => {
      try {
        if (undoItem.action === 'unarchive') {
          // Volver a archivar la tarea (deshacer el desarchivo)
          await archiveTask(undoItem.task.id, userId, isAdmin, undoItem.task);
          setTasks((prevTasks) => 
            [...prevTasks, { ...undoItem.task, archived: true, archivedAt: new Date().toISOString(), archivedBy: userId }]
          );
        }
        
        // Remover del undo stack
        setUndoStack(prev => prev.filter(item => item.timestamp !== undoItem.timestamp));
        setShowUndo(false);
        
        if (undoTimeoutRef.current) {
          clearTimeout(undoTimeoutRef.current);
        }
      } catch (error) {
        console.error('[ArchiveTable] Error undoing action:', error);
      }
    }, [userId, isAdmin]);

    // Ordenar tareas
    const sortedTasks = useMemo(() => {
      return [...filteredTasks].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortKey) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'priority':
            const priorityOrder = { Alta: 3, Media: 2, Baja: 1 };
            aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
            bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
            break;
          case 'status':
            aValue = a.status.toLowerCase();
            bValue = b.status.toLowerCase();
            break;
          case 'client':
            aValue = getClientName(a.clientId);
            bValue = getClientName(b.clientId);
            break;
          case 'archivedAt':
            aValue = a.archivedAt || a.createdAt;
            bValue = b.archivedAt || b.createdAt;
            break;
          case 'lastActivity':
            aValue = a.lastActivity || a.createdAt;
            bValue = b.lastActivity || b.createdAt;
            break;
          default:
            aValue = a.createdAt;
            bValue = b.createdAt;
        }

        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }, [filteredTasks, sortKey, sortDirection, getClientName]);

    const handleTaskRowClick = async (task: Task) => {
      // Marcar la tarea como vista
      if (userId) {
        await markTaskAsViewed(task.id, userId);
      }
      
      // Abrir el chat de la tarea
      onChatSidebarOpen(task);
      console.log('[ArchiveTable] Row clicked, opening chat for task:', task.id);
    };

    // Manejar clicks fuera del ActionMenu
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          actionMenuRef.current &&
          !actionMenuRef.current.contains(event.target as Node) &&
          !actionButtonRefs.current.has((event.target as Element).closest('button')?.id || '')
        ) {
          setActionMenuOpenId(null);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSort = (key: string) => {
      if (sortKey === key) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortKey(key);
        setSortDirection('desc');
      }
    };

    const animateClick = useCallback((element: HTMLElement) => {
      gsap.to(element, {
        scale: 0.95,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
      });
    }, []);

    const handlePrioritySelect = (priority: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      setPriorityFilter(priority);
      setIsPriorityDropdownOpen(false);
    };

    const handleClientSelect = (clientId: string, e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      setClientFilter(clientId);
      setIsClientDropdownOpen(false);
    };

    // Función para obtener la clase de la fila
    const getRowClassName = (task: Task) => {
      let className = styles.taskRow;
      if (task.hasUnreadUpdates) {
        className += ` ${styles.unread}`;
      }
      return className;
    };

    // Configurar columnas de la tabla - ESPECÍFICO PARA ARCHIVETABLE
    const baseColumns = [
      {
        key: 'clientId',
        label: 'Cuenta',
        width: '10%',
        mobileVisible: false,
      },
      {
        key: 'name',
        label: 'Tarea',
        width: '50%', 
        mobileVisible: true,
      },
      {
        key: 'assignedTo',
        label: 'Asignados',
        width: '20%',
        mobileVisible: false,
      },
      {
        key: 'archivedAt',
        label: 'Fecha de Archivado',
        width: '20%',
        mobileVisible: false,
      },
      {
        key: 'action',
        label: 'Acciones',
        width: '20%',
        mobileVisible: false,
      },
    ];

    const columns = baseColumns.map((col) => {
      if (col.key === 'clientId') {
        return {
          ...col,
          render: (task: Task) => {
            const client = clients.find((c) => c.id === task.clientId);
            console.log('[ArchiveTable] Rendering client column:', {
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
            const hasUpdates = hasUnreadUpdates(task, userId);
            const updateCount = getUnreadCount(task, userId);
            console.log('[ArchiveTable] Rendering name column:', {
              taskId: task.id,
              taskName: task.name,
              hasUpdates,
              updateCount,
            });
            return (
              <div className={styles.taskNameWrapper}>
                <span className={styles.taskName}>{task.name}</span>
                {hasUpdates && updateCount > 0 && (
                  <div className={styles.updateIndicator}>
                    <div className={styles.updateDotRed}>
                      <span className={styles.updateDotPing}></span>
                      <span className={styles.updateDotNumber}>{updateCount}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          },
        };
      }
      if (col.key === 'assignedTo') {
        return {
          ...col,
          render: (task: Task) => {
            console.log('[ArchiveTable] Rendering assignedTo column:', {
              taskId: task.id,
              assignedUserIds: task.AssignedTo,
              currentUserId: userId,
            });
            return <AvatarGroup assignedUserIds={task.AssignedTo} users={users} currentUserId={userId} />;
          },
        };
      }
      if (col.key === 'archivedAt') {
        return {
          ...col,
          render: (task: Task) => {
            console.log('[ArchiveTable] Rendering archivedAt column:', {
              taskId: task.id,
              archivedAt: task.archivedAt,
            });
            return (
              <div className={styles.archivedAtWrapper}>
                {task.archivedAt ? (
                  <span>{new Date(task.archivedAt).toLocaleDateString()}</span>
                ) : (
                  <span>Sin archivar</span>
                )}
              </div>
            );
          },
        };
      }
      if (col.key === 'action') {
        return {
          ...col,
          render: (task: Task) => {
            // Solo admins pueden ver el ActionMenu en ArchiveTable
            if (isAdmin) {
              console.log('[ArchiveTable] Rendering action column:', {
                taskId: task.id,
                taskName: task.name,
                isAdmin,
              });
              return (
                <ActionMenu
                  task={task}
                  userId={userId}
                  isOpen={actionMenuOpenId === task.id}
                  onOpen={() => {
                    setActionMenuOpenId(actionMenuOpenId === task.id ? null : task.id);
                    console.log('[ArchiveTable] Action menu toggled for task:', task.id);
                  }}
                  onEdit={() => {
                    onEditTaskOpen(task.id);
                    setActionMenuOpenId(null);
                    console.log('[ArchiveTable] Edit action triggered for task:', task.id);
                  }}
                  onDelete={() => {
                    onDeleteTaskOpen(task.id);
                    setActionMenuOpenId(null);
                    console.log('[ArchiveTable] Delete action triggered for task:', task.id);
                  }}
                  onArchive={async () => {
                    try {
                      // Guardar en undo stack
                      const undoItem = {
                        task: { ...task },
                        action: 'unarchive' as const,
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
                        prevTasks.filter((t) => t.id !== task.id)
                      );
                      
                      // Ejecutar la función de desarchivo
                      await handleUnarchiveTask(task);
                      setActionMenuOpenId(null);
                      console.log('[ArchiveTable] Task unarchived successfully:', task.id);
                    } catch (error) {
                      // Revertir el cambio si hay error
                      setTasks((prevTasks) => [...prevTasks, { ...task, archived: true }]);
                      console.error('[ArchiveTable] Error unarchiving task:', error);
                    }
                  }}
                  animateClick={animateClick}
                  actionMenuRef={actionMenuRef}
                  actionButtonRef={(el) => {
                    if (el) {
                      actionButtonRefs.current.set(task.id, el);
                      console.log('[ArchiveTable] Action button ref set for task:', task.id);
                    } else {
                      actionButtonRefs.current.delete(task.id);
                      console.log('[ArchiveTable] Action button ref removed for task:', task.id);
                    }
                  }}
                />
              );
            }
            return null;
          },
        };
      }
      return col;
    });

    // Cleanup effect for timeouts
    useEffect(() => {
      return () => {
        const timeoutId = undoTimeoutRef.current;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    }, []);

    // Loading state
    console.log('[ArchiveTable] Loading states:', { isLoadingTasks, isLoadingClients, isLoadingUsers });
    if (isLoadingTasks || isLoadingClients || isLoadingUsers) {
      console.log('[ArchiveTable] Showing skeleton loader');
      return (
        <div className={styles.container}>
          <SkeletonLoader type="tasks" />
        </div>
      );
    }

    console.log('[ArchiveTable] Showing table with', sortedTasks.length, 'tasks');
    return (
      <motion.div 
        className={styles.container}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          duration: 0.2, 
          ease: [0.25, 0.46, 0.45, 0.94],
          opacity: { duration: 0.15 },
          scale: { duration: 0.2 }
        }}
      >
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
        <div className={styles.header} style={{margin:'30px 0px'}}>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Buscar tareas archivadas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('');
                }
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
                  onViewChange('table');
                  onClose();
                  console.log('[ArchiveTable] Returning to Tasks Table');
                }}
              >
                <Image
                  src="/arrow-left.svg"
                  draggable="false"
                  alt="Volver a tareas"
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
              <span className={styles.tooltip}>Volver a Tareas</span>
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
                      console.log('[ArchiveTable] Priority dropdown toggled');
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
                      console.log('[ArchiveTable] Client dropdown toggled');
                    }}
                  >
                    <Image className="filterIcon" src="/filter.svg" alt="Client" width={12} height={12} />
                    <span>{clients.find((c) => c.id === clientFilter)?.name || 'Cuenta'}</span>
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
                        console.log('[ArchiveTable] User dropdown toggled');
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
                          style={{fontWeight: userFilter === '' ? 700 : 400}}
                          onClick={() => handleUserFilter('')}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: 0 * 0.05 }}
                        >
                          Todos
                          </motion.div>
                          <motion.div
                          className={styles.dropdownItem}
                          style={{fontWeight: userFilter === 'me' ? 700 : 400}}
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
                              style={{fontWeight: userFilter === u.id ? 700 : 400}}
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
          </div>
        </div>
        <Table
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
          emptyStateType="archive"
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
                <span>Tarea desarchivada</span>
              </div>
              <button
                onClick={() => handleUndo(undoStack[undoStack.length - 1])}
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
      </motion.div>
    );
  },
);

ArchiveTable.displayName = 'ArchiveTable';

export default ArchiveTable; 