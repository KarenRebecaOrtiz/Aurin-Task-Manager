import { useEffect, useRef, useCallback, useState } from 'react';
import { collection, onSnapshot, query, doc, getDoc, Timestamp, limit, orderBy, getDocs, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useDataStore } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';

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
  // ✅ SOLUCIÓN DRÁSTICA: Usar getState() para evitar suscripciones reactivas
  const dataStore = useDataStore.getState();
  const {
    setTasks,
    setClients,
    setUsers,
    setIsLoadingTasks,
    setIsLoadingClients,
    setIsLoadingUsers,
    setIsInitialLoadComplete,
    setLoadingProgress,
  } = dataStore;

  // ✅ SOLUCIÓN DRÁSTICA: Estado local para evitar re-renders del store
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [localClients, setLocalClients] = useState<Client[]>([]);
  const [localUsers, setLocalUsers] = useState<User[]>([]);
  const [localIsLoadingTasks, setLocalIsLoadingTasks] = useState(false);
  const [localIsLoadingClients, setLocalIsLoadingClients] = useState(false);
  const [localIsLoadingUsers, setLocalIsLoadingUsers] = useState(false);
  const [localIsInitialLoadComplete, setLocalIsInitialLoadComplete] = useState(false);
  const [localLoadingProgress, setLocalLoadingProgress] = useState({
    tasks: false,
    clients: false,
    users: false,
  });

  // Estado para rastrear si Firebase Auth está listo
  const [isFirebaseAuthReady, setIsFirebaseAuthReady] = useState(false);

  // ✅ SOLUCIÓN DRÁSTICA: Refs para evitar re-renders innecesarios
  const tasksListenerRef = useRef<(() => void) | null>(null);
  const clientsListenerRef = useRef<(() => void) | null>(null);
  const hasInitializedRef = useRef(false);
  const lastTasksHashRef = useRef<string>('');
  const lastClientsHashRef = useRef<string>('');
  const lastUsersHashRef = useRef<string>('');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ SOLUCIÓN DRÁSTICA: Función para verificar si la carga inicial está completa
  const checkInitialLoadComplete = useCallback(() => {
    if (hasInitializedRef.current && !localIsLoadingTasks && !localIsLoadingClients && !localIsLoadingUsers) {
      setLocalIsInitialLoadComplete(true);
      setIsInitialLoadComplete(true);
    }
  }, [localIsLoadingTasks, localIsLoadingClients, localIsLoadingUsers, setIsInitialLoadComplete]);

  // ✅ SOLUCIÓN DRÁSTICA: Cargar datos solo una vez al montar
  useEffect(() => {
    if (!userId) return;

    // ✅ SOLUCIÓN DRÁSTICA: Verificar Firebase Auth de forma síncrona
    const checkAuth = () => {
      if (auth.currentUser && auth.currentUser.uid === userId) {
        setIsFirebaseAuthReady(true);
        return true;
      }
      return false;
    };

    // Si ya está autenticado, cargar datos inmediatamente
    if (checkAuth()) {
      loadAllData();
      return;
    }

    // Si no está autenticado, esperar un poco y forzar la carga
    const timeout = setTimeout(() => {
      setIsFirebaseAuthReady(true);
      loadAllData();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [userId]);

  // ✅ SOLUCIÓN DRÁSTICA: Función para cargar todos los datos
  const loadAllData = useCallback(async () => {
    if (!userId) return;

    // Cargar tasks
    try {
      setLocalIsLoadingTasks(true);
      setIsLoadingTasks(true);
      
      // ✅ SOLUCIÓN DRÁSTICA: Restaurar query original pero optimizada
      const tasksQuery = query(
        collection(db, 'tasks'),
        limit(100), // Limitar a 100 tareas para evitar re-renders masivos
        orderBy('createdAt', 'desc')
      );
      
      const tasksSnapshot = await getDocs(tasksQuery);
      const tasksData: Task[] = tasksSnapshot.docs.map((doc) => {
        const rawStatus = doc.data().status;
        
        return {
          id: doc.id,
          clientId: doc.data().clientId || '',
          project: doc.data().project || '',
          name: doc.data().name || '',
          description: doc.data().description || '',
          status: rawStatus || '',
          priority: doc.data().priority || '',
          startDate: safeTimestampToISOOrNull(doc.data().startDate),
          endDate: safeTimestampToISOOrNull(doc.data().endDate),
          LeadedBy: doc.data().LeadedBy || [],
          AssignedTo: doc.data().AssignedTo || [],
          createdAt: safeTimestampToISO(doc.data().createdAt),
          CreatedBy: doc.data().CreatedBy || '',
          lastActivity: safeTimestampToISO(doc.data().lastActivity),
          hasUnreadUpdates: doc.data().hasUnreadUpdates || false,
          lastViewedBy: doc.data().lastViewedBy || {},
          archived: doc.data().archived || false,
          archivedAt: safeTimestampToISOOrNull(doc.data().archivedAt),
          archivedBy: doc.data().archivedBy || '',
        };
      });

      // ✅ SOLUCIÓN DRÁSTICA: Solo actualizar si realmente cambió
      const tasksDataString = JSON.stringify(tasksData);
      if (tasksDataString !== lastTasksHashRef.current) {
        lastTasksHashRef.current = tasksDataString;
        setLocalTasks(tasksData);
        setTasks(tasksData);
      }
      
      setLocalIsLoadingTasks(false);
      setIsLoadingTasks(false);
      setLocalLoadingProgress(prev => ({ ...prev, tasks: true }));
      setLoadingProgress({ tasks: true });
    } catch (error) {
      setLocalIsLoadingTasks(false);
      setIsLoadingTasks(false);
    }

    // Cargar clients
    try {
      setLocalIsLoadingClients(true);
      setIsLoadingClients(true);
      
      // ✅ SOLUCIÓN DRÁSTICA: Restaurar query original pero optimizada
      const clientsQuery = query(
        collection(db, 'clients'),
        limit(50) // Limitar clients también
      );
      
      const clientsSnapshot = await getDocs(clientsQuery);
      const clientsData: Client[] = clientsSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || '',
        imageUrl: doc.data().imageUrl || '/empty-image.png',
        projectCount: doc.data().projectCount || 0,
        projects: doc.data().projects || [],
        createdBy: doc.data().createdBy || '',
        createdAt: safeTimestampToISO(doc.data().createdAt),
      }));

      // ✅ SOLUCIÓN DRÁSTICA: Solo actualizar si realmente cambió
      const clientsDataString = JSON.stringify(clientsData);
      if (clientsDataString !== lastClientsHashRef.current) {
        lastClientsHashRef.current = clientsDataString;
        setLocalClients(clientsData);
        setClients(clientsData);
      }
      
      setLocalIsLoadingClients(false);
      setIsLoadingClients(false);
      setLocalLoadingProgress(prev => ({ ...prev, clients: true }));
      setLoadingProgress({ clients: true });
    } catch (error) {
      setLocalIsLoadingClients(false);
      setIsLoadingClients(false);
    }

    // Cargar users
    console.log('[useSharedTasksState] Starting to fetch users from /api/users');
    try {
      setLocalIsLoadingUsers(true);
      setIsLoadingUsers(true);

      const response = await fetch('/api/users');
      console.log('[useSharedTasksState] Fetch response status:', response.status);
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('[useSharedTasksState] Response data structure:', {
        hasSuccess: 'success' in responseData,
        hasData: 'data' in responseData,
        isArray: Array.isArray(responseData),
      });

      // La API devuelve { success: true, data: [...] }
      const clerkUsers: {
        id: string;
        imageUrl?: string;
        firstName?: string;
        lastName?: string;
        publicMetadata: { role?: string; description?: string };
      }[] = responseData.success ? responseData.data : responseData;

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

      // ✅ SOLUCIÓN DRÁSTICA: Solo actualizar si realmente cambió
      const usersDataString = JSON.stringify(usersData);
      console.log('[useSharedTasksState] Fetched users from API:', usersData.length);
      console.log('[useSharedTasksState] Users data:', usersData.slice(0, 3));

      if (usersDataString !== lastUsersHashRef.current) {
        lastUsersHashRef.current = usersDataString;
        setLocalUsers(usersData);
        setUsers(usersData);
        console.log('[useSharedTasksState] Updated users in store');
      } else {
        console.log('[useSharedTasksState] Users data unchanged, skipping update');
      }

      setLocalIsLoadingUsers(false);
      setIsLoadingUsers(false);
      setLocalLoadingProgress(prev => ({ ...prev, users: true }));
      setLoadingProgress({ users: true });
    } catch (error) {
      console.error('[useSharedTasksState] Error fetching users:', error);
      setLocalIsLoadingUsers(false);
      setIsLoadingUsers(false);
    }

    // Marcar como inicializado
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      
      // ✅ SOLUCIÓN DRÁSTICA: Verificar si la carga inicial está completa inmediatamente
      const isNotLoading = !localIsLoadingTasks && !localIsLoadingClients && !localIsLoadingUsers;
      if (isNotLoading) {
        setLocalIsInitialLoadComplete(true);
        setIsInitialLoadComplete(true);
      }
    }
  }, [userId, setTasks, setClients, setUsers, setIsLoadingTasks, setIsLoadingClients, setIsLoadingUsers, setLoadingProgress]);

  // ✅ SOLUCIÓN DRÁSTICA: Eliminado useEffect problemático que causaba re-renders

  return {
    tasks: localTasks,
    clients: localClients,
    users: localUsers,
    isLoadingTasks: localIsLoadingTasks,
    isLoadingClients: localIsLoadingClients,
    isLoadingUsers: localIsLoadingUsers,
    isInitialLoadComplete: localIsInitialLoadComplete,
    loadingProgress: localLoadingProgress,
  };
} 