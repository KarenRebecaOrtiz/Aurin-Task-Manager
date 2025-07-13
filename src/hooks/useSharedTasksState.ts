import { useEffect } from 'react';
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

  const tasks = useDataStore((state) => state.tasks);
  const clients = useDataStore((state) => state.clients);
  const users = useDataStore((state) => state.users);
  const isLoadingTasks = useDataStore((state) => state.isLoadingTasks);
  const isLoadingClients = useDataStore((state) => state.isLoadingClients);
  const isLoadingUsers = useDataStore((state) => state.isLoadingUsers);

  // Setup tasks listener
  useEffect(() => {
    if (!userId) return;

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

        // Only log significant changes to reduce console noise
        const hasStatusChanges = tasksData.some(t => t.status !== 'Por Iniciar');
        if (hasStatusChanges) {
          console.log('[useSharedTasksState] Tasks updated with status changes:', tasksData.length);
        }

        setTasks(tasksData);
        setIsLoadingTasks(false);
      },
      (error) => {
        console.error('[useSharedTasksState] Error in tasks onSnapshot:', error);
        setTasks([]);
        setIsLoadingTasks(false);
      }
    );

    return () => unsubscribe();
  }, [userId, setTasks, setIsLoadingTasks]);

  // Setup clients listener
  useEffect(() => {
    if (!userId) return;

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
      },
      (error) => {
        console.error('[useSharedTasksState] Error in clients onSnapshot:', error);
        setClients([]);
        setIsLoadingClients(false);
      }
    );

    return () => unsubscribe();
  }, [userId, setClients, setIsLoadingClients]);

  // Setup users fetch and listener
  useEffect(() => {
    if (!userId) return;

    console.log('[useSharedTasksState] Setting up users fetch with Zustand');
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

    return () => unsubscribe();
  }, [userId, setUsers, setIsLoadingUsers]);

  return {
    tasks,
    clients,
    users,
    isLoadingTasks,
    isLoadingClients,
    isLoadingUsers
  };
} 