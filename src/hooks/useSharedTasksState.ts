import { useEffect, useRef, useCallback, useState } from 'react';
import { collection, onSnapshot, query, doc, getDoc, Timestamp, limit, orderBy } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
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

  // Estado para rastrear si Firebase Auth está listo
  const [isFirebaseAuthReady, setIsFirebaseAuthReady] = useState(false);

  // Refs para evitar re-renders innecesarios
  const tasksListenerRef = useRef<(() => void) | null>(null);
  const clientsListenerRef = useRef<(() => void) | null>(null);
  const hasInitializedRef = useRef(false);

  // Monitorear Firebase Auth readiness
  useEffect(() => {
    if (!userId) return;

    // Check Firebase Auth readiness
    
    // Verificar si Firebase Auth ya está listo
    if (auth.currentUser && auth.currentUser.uid === userId) {

      setIsFirebaseAuthReady(true);
      return;
    }

    // Listener para cambios en el estado de autenticación
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && user.uid === userId) {

        setIsFirebaseAuthReady(true);
      } else if (!user) {

        setIsFirebaseAuthReady(false);
      }
    });

    // Listener para el evento de Safari fix
    const handleSafariAuthFixed = (event: CustomEvent) => {

      if (event.detail?.userId === userId) {
        setIsFirebaseAuthReady(true);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('safariFirebaseAuthFixed', handleSafariAuthFixed as EventListener);
    }

    // Timeout de seguridad - si después de 10 segundos no hay autenticación, forzar el inicio
    const timeout = setTimeout(() => {
      if (!auth.currentUser) {
        setIsFirebaseAuthReady(true);
      }
    }, 10000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
      if (typeof window !== 'undefined') {
        window.removeEventListener('safariFirebaseAuthFixed', handleSafariAuthFixed as EventListener);
      }
    };
  }, [userId]);

  // Setup tasks listener
  useEffect(() => {
    if (!userId || !isFirebaseAuthReady) return;

    // Cleanup previous listener
    if (tasksListenerRef.current) {
      tasksListenerRef.current();
    }

    setIsLoadingTasks(true);

    // ✅ OPTIMIZACIÓN: Agregar limit y orderBy para reducir re-renders
    const tasksQuery = query(
      collection(db, 'tasks'),
      limit(100), // Limitar a 100 tareas para evitar re-renders masivos
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const tasksData: Task[] = snapshot.docs.map((doc) => {
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
            lastActivity: safeTimestampToISO(doc.data().lastActivity) || safeTimestampToISO(doc.data().createdAt),
            hasUnreadUpdates: doc.data().hasUnreadUpdates || false,
            lastViewedBy: doc.data().lastViewedBy || {},
            archived: doc.data().archived || false,
            archivedAt: safeTimestampToISOOrNull(doc.data().archivedAt),
            archivedBy: doc.data().archivedBy || '',
          };
        });

        // ✅ OPTIMIZACIÓN: Memoizar datos antes de setState para evitar re-renders innecesarios
        const tasksDataString = JSON.stringify(tasksData);
        const currentTasksString = JSON.stringify(tasks);
        
        // Solo actualizar si realmente cambió
        if (tasksDataString !== currentTasksString) {
          setTasks(tasksData);
        }
        
        setIsLoadingTasks(false);
        setLoadingProgress({ tasks: true });
        
        // Marcar como inicializado si es la primera carga
        if (!hasInitializedRef.current) {
          hasInitializedRef.current = true;
          checkInitialLoadComplete();
        }
      },
      () => {
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
  }, [userId, isFirebaseAuthReady, setTasks, setIsLoadingTasks]); // setLoadingProgress and checkInitialLoadComplete stable

  // Setup clients listener
  useEffect(() => {
    if (!userId || !isFirebaseAuthReady) return;

    // Cleanup previous listener
    if (clientsListenerRef.current) {
      clientsListenerRef.current();
    }

    setIsLoadingClients(true);

    // ✅ OPTIMIZACIÓN: Agregar limit para clients también
    const clientsQuery = query(
      collection(db, 'clients'),
      limit(50) // Limitar clients también
    );
    
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

        // ✅ OPTIMIZACIÓN: Memoizar clients también
        const clientsDataString = JSON.stringify(clientsData);
        const currentClientsString = JSON.stringify(clients);
        
        if (clientsDataString !== currentClientsString) {
          setClients(clientsData);
        }
        
        setIsLoadingClients(false);
        setLoadingProgress({ clients: true });
        
        // Marcar como inicializado si es la primera carga
        if (!hasInitializedRef.current) {
          hasInitializedRef.current = true;
          checkInitialLoadComplete();
        }
      },
      () => {
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
  }, [userId, isFirebaseAuthReady, setClients, setIsLoadingClients]); // setLoadingProgress and checkInitialLoadComplete stable

  // Setup users fetch - OPTIMIZADO
  useEffect(() => {
    if (!userId || !isFirebaseAuthReady) return;


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

  
        setUsers(usersData);
        setIsLoadingUsers(false);
        setLoadingProgress({ users: true });
        
        // Marcar como inicializado si es la primera carga
        if (!hasInitializedRef.current) {
          hasInitializedRef.current = true;
          checkInitialLoadComplete();
        }
      } catch {
        setIsLoadingUsers(false);
      }
    };

    fetchUsers();

    return () => {
      // Cleanup no necesario ya que no hay listener
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isFirebaseAuthReady, setUsers, setIsLoadingUsers]); // setLoadingProgress and checkInitialLoadComplete stable

  // Función para verificar si la carga inicial está completa
  const checkInitialLoadComplete = useCallback(() => {
    // Solo verificar si Firebase Auth está listo
    if (!isFirebaseAuthReady) {

      return;
    }

    // Verificar que no esté cargando
    const isNotLoading = !isLoadingTasks && !isLoadingClients && !isLoadingUsers;
    
    // Si ya no está cargando, marcar como completo independientemente de si hay datos
    // Esto maneja el caso donde un usuario no tiene datos pero la carga está completa
    if (isNotLoading) {
      // Initial load complete
      setIsInitialLoadComplete(true);
    } else {
      // Still loading data...
    }
  }, [isLoadingTasks, isLoadingClients, isLoadingUsers, isFirebaseAuthReady, setIsInitialLoadComplete]);

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