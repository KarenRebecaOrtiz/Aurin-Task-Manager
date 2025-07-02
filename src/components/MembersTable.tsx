'use client';

import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, onSnapshot, query, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Table from './Table';
import styles from './MembersTable.module.scss';
import { useAuth } from '@/contexts/AuthContext';
import SkeletonLoader from '@/components/SkeletonLoader';
import UserAvatar from '@/components/ui/UserAvatar';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';
import NotificationDot from '@/components/ui/NotificationDot';

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
  description?: string;
  status?: string;
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
}

interface MembersTableProps {
  onMessageSidebarOpen: (user: User) => void;
  externalUsers?: User[];
  externalTasks?: Task[];
  onCacheUpdate?: (users: User[], tasks: Task[]) => void;
}

// Cache global persistente para MembersTable
const membersTableCache = {
  users: new Map<string, { data: User[]; timestamp: number }>(),
  tasks: new Map<string, { data: Task[]; timestamp: number }>(),
  listeners: new Map<string, { users: (() => void) | null; tasks: (() => void) | null }>(),
};

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

function getCacheKey(type: 'users' | 'tasks', userId: string) {
  return `members_${type}_${userId}`;
}

function saveUsersCache(userId: string, data: User[]) {
  const key = getCacheKey('users', userId);
  const value = JSON.stringify({ data, timestamp: Date.now() });
  try {
    localStorage.setItem(key, value);
    membersTableCache.users.set(key, { data, timestamp: Date.now() });
    console.log(`[MembersTable] [CACHE] Saved users to localStorage (${data.length})`);
  } catch (e) {
    console.warn(`[MembersTable] [CACHE] Error saving users to localStorage`, e);
  }
}

function loadUsersCache(userId: string): User[] | null {
  const key = getCacheKey('users', userId);
  if (membersTableCache.users.has(key)) {
    const cached = membersTableCache.users.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`[MembersTable] [CACHE] Using in-memory users cache (${cached.data.length})`);
      return cached.data;
    }
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Date.now() - parsed.timestamp < CACHE_DURATION) {
        membersTableCache.users.set(key, { data: parsed.data, timestamp: parsed.timestamp });
        console.log(`[MembersTable] [CACHE] Using localStorage users cache (${parsed.data.length})`);
        return parsed.data;
      } else {
        localStorage.removeItem(key);
        membersTableCache.users.delete(key);
        console.log(`[MembersTable] [CACHE] Expired users cache removed`);
      }
    }
  } catch (e) {
    console.warn(`[MembersTable] [CACHE] Error loading users from localStorage`, e);
  }
  return null;
}

function saveTasksCache(userId: string, data: Task[]) {
  const key = getCacheKey('tasks', userId);
  const value = JSON.stringify({ data, timestamp: Date.now() });
  try {
    localStorage.setItem(key, value);
    membersTableCache.tasks.set(key, { data, timestamp: Date.now() });
    console.log(`[MembersTable] [CACHE] Saved tasks to localStorage (${data.length})`);
  } catch (e) {
    console.warn(`[MembersTable] [CACHE] Error saving tasks to localStorage`, e);
  }
}

function loadTasksCache(userId: string): Task[] | null {
  const key = getCacheKey('tasks', userId);
  if (membersTableCache.tasks.has(key)) {
    const cached = membersTableCache.tasks.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`[MembersTable] [CACHE] Using in-memory tasks cache (${cached.data.length})`);
      return cached.data;
    }
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Date.now() - parsed.timestamp < CACHE_DURATION) {
        membersTableCache.tasks.set(key, { data: parsed.data, timestamp: parsed.timestamp });
        console.log(`[MembersTable] [CACHE] Using localStorage tasks cache (${parsed.data.length})`);
        return parsed.data;
      } else {
        localStorage.removeItem(key);
        membersTableCache.tasks.delete(key);
        console.log(`[MembersTable] [CACHE] Expired tasks cache removed`);
      }
    }
  } catch (e) {
    console.warn(`[MembersTable] [CACHE] Error loading tasks from localStorage`, e);
  }
  return null;
}

// Función para limpiar listeners cuando sea necesario (ej: logout)
export const cleanupMembersTableListeners = () => {
  console.log('[MembersTable] Cleaning up all listeners');
  membersTableCache.listeners.forEach((listener) => {
    if (listener.users) {
      listener.users();
    }
    if (listener.tasks) {
      listener.tasks();
    }
  });
  membersTableCache.listeners.clear();
  membersTableCache.users.clear();
  membersTableCache.tasks.clear();
};

