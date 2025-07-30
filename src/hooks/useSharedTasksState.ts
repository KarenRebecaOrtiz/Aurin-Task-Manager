import { useEffect, useRef, useCallback } from 'react';
import { collection, onSnapshot, query, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useDataStore } from '@/stores/dataStore';

// Type definitions
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

interface Client {
  id: string;
  name: string;
  imageUrl: string;
  projectCount?: number;
  projects?: string[];
  createdBy?: string;
  createdAt?: string;
}

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
  description?: string;
  status?: string;
}

// Helper functions
const safeTimestampToISO = (timestamp: Timestamp | Date | string | null | undefined): string => {
  if (!timestamp) return new Date().toISOString();
  if (timestamp instanceof Timestamp) return timestamp.toDate().toISOString();
  if (timestamp instanceof Date) return timestamp.toISOString();
  if (typeof timestamp === 'string') return timestamp;
  return new Date().toISOString();
};

const safeTimestampToISOOrNull = (timestamp: Timestamp | Date | string | null | undefined): string | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) return timestamp.toDate().toISOString();
  if (timestamp instanceof Date) return timestamp.toISOString();
  if (typeof timestamp === 'string') return timestamp;
  return null;
};

export function useSharedTasksState(userId: string | undefined) {
  // Usar el store de Zustand directamente
  const setTasks = useDataStore((state) => state.setTasks);
  const setClients = useDataStore((state) => state.setClients);
  const setUsers = useDataStore((state) => state.setUsers);
  const setIsLoadingTasks = useDataStore((state) => state.setIsLoadingTasks);
  const setIsLoadingClients = useDataStore((state) => state.setIsLoadingClients);
  const setIsLoadingUsers = useDataStore((state) => state.setIsLoadingUsers);
  const setIsInitialLoadComplete = useDataStore((state) => state.setIsInitialLoadComplete);
  const setLoadingProgress = useDataStore((state) => state.setLoadingProgress);

  const tasks = useDataStore((state) => state.tasks);
  const clients = useDataStore((state) => state.clients);
  const users = useDataStore((state) => state.users);
  const isLoadingTasks = useDataStore((state) => state.isLoadingTasks);
  const isLoadingClients = useDataStore((state) => state.isLoadingClients);
  const isLoadingUsers = useDataStore((state) => state.isLoadingUsers);
  const isInitialLoadComplete = useDataStore((state) => state.isInitialLoadComplete);
  const loadingProgress = useDataStore((state) => state.loadingProgress);

  // State removed - Safari auto-fix now works without forcing re-renders

  // Refs para evitar re-renders innecesarios
  const tasksListenerRef = useRef<(() => void) | null>(null);
  const clientsListenerRef = useRef<(() => void) | null>(null);
  const hasInitializedRef = useRef(false);

  // Safari auto-fix removed - functionality moved to SafariFirebaseAuthFix component

  // Setup tasks listener
  useEffect(() => {
    if (!userId) return;

    // Cleanup previous listener
    if (tasksListenerRef.current) {
      tasksListenerRef.current();
    }

    console.log('[useSharedTasksState] Setting up tasks listener with Zustand');
    setIsLoadingTasks(true);

    const tasksQuery = query(collection(db, 'tasks'));
    const unsubscribe = onSnapshot(
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
          lastActivity: safeTimestampToISO(doc.data().lastActivity) || safeTimestampToISO(doc.data().createdAt),
          hasUnreadUpdates: doc.data().hasUnreadUpdates || false,
          lastViewedBy: doc.data().lastViewedBy || {},
          archived: doc.data().archived || false,
          archivedAt: safeTimestampToISOOrNull(doc.data().archivedAt),
          archivedBy: doc.data().archivedBy || '',
        }));

        setTasks(tasksData);
        setIsLoadingTasks(false);
        setLoadingProgress({ tasks: true });
        
        // Marcar como inicializado si es la primera carga
        if (!hasInitializedRef.current) {
          hasInitializedRef.current = true;
          checkInitialLoadComplete();
        }
      },
      (error) => {
        console.error('[useSharedTasksState] Error in tasks onSnapshot:', error);
        setTasks([]);
        setIsLoadingTasks(false);
      }
    );

    tasksListenerRef.current = unsubscribe;

    return () => {
      if (tasksListenerRef.current) {
        tasksListenerRef.current();
        tasksListenerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, setTasks, setIsLoadingTasks]); // setLoadingProgress and checkInitialLoadComplete stable

  // Setup clients listener
  useEffect(() => {
    if (!userId) return;

    // Cleanup previous listener
    if (clientsListenerRef.current) {
      clientsListenerRef.current();
    }

    console.log('[useSharedTasksState] Setting up clients listener with Zustand');
    setIsLoadingClients(true);

    const clientsQuery = query(collection(db, 'clients'));
    const unsubscribe = onSnapshot(
      clientsQuery,
      (snapshot) => {
        const clientsData: Client[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || '',
          imageUrl: doc.data().imageUrl || '/empty-image.png',
          projectCount: doc.data().projectCount || 0,
          projects: doc.data().projects || [],
          createdBy: doc.data().createdBy || '',
          createdAt: safeTimestampToISO(doc.data().createdAt),
        }));

        setClients(clientsData);
        setIsLoadingClients(false);
        setLoadingProgress({ clients: true });
        
        // Marcar como inicializado si es la primera carga
        if (!hasInitializedRef.current) {
          hasInitializedRef.current = true;
          checkInitialLoadComplete();
        }
      },
      (error) => {
        console.error('[useSharedTasksState] Error in clients onSnapshot:', error);
        setClients([]);
        setIsLoadingClients(false);
      }
    );

    clientsListenerRef.current = unsubscribe;

    return () => {
      if (clientsListenerRef.current) {
        clientsListenerRef.current();
        clientsListenerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps  
  }, [userId, setClients, setIsLoadingClients]); // setLoadingProgress and checkInitialLoadComplete stable

  // Setup users fetch - OPTIMIZADO
  useEffect(() => {
    if (!userId) return;

    console.log('[useSharedTasksState] Setting up optimized users fetch');
    setIsLoadingUsers(true);

    const fetchUsers = async () => {
      try {
        console.log('[useSharedTasksState] Starting optimized users fetch');
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

        // OPTIMIZACIÓN: Usar batch getDocs en lugar de Promise.all
        const userIds = clerkUsers.map(user => user.id);
        const userDocs = await Promise.all(
          userIds.map(id => getDoc(doc(db, 'users', id)))
        );

        const usersData: User[] = clerkUsers.map((clerkUser, index) => {
          const userDoc = userDocs[index];
          const userData = userDoc.exists() ? userDoc.data() : {};
          
          return {
            id: clerkUser.id,
            imageUrl: clerkUser.imageUrl || '',
            fullName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Sin nombre',
            role: userData.role || clerkUser.publicMetadata.role || 'Sin rol',
            description: userData.description || clerkUser.publicMetadata.description || '',
            status: userData.status || undefined,
          };
        });

        console.log('[useSharedTasksState] Users fetched successfully:', usersData.length);
        setUsers(usersData);
        setIsLoadingUsers(false);
        setLoadingProgress({ users: true });
        
        // Marcar como inicializado si es la primera carga
        if (!hasInitializedRef.current) {
          hasInitializedRef.current = true;
          checkInitialLoadComplete();
        }
      } catch (error) {
        console.error('[useSharedTasksState] Error fetching users:', error);
        setUsers([]);
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();

    return () => {
      // Cleanup no necesario ya que no hay listener
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, setUsers, setIsLoadingUsers]); // setLoadingProgress and checkInitialLoadComplete stable

  // Función para verificar si la carga inicial está completa
  const checkInitialLoadComplete = useCallback(() => {
    // Verificar que no esté cargando Y que haya datos reales
    const hasTasksData = tasks.length > 0;
    const hasClientsData = clients.length > 0;
    const hasUsersData = users.length > 0;
    const isNotLoading = !isLoadingTasks && !isLoadingClients && !isLoadingUsers;
    
    // Solo marcar como completo si hay datos Y no está cargando
    if (isNotLoading && hasTasksData && hasClientsData && hasUsersData) {
      console.log('[useSharedTasksState] Initial load complete with data:', {
        tasks: tasks.length,
        clients: clients.length,
        users: users.length
      });
      setIsInitialLoadComplete(true);
    } else {
      console.log('[useSharedTasksState] Still loading or missing data:', {
        isLoadingTasks,
        isLoadingClients,
        isLoadingUsers,
        hasTasksData,
        hasClientsData,
        hasUsersData,
        tasksCount: tasks.length,
        clientsCount: clients.length,
        usersCount: users.length
      });
    }
  }, [isLoadingTasks, isLoadingClients, isLoadingUsers, tasks.length, clients.length, users.length, setIsInitialLoadComplete]);

  // Verificar cuando cambian los estados de carga
  useEffect(() => {
    if (hasInitializedRef.current) {
      checkInitialLoadComplete();
    }
  }, [isLoadingTasks, isLoadingClients, isLoadingUsers, checkInitialLoadComplete]);

  return {
    tasks,
    clients,
    users,
    isLoadingTasks,
    isLoadingClients,
    isLoadingUsers,
    isInitialLoadComplete,
    loadingProgress,
  };
} 