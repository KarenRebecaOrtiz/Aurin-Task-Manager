'use client';

import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { collection, onSnapshot, query, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Table from './Table';
import styles from './MembersTable.module.scss';
import { useAuth } from '@/contexts/AuthContext';
import SkeletonLoader from '@/components/SkeletonLoader';
import UserAvatar from '@/components/ui/UserAvatar';

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
  onInviteSidebarOpen: () => void;
  onMessageSidebarOpen: (user: User) => void;
}

// Cache global persistente FUERA del componente para que sobreviva a unmounts/remounts
const globalCache = {
  users: new Map<string, { data: User[]; timestamp: number }>(),
  tasks: new Map<string, { data: Task[]; timestamp: number }>(),
  lastFetch: new Map<string, number>(),
  listeners: new Map<string, { users: (() => void) | null; tasks: (() => void) | null }>(),
};

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos
const FETCH_COOLDOWN = 30 * 1000; // 30 segundos entre fetches

// Función para limpiar listeners cuando sea necesario (ej: logout)
export const cleanupMembersTableListeners = () => {
  console.log('[MembersTable] Cleaning up all listeners');
  globalCache.listeners.forEach((listener) => {
    if (listener.users) {
      listener.users();
    }
    if (listener.tasks) {
      listener.tasks();
    }
  });
  globalCache.listeners.clear();
  globalCache.users.clear();
  globalCache.tasks.clear();
  globalCache.lastFetch.clear();
};