const MembersTable: React.FC<MembersTableProps> = memo(
  ({ onMessageSidebarOpen, externalUsers, externalTasks, onCacheUpdate }) => {
    const { user } = useUser();
    const { isLoading } = useAuth();
    const { getUnreadCountForUser, markConversationAsRead } = useMessageNotifications();
    
    // Estados optimizados con refs para evitar re-renders
    const usersRef = useRef<User[]>([]);
    const tasksRef = useRef<Task[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [sortKey, setSortKey] = useState<string>('fullName');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [isLoadingTasks, setIsLoadingTasks] = useState(true);
    
    // Use external data if provided, otherwise use internal state
    const effectiveUsers = externalUsers || users;
    const effectiveTasks = externalTasks || tasks;
    
    // Setup inicial de usuarios usando API (igual que en tasks/page.tsx)
    useEffect(() => {
      if (!user?.id) {
        setIsLoadingUsers(false);
        return;
      }
      
      // Intentar hidratar desde cache
      const cached = loadUsersCache(user.id);
      if (cached) {
        usersRef.current = cached;
        setUsers([...cached]);
        setIsLoadingUsers(false);
        console.log('[MembersTable] Using cached users:', cached.length);
        
        // Pasar datos al cache global
        if (onCacheUpdate) {
          onCacheUpdate(cached, tasksRef.current);
        }
        return;
      }
      
      // Si no hay cache válido, fetch desde API
      setIsLoadingUsers(true);
      
      const fetchUsers = async () => {
        try {
          console.log('[MembersTable] Fetching users: imageUrl from Clerk API, other data from Firestore');
          
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
              description: userData.description || '', // de Firestore
              status: userData.status || 'offline', // de Firestore
            };
          });
          
          setUsers(usersData);
          saveUsersCache(user.id, usersData);
          
          // También obtener datos de tareas si es necesario
          const tasksQuery = query(collection(db, 'tasks'));
          const tasksSnapshot = await getDocs(tasksQuery);
          const tasksData: Task[] = tasksSnapshot.docs.map((doc) => ({
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
            createdAt: doc.data().createdAt ? doc.data().createdAt.toDate().toISOString() : new Date().toISOString(),
            CreatedBy: doc.data().CreatedBy || '',
          }));
          
          setTasks(tasksData);
          saveTasksCache(user.id, tasksData);
          
          // Pasar datos al cache global
          if (onCacheUpdate) {
            onCacheUpdate(usersData, tasksData);
          }
          
          console.log('[MembersTable] Users and tasks fetched and cached:', {
            users: usersData.length,
            usersWithImages: usersData.filter(u => u.imageUrl).length,
            tasks: tasksData.length
          });
        } catch (error) {
          console.error('[MembersTable] Error fetching users:', error);
          setUsers([]);
          setTasks([]);
        } finally {
          setIsLoadingUsers(false);
        }
      };

      fetchUsers();
    }, [user?.id, onCacheUpdate]);

    // Setup de tareas con cache optimizado (reutilizar listeners existentes)
    useEffect(() => {
      if (!user?.id || externalTasks) return;
      const cacheKey = getCacheKey('tasks', user.id);
      // Intentar hidratar desde cache
      const cached = loadTasksCache(user.id);
      if (cached) {
        tasksRef.current = cached;
        setTasks([...cached]);
        setIsLoadingTasks(false);
        // No montar listener hasta que expire el cache
        return;
      }
      // Si no hay cache válido, montar listener
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
          }));
          tasksRef.current = tasksData;
          setTasks(tasksData);
          saveTasksCache(user.id, tasksData);
          setIsLoadingTasks(false);
        },
        (error) => {
          console.error('[MembersTable] Error in tasks onSnapshot:', error);
          setTasks([]);
          setIsLoadingTasks(false);
        }
      );
      membersTableCache.listeners.set(cacheKey, {
        users: null,
        tasks: unsubscribeTasks,
      });
      return () => {};
    }, [user?.id, externalTasks]);

    // Calcular proyectos activos por usuario (memoizado)
    const activeProjectsCount = useMemo(() => {
      const validStatuses = ['En Proceso', 'Diseño', 'Desarrollo'];
      const counts: { [userId: string]: number } = {};

      effectiveUsers.forEach((u) => {
        counts[u.id] = effectiveTasks.filter(
          (task) =>
            validStatuses.includes(task.status) &&
            (task.AssignedTo.includes(u.id) || task.LeadedBy.includes(u.id)),
        ).length;
      });

      return counts;
    }, [effectiveUsers, effectiveTasks]);

    // Filtrar y ordenar usuarios (memoizado)
    const memoizedFilteredUsers = useMemo(() => {
      const currentUser = effectiveUsers.find((u) => u.id === user?.id);
      const otherUsers = effectiveUsers.filter((u) => u.id !== user?.id);
      const sortedUsers = [...otherUsers].sort((a, b) =>
        a.fullName.toLowerCase().localeCompare(b.fullName.toLowerCase()),
      );
      return currentUser ? [{ ...currentUser, fullName: `${currentUser.fullName} (Tú)` }, ...sortedUsers] : sortedUsers;
    }, [effectiveUsers, user?.id]);

    // Aplicar filtro de búsqueda (memoizado)
    useEffect(() => {
      const filtered = memoizedFilteredUsers.filter(
          (u) =>
            u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.status?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredUsers(filtered);
    }, [memoizedFilteredUsers, searchQuery]);

    // Ordenamiento (memoizado)
    const handleSort = useCallback(
      (key: string) => {
        setSortKey(key);
          setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      },
      [],
    );

    // Definir columnas (memoizado)
    const columns = useMemo(
      () => [
        {
          key: 'imageUrl',
          label: '',
          width: '20%',
          mobileVisible: true,
          render: (user: User) => (
            <UserAvatar
              userId={user.id}
              imageUrl={user.imageUrl}
              userName={user.fullName}
              size="medium"
              showStatus={true}
            />
          ),
        },
        {
          key: 'fullName',
          label: 'Nombre',
          width: '80%',
          mobileVisible: true,
        },
        {
          key: 'messageNotifications',
          label: '',
          width: '10%',
          mobileVisible: false,
          render: (user: User) => {
            const unreadCount = getUnreadCountForUser(user.id);
            console.log('[MembersTable] User:', user.id, 'Unread messages:', unreadCount);
            return (
              <div className={styles.notificationDotWrapper}>
                <NotificationDot count={unreadCount} />
              </div>
            );
          },
        },
        {
          key: 'role',
          label: 'Rol',
          width: '25%',
          mobileVisible: false,
        },
        {
          key: 'activeProjects',
          label: 'Proyectos activos',
          width: '20%',
          mobileVisible: false,
          render: (user: User) => (
            <span className={styles.activeProjects}>{activeProjectsCount[user.id] || 0}</span>
          ),
        },
        {
          key: 'status',
          label: 'Estado',
          width: '15%',
          mobileVisible: false,
          render: (user: User) => (
            <span className={styles.status}>{user.status || 'Sin estado'}</span>
          ),
        },
      ],
      [activeProjectsCount, getUnreadCountForUser],
    );

    // Handle loading state
    if (isLoading || isLoadingUsers || isLoadingTasks) {
      return (
        <div className={styles.container}>
          <div className={styles.header}>
            <div className={styles.searchWrapper}>
              <div className={styles.searchInput} style={{ opacity: 0.5, pointerEvents: 'none' }}>
                <div style={{ width: '100%', height: '16px', background: '#f0f0f0', borderRadius: '4px' }} />
              </div>
            </div>
          </div>
          <SkeletonLoader type="members" rows={6} />
        </div>
      );
    }

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              placeholder="Buscar Miembros"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              aria-label="Buscar Miembros"
            />
          </div>
        </div>
        <Table
          data={filteredUsers}
          columns={columns}
          itemsPerPage={10}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSort={handleSort}
          onRowClick={async (u: User, columnKey: string) => {
            if (['imageUrl', 'fullName', 'role', 'activeProjects', 'status', 'messageNotifications'].includes(columnKey) &&
                u.id !== user?.id) {
              // Marcar la conversación como leída antes de abrir el sidebar
              const unreadCount = getUnreadCountForUser(u.id);
              if (unreadCount > 0) {
                // Buscar la conversación y marcarla como leída
                const conversationsQuery = query(
                  collection(db, 'conversations'),
                  where('participants', 'array-contains', user?.id),
                  where('participants', 'array-contains', u.id)
                );
                try {
                  const conversationsSnapshot = await getDocs(conversationsQuery);
                  if (!conversationsSnapshot.empty) {
                    const conversationId = conversationsSnapshot.docs[0].id;
                    await markConversationAsRead(conversationId);
                  }
                } catch (error) {
                  console.error('[MembersTable] Error marking conversation as read:', error);
                }
              }
              onMessageSidebarOpen(u);
            }
          }}
          emptyStateType="members"
        />
      </div>
    );
  },
);

MembersTable.displayName = 'MembersTable';

export default MembersTable;