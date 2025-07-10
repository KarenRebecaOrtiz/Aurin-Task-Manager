import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, query, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
  projectCount: number;
  projects: string[];
  createdBy: string;
  createdAt: string;
}

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
  description?: string;
  status?: string;
}

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
  
  if (typeof timestamp === 'string') return timestamp;
  
  if (isFirestoreTimestamp(timestamp)) {
    return timestamp.toDate().toISOString();
  }
  
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  return new Date().toISOString();
};

// Helper function to safely convert Firestore timestamp or string to ISO string or null
const safeTimestampToISOOrNull = (timestamp: unknown): string | null => {
  if (!timestamp) return null;
  
  if (typeof timestamp === 'string') return timestamp;
  
  if (isFirestoreTimestamp(timestamp)) {
    return timestamp.toDate().toISOString();
  }
  
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  return null;
};

// Cache implementation - ELIMINAR CACHÉ PARA TAREAS
const sharedCache = {
  clients: new Map<string, Client[]>(),
  users: new Map<string, User[]>(),
  lastUpdate: {
    clients: 0,
    users: 0
  }
};

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

export function useSharedTasksState(userId: string | undefined) {
  // States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Refs for cleanup
  const unsubscribeRefs = useRef<{ [key: string]: () => void }>({});

  // Check if cache is valid - SOLO PARA CLIENTS Y USERS
  const isCacheValid = useCallback((type: 'clients' | 'users') => {
    const lastUpdate = sharedCache.lastUpdate[type];
    return Date.now() - lastUpdate < CACHE_DURATION;
  }, []);



  // Setup tasks listener - SIN CACHÉ, SIEMPRE TIEMPO REAL
  useEffect(() => {
    if (!userId) return;

    console.log('[useSharedTasksState] Setting up tasks listener - NO CACHE');
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

        console.log('[useSharedTasksState] Tasks onSnapshot update - IMMEDIATE:', {
          count: tasksData.length,
          taskIds: tasksData.map(t => t.id),
          statuses: [...new Set(tasksData.map(t => t.status))],
          timestamp: new Date().toISOString(),
          hasStatusChanges: tasksData.some(t => t.status !== 'Por Iniciar'),
          statusDetails: tasksData.map(t => ({ id: t.id, status: t.status, name: t.name }))
        });

        // 🔒 FILTRO DE PERMISOS: Solo pasar tareas que el usuario puede ver
        // Por ahora, pasamos todas las tareas y el filtrado se hace en los componentes
        // Esto es más eficiente porque los componentes pueden hacer cache de los permisos
        setTasks(tasksData);
        setIsLoadingTasks(false);
        
        // Forzar refresco adicional para cambios de estado
        const statusChanges = tasksData.map(t => `${t.id}-${t.status}`).join(',');
        console.log('[useSharedTasksState] Status changes detected:', statusChanges);
      },
      (error) => {
        console.error('[useSharedTasksState] Error in tasks onSnapshot:', error);
        setTasks([]);
        setIsLoadingTasks(false);
      }
    );

    // Capture current ref value to avoid ESLint warning
    const currentRef = unsubscribeRefs.current;
    currentRef.tasks = unsubscribe;
    return () => unsubscribe();
  }, [userId]);

  // Setup clients listener
  useEffect(() => {
    if (!userId) return;

    console.log('[useSharedTasksState] Setting up clients listener');
    setIsLoadingClients(true);

    // Check cache first
    if (isCacheValid('clients') && sharedCache.clients.has(userId)) {
      console.log('[useSharedTasksState] Using cached clients');
      setClients(sharedCache.clients.get(userId) || []);
      setIsLoadingClients(false);
      return;
    }

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

        // Update cache
        sharedCache.clients.set(userId, clientsData);
        sharedCache.lastUpdate.clients = Date.now();

        setClients(clientsData);
        setIsLoadingClients(false);
      },
      (error) => {
        console.error('[useSharedTasksState] Error in clients onSnapshot:', error);
        setClients([]);
        setIsLoadingClients(false);
      }
    );

    // Capture current ref value to avoid ESLint warning
    const currentRef = unsubscribeRefs.current;
    currentRef.clients = unsubscribe;
    return () => unsubscribe();
  }, [userId, isCacheValid]);

  // Setup users fetch and listener
  useEffect(() => {
    if (!userId) return;

    console.log('[useSharedTasksState] Setting up users fetch');
    setIsLoadingUsers(true);

    // Check cache first
    if (isCacheValid('users') && sharedCache.users.has(userId)) {
      console.log('[useSharedTasksState] Using cached users');
      setUsers(sharedCache.users.get(userId) || []);
      setIsLoadingUsers(false);
      return;
    }

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
                description: userDoc.exists() && userDoc.data().description
                  ? userDoc.data().description
                  : (clerkUser.publicMetadata.description || ''),
                status: userDoc.exists() && userDoc.data().status
                  ? userDoc.data().status
                  : undefined,
              };
            } catch {
              return {
                id: clerkUser.id,
                imageUrl: clerkUser.imageUrl || '',
                fullName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Sin nombre',
                role: clerkUser.publicMetadata.role || 'Sin rol',
                description: clerkUser.publicMetadata.description || '',
              };
            }
          }),
        );

        // Update cache
        sharedCache.users.set(userId, usersData);
        sharedCache.lastUpdate.users = Date.now();

        setUsers(usersData);
        setIsLoadingUsers(false);
      } catch (error) {
        console.error('[useSharedTasksState] Error fetching users:', error);
        setUsers([]);
        setIsLoadingUsers(false);
      }
    };

    // Initial fetch
    fetchUsers();

    // Setup listener for user changes
    const usersQuery = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(usersQuery, () => {
      fetchUsers();
    });

    // Capture current ref value to avoid ESLint warning
    const currentRef = unsubscribeRefs.current;
    currentRef.users = unsubscribe;
    return () => unsubscribe();
  }, [userId, isCacheValid]);

  // Cleanup function
  useEffect(() => {
    // Capture current ref value to avoid ESLint warning
    const currentUnsubscribes = unsubscribeRefs.current;
    
    return () => {
      Object.values(currentUnsubscribes).forEach(unsubscribe => unsubscribe());
    };
  }, []);

  return {
    tasks,
    clients,
    users,
    isLoadingTasks,
    isLoadingClients,
    isLoadingUsers
  };
} 