const MembersTable: React.FC<MembersTableProps> = memo(
  ({ onMessageSidebarOpen }) => {
    const { user } = useUser();
    const { isLoading } = useAuth();
    
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
    
    // Refs para controlar suscripciones y evitar múltiples listeners
    const usersUnsubscribeRef = useRef<(() => void) | null>(null);
    const tasksUnsubscribeRef = useRef<(() => void) | null>(null);
    const isInitializedRef = useRef(false);
    const fetchInProgressRef = useRef(false);

    // Función para verificar cache válido
    const isCacheValid = useCallback((cacheKey: string, cacheMap: Map<string, { data: User[] | Task[]; timestamp: number }>) => {
      const cached = cacheMap.get(cacheKey);
      if (!cached) return false;
      
      const now = Date.now();
      return (now - cached.timestamp) < CACHE_DURATION;
    }, []);

    // Función para verificar si podemos hacer fetch (cooldown)
    const canFetch = useCallback((cacheKey: string) => {
      const lastFetch = globalCache.lastFetch.get(cacheKey) || 0;
      const now = Date.now();
      return (now - lastFetch) > FETCH_COOLDOWN;
    }, []);

    // Fetch de usuarios optimizado con cache
    const fetchUsers = useCallback(async () => {
      if (!user?.id || fetchInProgressRef.current) return;
      
      const cacheKey = `users_${user.id}`;
      
      // Verificar cache primero
      if (isCacheValid(cacheKey, globalCache.users)) {
        const cachedData = globalCache.users.get(cacheKey)!.data;
        usersRef.current = cachedData;
        setUsers(cachedData);
        setIsLoadingUsers(false);
        return;
      }

      // Verificar cooldown
      if (!canFetch(cacheKey)) {
        console.log('[MembersTable] Fetch cooldown active, using existing data');
        return;
      }

      fetchInProgressRef.current = true;
      globalCache.lastFetch.set(cacheKey, Date.now());
      
      try {
        console.log('[MembersTable] Fetching users from API...');
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

        // Obtener datos de Firestore solo para usuarios que no están en cache
        const usersData: User[] = await Promise.all(
          clerkUsers.map(async (clerkUser) => {
            try {
              const userDoc = await getDoc(doc(db, 'users', clerkUser.id));
              const status = userDoc.exists() ? userDoc.data().status || 'Disponible' : 'Disponible';
              return {
                id: clerkUser.id,
                imageUrl: clerkUser.imageUrl || '',
                fullName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Sin nombre',
                role: userDoc.exists() && userDoc.data().role
                  ? userDoc.data().role
                  : (clerkUser.publicMetadata.role || 'Sin rol'),
                description: clerkUser.publicMetadata.description || 'Sin descripción',
                status,
              };
            } catch {
              return {
                id: clerkUser.id,
                imageUrl: clerkUser.imageUrl || '',
                fullName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Sin nombre',
                role: clerkUser.publicMetadata.role || 'Sin rol',
                description: clerkUser.publicMetadata.description || 'Sin descripción',
                status: 'Disponible',
              };
            }
          }),
        );
        
        // Actualizar cache global
        globalCache.users.set(cacheKey, {
          data: usersData,
          timestamp: Date.now(),
        });
        
        usersRef.current = usersData;
        setUsers(usersData);
        
      } catch (error) {
        console.error('[MembersTable] Error fetching users:', error);
        // Usar datos existentes si hay error
        if (usersRef.current.length > 0) {
          setUsers(usersRef.current);
        } else {
          setUsers([]);
        }
      } finally {
        setIsLoadingUsers(false);
        fetchInProgressRef.current = false;
      }
    }, [user?.id, isCacheValid, canFetch]);

    // Setup inicial de usuarios (solo una vez)
    useEffect(() => {
      if (!user?.id) return;
      
      const cacheKey = `users_${user.id}`;
      
      // Si ya tenemos datos válidos en cache, usarlos inmediatamente
      if (isCacheValid(cacheKey, globalCache.users)) {
        const cachedData = globalCache.users.get(cacheKey)!.data;
        usersRef.current = cachedData;
        setUsers(cachedData);
        setIsLoadingUsers(false);
        console.log('[MembersTable] Using cached users on remount:', cachedData.length);
        return;
      }

      // Si no hay cache válido, hacer fetch
      if (!isInitializedRef.current) {
        isInitializedRef.current = true;
        fetchUsers();
      }
    }, [user?.id, fetchUsers, isCacheValid]);

    // Setup de onSnapshot para usuarios (reutilizar listeners existentes)
    useEffect(() => {
      if (!user?.id) return;

      const cacheKey = `users_${user.id}`;
      
      // Verificar si ya existe un listener para este usuario
      const existingListener = globalCache.listeners.get(cacheKey);
      
      if (existingListener?.users) {
        console.log('[MembersTable] Reusing existing users listener');
        // El listener ya existe, solo actualizar los datos si hay cache
        if (globalCache.users.has(cacheKey)) {
          const cachedData = globalCache.users.get(cacheKey)!.data;
          usersRef.current = cachedData;
          setUsers(cachedData);
          setIsLoadingUsers(false);
        }
        return;
      }

      console.log('[MembersTable] Setting up new users onSnapshot listener');
      
      const usersQuery = query(collection(db, 'users'));
      const unsubscribeUsers = onSnapshot(
        usersQuery,
        (snapshot) => {
          console.log('[MembersTable] Users onSnapshot update:', snapshot.docChanges().length);
          
          // Solo actualizar si hay cambios reales
          const changes = snapshot.docChanges();
          if (changes.length === 0) return;
          
          setUsers(prevUsers => {
            const updatedUsers = [...prevUsers];
            let hasChanges = false;
            
            changes.forEach((change) => {
              const userData = change.doc.data();
              const userIndex = updatedUsers.findIndex(u => u.id === change.doc.id);
              
              if (change.type === 'modified' && userIndex !== -1) {
                // Solo actualizar campos específicos
                const currentUser = updatedUsers[userIndex];
                const updatedUser = {
                  ...currentUser,
                  role: userData.role || currentUser.role,
                  status: userData.status || currentUser.status,
                  description: userData.description || currentUser.description,
                };
                
                // Solo actualizar si realmente cambió
                if (JSON.stringify(currentUser) !== JSON.stringify(updatedUser)) {
                  updatedUsers[userIndex] = updatedUser;
                  hasChanges = true;
                }
              } else if (change.type === 'removed' && userIndex !== -1) {
                updatedUsers.splice(userIndex, 1);
                hasChanges = true;
              }
            });
            
            if (hasChanges) {
              usersRef.current = updatedUsers;
              // Actualizar cache
              globalCache.users.set(cacheKey, {
                data: updatedUsers,
                timestamp: Date.now(),
              });
            }
            
            return hasChanges ? updatedUsers : prevUsers;
          });
        },
        (error) => {
          console.error('[MembersTable] Error in users onSnapshot:', error);
        }
      );

      // Guardar el listener en el cache global
      globalCache.listeners.set(cacheKey, {
        users: unsubscribeUsers,
        tasks: existingListener?.tasks || null,
      });

      usersUnsubscribeRef.current = unsubscribeUsers;

      return () => {
        // No limpiar el listener aquí, solo marcar como no disponible para este componente
        usersUnsubscribeRef.current = null;
      };
    }, [user?.id]);

    // Setup de tareas con cache optimizado (reutilizar listeners existentes)
    useEffect(() => {
      if (!user?.id) return;

      const cacheKey = `tasks_${user.id}`;
      
      // Verificar si ya existe un listener para este usuario
      const existingListener = globalCache.listeners.get(cacheKey);
      
      if (existingListener?.tasks) {
        console.log('[MembersTable] Reusing existing tasks listener');
        // El listener ya existe, solo actualizar los datos si hay cache
        if (globalCache.tasks.has(cacheKey)) {
          const cachedData = globalCache.tasks.get(cacheKey)!.data;
          tasksRef.current = cachedData;
          setTasks(cachedData);
          setIsLoadingTasks(false);
        }
        return;
      }
      
      // Verificar cache primero
      if (isCacheValid(cacheKey, globalCache.tasks)) {
        const cachedData = globalCache.tasks.get(cacheKey)!.data;
        tasksRef.current = cachedData;
        setTasks(cachedData);
        setIsLoadingTasks(false);
        console.log('[MembersTable] Using cached tasks on remount:', cachedData.length);
        return;
      }

      console.log('[MembersTable] Setting up new tasks onSnapshot listener');
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

          console.log('[MembersTable] Tasks onSnapshot update:', tasksData.length);
          
          tasksRef.current = tasksData;
          setTasks(tasksData);
          
          // Actualizar cache
          globalCache.tasks.set(cacheKey, {
            data: tasksData,
            timestamp: Date.now(),
          });
          
          setIsLoadingTasks(false);
        },
        (error) => {
          console.error('[MembersTable] Error in tasks onSnapshot:', error);
          setTasks([]);
          setIsLoadingTasks(false);
        }
      );

      // Guardar el listener en el cache global
      globalCache.listeners.set(cacheKey, {
        users: existingListener?.users || null,
        tasks: unsubscribeTasks,
      });

      tasksUnsubscribeRef.current = unsubscribeTasks;

      return () => {
        // No limpiar el listener aquí, solo marcar como no disponible para este componente
        tasksUnsubscribeRef.current = null;
      };
    }, [user?.id, isCacheValid]);

    // Calcular proyectos activos por usuario (memoizado)
    const activeProjectsCount = useMemo(() => {
      const validStatuses = ['En Proceso', 'Diseño', 'Desarrollo'];
      const counts: { [userId: string]: number } = {};

      users.forEach((u) => {
        counts[u.id] = tasks.filter(
          (task) =>
            validStatuses.includes(task.status) &&
            (task.AssignedTo.includes(u.id) || task.LeadedBy.includes(u.id)),
        ).length;
      });

      return counts;
    }, [users, tasks]);

    // Filtrar y ordenar usuarios (memoizado)
    const memoizedFilteredUsers = useMemo(() => {
      const currentUser = users.find((u) => u.id === user?.id);
      const otherUsers = users.filter((u) => u.id !== user?.id);
      const sortedUsers = [...otherUsers].sort((a, b) =>
        a.fullName.toLowerCase().localeCompare(b.fullName.toLowerCase()),
      );
      return currentUser ? [{ ...currentUser, fullName: `${currentUser.fullName} (Tú)` }, ...sortedUsers] : sortedUsers;
    }, [users, user?.id]);

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
          width: '10%',
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
          width: '60%',
          mobileVisible: true,
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
      [activeProjectsCount],
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
          onRowClick={(u: User, columnKey: string) =>
            ['imageUrl', 'fullName', 'role', 'activeProjects', 'status'].includes(columnKey) &&
            u.id !== user?.id &&
            onMessageSidebarOpen(u)
          }
          emptyStateType="members"
        />
      </div>
    );
  },
);

MembersTable.displayName = 'MembersTable';

export default MembersTable;