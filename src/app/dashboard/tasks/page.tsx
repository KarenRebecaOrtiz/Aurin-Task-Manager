'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { gsap } from 'gsap';
import Header from '@/components/ui/Header';
import Marquee from '@/components/ui/Marquee';
import SyncUserToFirestore from '@/components/SyncUserToFirestore';
import OnboardingStepper from '@/components/OnboardingStepper';
import Selector from '@/components/Selector';
import MembersTable, { cleanupMembersTableListeners } from '@/components/MembersTable';
import ClientsTable, { cleanupClientsTableListeners } from '@/components/ClientsTable';
import TasksTable, { cleanupTasksTableListeners } from '@/components/TasksTable';
import TasksKanban, { cleanupTasksKanbanListeners } from '@/components/TasksKanban';
import ArchiveTable from '@/components/ArchiveTable';
import CreateTask from '@/components/CreateTask';
import EditTask from '@/components/EditTask';
import AISidebar from '@/components/AISidebar';
import ChatSidebar from '@/components/ChatSidebar';
import MessageSidebar from '@/components/MessageSidebar';
import ProfileCard from '@/components/ProfileCard';
import ConfigPage from '@/components/ConfigPage';
import { CursorProvider, Cursor, CursorFollow } from '@/components/ui/Cursor';
import { db } from '@/lib/firebase';
import { invalidateClientsCache } from '@/lib/cache-utils';
import { archiveTask, unarchiveTask } from '@/lib/taskUtils';
import styles from '@/components/TasksPage.module.scss';
import clientStyles from '@/components/ClientsTable.module.scss';
import { v4 as uuidv4 } from 'uuid';
import Dock from '@/components/Dock';
import Footer from '@/components/ui/Footer';
import Loader from '@/components/Loader';
import { AuthProvider, useAuth } from '@/contexts/AuthContext'; // Added useAuth import
import ToDoDynamic from '@/components/ToDoDynamic';
import DeletePopup from '@/components/DeletePopup';
import FailAlert from '@/components/FailAlert';
import SuccessAlert from '@/components/SuccessAlert';
import ClientOverlay from '@/components/ClientOverlay';

// Define types
type SelectorContainer = 'tareas' | 'cuentas' | 'miembros';
type Container = SelectorContainer | 'config';
type TaskView = 'table' | 'kanban';

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

interface Notification {
  id: string;
  userId: string;
  message: string | null;
  timestamp: Timestamp | null;
  read: boolean;
  recipientId: string;
  conversationId?: string;
  taskId?: string;
  type?: string;
}

interface Sidebar {
  id: string;
  type: 'message' | 'chat' | 'client-sidebar';
  data?: User | Task | { client?: Client };
}

// Orden de los contenedores (fuera del componente para evitar recreación en cada render)
const containerOrder: SelectorContainer[] = ['tareas', 'cuentas', 'miembros'];

// Constants
const DATA_FETCH_LIMITS = {
  PERSISTENT_CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
};

// Cache global centralizado para toda la aplicación
const globalAppCache = {
  tasks: new Map<string, { data: Task[]; timestamp: number; lastModified?: string }>(),
  clients: new Map<string, { data: Client[]; timestamp: number; lastModified?: string }>(),
  users: new Map<string, { data: User[]; timestamp: number; lastModified?: string }>(),
  notifications: new Map<string, { data: Notification[]; timestamp: number; lastModified?: string }>(),
  listeners: new Map<string, { 
    tasks: (() => void) | null; 
    clients: (() => void) | null; 
    users: (() => void) | null;
    notifications: (() => void) | null;
  }>(),
  // Cache persistente en localStorage
  persistentCache: {
    tasks: new Map<string, { data: Task[]; timestamp: number; lastModified?: string }>(),
    clients: new Map<string, { data: Client[]; timestamp: number; lastModified?: string }>(),
    users: new Map<string, { data: User[]; timestamp: number; lastModified?: string }>(),
    notifications: new Map<string, { data: Notification[]; timestamp: number; lastModified?: string }>(),
  }
};

// Helper functions
const safeTimestampToISO = (timestamp: unknown): string => {
  if (!timestamp) return new Date().toISOString();
  
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
    return (timestamp as { toDate(): Date }).toDate().toISOString();
  }
  
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  return new Date().toISOString();
};

const safeTimestampToISOOrNull = (timestamp: unknown): string | null => {
  if (!timestamp) return null;
  
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
    return (timestamp as { toDate(): Date }).toDate().toISOString();
        }
  
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
    }
  
  return null;
};

// Cache key function
function getCacheKey(type: 'tasks' | 'clients' | 'users', userId: string) {
  return `tasksPageCache_${type}_${userId}`;
  }

// Función para guardar cache persistente
const savePersistentCache = () => {
  if (typeof window === 'undefined') return; // Solo en cliente
  
  try {
    const toStore: Record<string, Record<string, { data: (Task | Client | User | Notification)[]; timestamp: number; lastModified?: string }>> = {};
    Object.keys(globalAppCache.persistentCache).forEach(dataType => {
      toStore[dataType] = {};
      globalAppCache.persistentCache[dataType as keyof typeof globalAppCache.persistentCache].forEach((value, cacheKey) => {
        toStore[dataType][cacheKey] = value;
      });
    });
    localStorage.setItem('globalAppCache', JSON.stringify(toStore));
  } catch (error) {
    console.warn('[TasksPage] Error saving persistent cache:', error);
  }
};

// Función para limpiar listeners globales
const cleanupGlobalAppListeners = () => {
  console.log('[TasksPage] Cleaning up all global listeners');
  globalAppCache.listeners.forEach((listener) => {
    if (listener.tasks) listener.tasks();
    if (listener.clients) listener.clients();
    if (listener.users) listener.users();
    if (listener.notifications) listener.notifications();
  });
  globalAppCache.listeners.clear();
  globalAppCache.tasks.clear();
  globalAppCache.clients.clear();
  globalAppCache.users.clear();
  globalAppCache.notifications.clear();
  
  // Guardar cache persistente antes de limpiar
  savePersistentCache();
};

// Función para cargar cache persistente desde localStorage
const loadPersistentCache = () => {
  if (typeof window === 'undefined') return; // Solo en cliente
  
  try {
    const stored = localStorage.getItem('globalAppCache');
    if (stored) {
      const parsed = JSON.parse(stored);
      const now = Date.now();
      
      Object.keys(parsed).forEach(dataType => {
        if (parsed[dataType] && typeof parsed[dataType] === 'object') {
          Object.keys(parsed[dataType]).forEach(cacheKey => {
            const item = parsed[dataType][cacheKey];
            if (item && (now - item.timestamp) < DATA_FETCH_LIMITS.PERSISTENT_CACHE_DURATION) {
              globalAppCache.persistentCache[dataType as keyof typeof globalAppCache.persistentCache].set(cacheKey, item);
            }
          });
        }
      });
      console.log('[TasksPage] Persistent cache loaded from localStorage');
    }
  } catch (error) {
    console.warn('[TasksPage] Error loading persistent cache:', error);
  }
};

// Cargar cache persistente al inicializar
loadPersistentCache();

function TasksPageContent() {
  const { user } = useUser();
  const { isAdmin, isLoading, error } = useAuth();
  
  // Referencias para timeouts
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const failTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Estado para alertas
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showFailAlert, setShowFailAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [failMessage, setFailMessage] = useState('');
  const [failErrorMessage, setFailErrorMessage] = useState("");

  // Handler para alertas
  const handleShowSuccessAlert = useCallback((message: string) => {
    setSuccessMessage(message);
    setShowSuccessAlert(true);
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
  }
    successTimeoutRef.current = setTimeout(() => {
      setShowSuccessAlert(false);
    }, 3000);
  }, []);

  const handleShowFailAlert = useCallback((message: string, error?: string) => {
    setFailMessage(message);
    setFailErrorMessage(error || '');
    setShowFailAlert(true);
    if (failTimeoutRef.current) {
      clearTimeout(failTimeoutRef.current);
  }
    failTimeoutRef.current = setTimeout(() => {
      setShowFailAlert(false);
    }, 3000);
  }, []);

  // Handler para alertas de cliente
  const handleClientAlertChange = useCallback((alert: { type: "success" | "fail"; message?: string; error?: string } | null) => {
    if (alert) {
      if (alert.type === "success") {
        handleShowSuccessAlert(alert.message || "Operación exitosa");
      } else {
        handleShowFailAlert(alert.message || "Error", alert.error);
      }
    }
  }, [handleShowSuccessAlert, handleShowFailAlert]);

  // Cleanup effect for timeouts
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      if (failTimeoutRef.current) {
        clearTimeout(failTimeoutRef.current);
      }
    };
  }, []);
  
  // **NUEVO: Timestamp para rastrear la última actualización local**
  const localTaskUpdateTimestamp = useRef<number>(0); // Use AuthContext
  const [selectedContainer, setSelectedContainer] = useState<Container>('tareas');
  const [taskView, setTaskView] = useState<TaskView>('table');
  const [isArchiveTableOpen, setIsArchiveTableOpen] = useState<boolean>(false);
  const [isDeleteClientOpen, setIsDeleteClientOpen] = useState<string | null>(null);
  const [openSidebars, setOpenSidebars] = useState<Sidebar[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState<boolean>(false);
  const [isEditTaskOpen, setIsEditTaskOpen] = useState<boolean>(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isConfirmExitOpen, setIsConfirmExitOpen] = useState<boolean>(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string>('');
  const [isClientLoading, setIsClientLoading] = useState<boolean>(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<{ id: string; imageUrl: string } | null>(null);
  const [showLoader, setShowLoader] = useState<boolean>(true);
  // Add delete popup states
  const [isDeletePopupOpen, setIsDeletePopupOpen] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'task' | 'client'; id: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  // Add ClientSidebar states
  const [isClientSidebarOpen, setIsClientSidebarOpen] = useState<boolean>(false);
  const [clientSidebarData, setClientSidebarData] = useState<{ isEdit: boolean; client?: Client } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const deletePopupRef = useRef<HTMLDivElement>(null);
  const confirmExitPopupRef = useRef<HTMLDivElement>(null);

  // Refs for data tracking
  const tasksRef = useRef<Task[]>([]);
  const clientsRef = useRef<Client[]>([]);
  const usersRef = useRef<User[]>([]);

  const memoizedUsers = useMemo(() => users, [users]);
  const memoizedOpenSidebars = useMemo(() => openSidebars, [openSidebars]);

  // Agregar estado para rastrear la fuente de la edición
  const [editSource, setEditSource] = useState<'archive' | 'tasks' | null>(null);

  useEffect(() => {
    // Hide loader after 3.5 seconds (duration of all animations)
    const timer = setTimeout(() => {
      setShowLoader(false);
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  // Cleanup all table listeners when component unmounts
  useEffect(() => {
    return () => {
      console.log('[TasksPage] Cleaning up all table listeners on unmount');
      cleanupMembersTableListeners();
      cleanupClientsTableListeners();
      cleanupTasksTableListeners();
      cleanupTasksKanbanListeners();
    };
  }, []);

  // Declare handler functions first before using them
  const handleMessageSidebarOpen = useCallback((user: User) => {
    setOpenSidebars((prev) => [
      ...prev,
      { id: uuidv4(), type: 'message' as const, data: user },
    ]);
    console.log('[TasksPage] Opened message sidebar for user:', user.fullName);
    
    // Agregar entrada al historial para el botón atrás
    const currentState = { sidebar: 'message', user: user.id, container: selectedContainer };
    window.history.pushState(currentState, '', window.location.pathname);
  }, [selectedContainer]);

  const handleChatSidebarOpen = useCallback((task: Task) => {
    setOpenSidebars((prev) => [
      ...prev,
      { id: uuidv4(), type: 'chat' as const, data: task },
    ]);
    console.log('[TasksPage] Opened chat sidebar for task:', task.name);
    
    // Agregar entrada al historial para el botón atrás
    const currentState = { sidebar: 'chat', task: task.id, container: selectedContainer };
    window.history.pushState(currentState, '', window.location.pathname);
  }, [selectedContainer]);

  // Setup principal con priorización de carga - SIMPLIFICADO
  useEffect(() => {
    if (!user?.id) return;

    const cacheKey = getCacheKey('tasks', user.id);
    console.log('[TasksPage] Setting up data for user:', { userId: user.id, isAdmin });

    // INMEDIATO: Cargar desde cache persistente si existe
    if (globalAppCache.persistentCache.tasks.has(cacheKey)) {
      const cachedTasks = globalAppCache.persistentCache.tasks.get(cacheKey)!.data;
      setTasks(cachedTasks);
      setShowLoader(false); // Mostrar UI inmediatamente
      console.log('[TasksPage] IMMEDIATE: Loaded tasks from persistent cache:', cachedTasks.length);
    }
    
    if (globalAppCache.persistentCache.clients.has(cacheKey)) {
      const cachedClients = globalAppCache.persistentCache.clients.get(cacheKey)!.data;
      setClients(cachedClients);
      console.log('[TasksPage] IMMEDIATE: Loaded clients from persistent cache:', cachedClients.length);
    }
    
    if (globalAppCache.persistentCache.users.has(cacheKey)) {
      const cachedUsers = globalAppCache.persistentCache.users.get(cacheKey)!.data;
      setUsers(cachedUsers);
      console.log('[TasksPage] IMMEDIATE: Loaded users from persistent cache:', cachedUsers.length);
        }

    // Configurar listeners para actualizaciones en tiempo real
        const tasksQuery = query(collection(db, 'tasks'));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
            // **ELIMINADA LA LÓGICA DE SALTO TEMPORAL**
            // El onSnapshot SIEMPRE es la fuente de verdad
            console.log('[TasksPage:onSnapshot] Processing snapshot update - ALWAYS applying as source of truth');
            
            // Crear mapa de tareas actuales para comparación inteligente
            const currentTasksMap = new Map(tasksRef.current.map(task => [task.id, task]));
            let shouldUpdateState = false;

            let tasksData: Task[] = snapshot.docs.map((doc) => ({
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
        lastActivity: safeTimestampToISO(doc.data().lastActivity) || new Date().toISOString(),
              hasUnreadUpdates: doc.data().hasUnreadUpdates || false,
              lastViewedBy: doc.data().lastViewedBy || {},
        archived: doc.data().archived || false,
        archivedAt: safeTimestampToISOOrNull(doc.data().archivedAt),
        archivedBy: doc.data().archivedBy || '',
            }));

            // Verificar cambios significativos, especialmente en 'archived'
            for (const snapshotTask of tasksData) {
              const currentTask = currentTasksMap.get(snapshotTask.id);
              const isArchivedChanged = currentTask ? currentTask.archived !== snapshotTask.archived : false;
              
              if (isArchivedChanged || !currentTask) {
                shouldUpdateState = true;
                console.log('[TasksPage:onSnapshot] Significant change detected:', {
                  taskId: snapshotTask.id,
                  taskName: snapshotTask.name,
                  currentArchived: currentTask?.archived,
                  snapshotArchived: snapshotTask.archived,
                  isNew: !currentTask
                });
              }
            }
            
            // Optimización: solo actualizar si hay cambios significativos
            if (!shouldUpdateState && tasksData.length === tasksRef.current.length) {
              console.log('[TasksPage:onSnapshot] No significant changes detected, skipping state update');
              return;
            }

            console.log('[TasksPage:onSnapshot] Received snapshot update. Total tasks:', tasksData.length);
            console.log('[TasksPage:onSnapshot] Archived tasks in snapshot:', tasksData.filter(t => Boolean(t.archived)).map(t => ({id: t.id, name: t.name})));
            console.log('[TasksPage:onSnapshot] Non-archived tasks in snapshot:', tasksData.filter(t => !Boolean(t.archived)).map(t => ({id: t.id, name: t.name})));

            if (!isAdmin) {
              tasksData = tasksData.filter(
                (task) =>
                  task.AssignedTo.includes(user.id) ||
                  task.LeadedBy.includes(user.id) ||
                  task.CreatedBy === user.id,
              );
            }

      // CRÍTICO: Actualizar estado global inmediatamente para reflejar cambios de archivo
      setTasks(tasksData);
      tasksRef.current = tasksData;
      setShowLoader(false);

      console.log('[TasksPage:onSnapshot] Tasks state updated from snapshot. Current state:', tasksData.map(t => ({ id: t.id, archived: t.archived, name: t.name })));
      
      // Actualizar cache global
      globalAppCache.tasks.set(cacheKey, { data: tasksData, timestamp: Date.now() });
      globalAppCache.persistentCache.tasks.set(cacheKey, { data: tasksData, timestamp: Date.now() });
      
      // Log detallado para debugging de archivo
      const archivedCount = tasksData.filter(t => Boolean(t.archived)).length;
      const nonArchivedCount = tasksData.filter(t => !Boolean(t.archived)).length;
      
      console.log('[TasksPage] Tasks updated via onSnapshot:', {
              totalTasks: tasksData.length,
        archivedTasks: archivedCount,
        nonArchivedTasks: nonArchivedCount,
        archivedTaskIds: tasksData.filter(t => Boolean(t.archived)).map(t => t.id),
        nonArchivedTaskIds: tasksData.filter(t => !Boolean(t.archived)).map(t => t.id)
      });
      
      // Guardar cache persistente inmediatamente
      savePersistentCache();
    });

    // Fetch clients y users en background
    const fetchClientsAndUsers = async () => {
      try {
        // Fetch clients
        const clientsSnapshot = await getDocs(collection(db, 'clients'));
        const clientsData: Client[] = clientsSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || '',
          imageUrl: doc.data().imageUrl || '',
          projectCount: doc.data().projectCount || 0,
          projects: doc.data().projects || [],
          createdBy: doc.data().createdBy || '',
          createdAt: doc.data().createdAt || new Date().toISOString(),
        }));
        
        setClients(clientsData);
        globalAppCache.clients.set(cacheKey, { data: clientsData, timestamp: Date.now() });
        globalAppCache.persistentCache.clients.set(cacheKey, { data: clientsData, timestamp: Date.now() });

        // Fetch users
        const response = await fetch('/api/users');
        if (response.ok) {
          const clerkUsers = await response.json();
          const clerkImageMap = new Map();
                     clerkUsers.forEach((clerkUser: { id: string; imageUrl?: string }) => {
            if (clerkUser.imageUrl) {
              clerkImageMap.set(clerkUser.id, clerkUser.imageUrl);
            }
          });

          const usersSnapshot = await getDocs(collection(db, 'users'));
          const usersData: User[] = usersSnapshot.docs.map((doc) => {
            const userData = doc.data();
            return {
              id: doc.id,
              imageUrl: userData.imageUrl || clerkImageMap.get(doc.id) || '', // Firestore first, then Clerk
              fullName: userData.fullName || userData.name || 'Sin nombre',
              role: userData.role || 'Sin rol',
              description: userData.description || '',
              status: userData.status || 'active',
            };
          });

          setUsers(usersData);
          globalAppCache.users.set(cacheKey, { data: usersData, timestamp: Date.now() });
          globalAppCache.persistentCache.users.set(cacheKey, { data: usersData, timestamp: Date.now() });
        }
      } catch (error) {
        console.warn('[TasksPage] Background fetch error:', error);
      }
    };

    // Ejecutar fetch en background
    fetchClientsAndUsers();

    return () => {
      unsubscribeTasks();
      };
  }, [user?.id, isAdmin]);

  // Guardar cache persistente cada 30 segundos si hay datos
  useEffect(() => {
    if (tasks.length > 0 || clients.length > 0 || users.length > 0 || notifications.length > 0) {
      const saveInterval = setInterval(() => {
        savePersistentCache();
      }, 30000);

      return () => clearInterval(saveInterval);
    }
  }, [tasks.length, clients.length, users.length, notifications.length]);

  // Cleanup all global listeners when component unmounts
  useEffect(() => {
      return () => {
      console.log('[TasksPage] Cleaning up global listeners on unmount');
      cleanupGlobalAppListeners();
      };
  }, []);

  useEffect(() => {
    const currentHeaderRef = headerRef.current;
    const currentSelectorRef = selectorRef.current;
    const currentContentRef = contentRef.current;
    if (currentHeaderRef && currentSelectorRef && currentContentRef && !showLoader) {
      gsap.fromTo(
        [currentHeaderRef, currentSelectorRef, currentContentRef],
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' },
      );
    }
    return () => {
      if (currentHeaderRef && currentSelectorRef && currentContentRef) {
        gsap.killTweensOf([currentHeaderRef, currentSelectorRef, currentContentRef]);
      }
    };
  }, [showLoader]);

  useEffect(() => {
    const currentContentRef = contentRef.current;
    if (currentContentRef && !showLoader) {
      gsap.fromTo(
        currentContentRef,
        { opacity: 0, x: 10 },
        { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' },
      );
    }
    return () => {
      if (currentContentRef) {
        gsap.killTweensOf(currentContentRef);
      }
    };
  }, [selectedContainer, taskView, isCreateTaskOpen, isEditTaskOpen, showLoader]);

  const handleClientSubmit = useCallback(
    async (form: {
      id?: string;
      name: string;
      imageFile: File | null;
      imagePreview: string;
      projects: string[];
    }) => {
      if (!user?.id || !form.name.trim()) {
        alert('El nombre de la cuenta es obligatorio.');
        return;
      }

      setIsClientLoading(true);
      try {
        let imageUrl = form.imagePreview;
        if (form.imageFile) {
          const formData = new FormData();
          formData.append('file', form.imageFile);
          const response = await fetch('/api/upload-image', {
            method: 'POST',
            body: formData,
          });
          if (!response.ok) throw new Error('Failed to upload image');
          const data = await response.json();
          imageUrl = data.imageUrl;
        }

        const clientData: Client = {
          id: form.id || doc(collection(db, 'clients')).id,
          name: form.name.trim(),
          imageUrl: imageUrl || '',
          projectCount: form.projects.length,
          projects: form.projects,
          createdBy: user.id,
          createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'clients', clientData.id), clientData);
        setClients((prev) =>
          form.id
            ? prev.map((c) => (c.id === form.id ? clientData : c))
            : [...prev, clientData],
        );
        setIsClientSidebarOpen(false);
        setClientSidebarData(null);

        // Invalidar cache después de cualquier operación de cliente
        invalidateClientsCache();
      } catch (error) {
        console.error('Error saving client:', error);
        alert('Error al guardar la cuenta.');
      } finally {
        setIsClientLoading(false);
      }
    },
    [user?.id],
  );

  const handleCreateClientOpen = useCallback(() => {
    setClientSidebarData({ isEdit: false });
    setIsClientSidebarOpen(true);
  }, []);

  const handleEditClientOpen = useCallback((client: Client) => {
    setClientSidebarData({ isEdit: true, client });
    setIsClientSidebarOpen(true);
  }, []);

  const handleClientSidebarClose = useCallback(() => {
    setIsClientSidebarOpen(false);
    setClientSidebarData(null);
  }, []);

  const handleDeleteClientOpen = useCallback((clientId: string) => {
    if (!isAdmin) {
      console.warn('[TasksPage] Non-admin user attempted to delete client:', { clientId, userId: user?.id });
      alert('Solo los administradores pueden eliminar clientes.');
      return;
    }
    setDeleteTarget({ type: 'client', id: clientId });
    setIsDeletePopupOpen(true);
  }, [isAdmin, user?.id]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget || !user?.id) return;

    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'task') {
        // Delete task logic
        const taskToDelete = tasks.find(t => t.id === deleteTarget.id);
        if (!taskToDelete) {
          throw new Error('Tarea no encontrada');
        }

        // Send notifications to involved users
        const involvedUsers = Array.from(new Set([
          ...taskToDelete.AssignedTo,
          ...taskToDelete.LeadedBy,
          ...(taskToDelete.CreatedBy ? [taskToDelete.CreatedBy] : [])
        ])).filter(userId => userId !== user.id);

        for (const recipientId of involvedUsers) {
          try {
            await addDoc(collection(db, 'notifications'), {
              userId: user.id,
              recipientId,
              message: `Se ha eliminado la tarea "${taskToDelete.name}"`,
              timestamp: Timestamp.now(),
              read: false,
              type: 'task_deleted',
              taskId: deleteTarget.id,
            });
            console.log('[TasksPage] Sent notification to:', recipientId);
          } catch (error) {
            console.warn('[TasksPage] Error sending notifications:', {
              taskId: deleteTarget.id,
              error: error instanceof Error ? error.message : JSON.stringify(error),
            });
          }
        }

        // Delete the task
        await deleteDoc(doc(db, 'tasks', deleteTarget.id));
        setTasks((prev) => prev.filter((t) => t.id !== deleteTarget.id));
        console.log('[TasksPage] Task deleted successfully:', deleteTarget.id);

      } else if (deleteTarget.type === 'client') {
        // Delete client logic
        await deleteDoc(doc(db, 'clients', deleteTarget.id));
        setClients((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        console.log('[TasksPage] Client deleted successfully:', deleteTarget.id);
      }

      setIsDeletePopupOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('[TasksPage] Error deleting:', {
        error: error instanceof Error ? error.message : JSON.stringify(error),
        target: deleteTarget,
        userId: user.id,
      });
      alert(`Error al eliminar: ${error instanceof Error ? error.message : 'Inténtalo de nuevo.'}`);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, user?.id, tasks, setTasks, setClients]);

  const handleDeleteCancel = useCallback(() => {
    setIsDeletePopupOpen(false);
    setDeleteTarget(null);
  }, []);

  const memoizedDeletePopup = useMemo(() => {
    if (!isDeletePopupOpen || !deleteTarget) return null;

    const getDeleteContent = () => {
      if (deleteTarget.type === 'task') {
        return {
          title: '¿Seguro que quieres eliminar esta tarea?',
          description: `Eliminar esta tarea borrará permanentemente todas sus conversaciones y datos asociados. Se notificará a todos los involucrados.`
        };
      } else {
        return {
          title: '¿Seguro que quieres eliminar esta cuenta?',
          description: `Eliminar esta cuenta borrará permanentemente todos sus proyectos y datos asociados. Se notificará a todos los involucrados.`
        };
      }
    };

    const { title, description } = getDeleteContent();

    return (
      <DeletePopup
        isOpen={isDeletePopupOpen}
        title={title}
        description={description}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
      />
    );
  }, [isDeletePopupOpen, deleteTarget, handleDeleteCancel, handleDeleteConfirm, isDeleting]);

  const handleOpenSidebar = useCallback(
    (receiverId: string) => {
      const selectedUser = users.find((u) => u.id === receiverId);
      if (selectedUser) {
        handleMessageSidebarOpen(selectedUser);
      } else {
        console.warn('[TasksPage] User not found for receiverId:', receiverId);
      }
    },
    [users, handleMessageSidebarOpen],
  );

  const handleCloseSidebar = useCallback((sidebarId: string) => {
    setOpenSidebars((prev) => prev.filter((sidebar) => sidebar.id !== sidebarId));
    console.log('[TasksPage] Closed sidebar:', sidebarId);
  }, []);

  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      try {
        // Actualización optimista: marcar como leída inmediatamente en el estado local
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read: true } : n
          )
        );
        
        // Actualizar en Firestore
        await updateDoc(doc(db, 'notifications', notification.id), { read: true });
        console.log('[TasksPage] Notification marked as read:', notification.id);
        
        // Navegar según el tipo de notificación
        if (notification.type === 'private_message' && notification.conversationId && user?.id) {
          const receiverId = notification.userId === user.id ? notification.recipientId : notification.userId;
          handleOpenSidebar(receiverId);
        } else if (notification.taskId) {
          const task = tasks.find((t) => t.id === notification.taskId);
          if (task) {
            handleChatSidebarOpen(task);
          } else {
            console.warn('[TasksPage] Task not found for notification:', notification.taskId);
          }
        }
      } catch (err) {
        console.error('[TasksPage] Error handling notification click:', err);
        // Revertir la actualización optimista en caso de error
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read: false } : n
          )
        );
      }
    },
    [user?.id, tasks, handleOpenSidebar, handleChatSidebarOpen],
  );

  const handleContainerChange = useCallback(
    (newContainer: Container) => {
      console.log('[TasksPage] handleContainerChange called with:', newContainer);
      if ((isCreateTaskOpen || isEditTaskOpen) && hasUnsavedChanges && selectedContainer !== newContainer) {
        setIsConfirmExitOpen(true);
      } else {
        setSelectedContainer(newContainer);
        setIsCreateTaskOpen(false);
        setIsEditTaskOpen(false);
        setEditTaskId(null);
        console.log('[TasksPage] Container changed to:', newContainer);
      }
    },
    [isCreateTaskOpen, isEditTaskOpen, hasUnsavedChanges, selectedContainer],
  );

  const handleConfirmExit = useCallback(() => {
      setIsConfirmExitOpen(false);
      setHasUnsavedChanges(false);
    
    if (editSource === 'archive') {
      setIsArchiveTableOpen(true);
    }
    setIsEditTaskOpen(false);
    setEditTaskId(null);
    setEditSource(null);
  }, [editSource]);

  const handleCancelExit = useCallback(() => {
    setIsConfirmExitOpen(false);
  }, []);

  const handleOpenProfile = useCallback((user: { id: string; imageUrl: string }) => {
    setSelectedProfileUser(user);
    console.log('[TasksPage] Opening profile for user:', user.id);
  }, []);

  const handleCloseProfile = useCallback(() => {
    setSelectedProfileUser(null);
    console.log('[TasksPage] Closed profile');
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    console.log('[TasksPage] Onboarding completed, navigating to config');
    handleContainerChange('config');
  }, [handleContainerChange]);

  const handleCreateTaskToggle = useCallback(() => {
    setIsCreateTaskOpen((prev) => !prev);
    setIsEditTaskOpen(false);
    setEditTaskId(null);
  }, []);

  // --- SWIPE GESTURE FOR CONTAINER SWITCH ---
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const swipeThreshold = 60; // px

  // Detectar swipe en toda la pantalla
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (window.innerWidth >= 768) return;
      touchStartX.current = e.touches[0].clientX;
      touchEndX.current = e.touches[0].clientX;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (window.innerWidth >= 768) return;
      touchEndX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = () => {
      if (window.innerWidth >= 768) return;
      const deltaX = touchEndX.current - touchStartX.current;
      if (Math.abs(deltaX) > swipeThreshold) {
        const currentIdx = containerOrder.indexOf(selectedContainer as SelectorContainer);
        if (deltaX < 0 && currentIdx < containerOrder.length - 1) {
          // Swipe left: siguiente contenedor
          handleContainerChange(containerOrder[currentIdx + 1]);
        } else if (deltaX > 0 && currentIdx > 0) {
          // Swipe right: contenedor anterior
          handleContainerChange(containerOrder[currentIdx - 1]);
        }
      }
    };
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [selectedContainer, handleContainerChange]);

  // Keyboard shortcut: Ctrl/Cmd + ArrowLeft/ArrowRight for section switch
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCreateTaskOpen || isEditTaskOpen) return;
      if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        const currentIdx = containerOrder.indexOf(selectedContainer as SelectorContainer);
        if (e.key === 'ArrowLeft' && currentIdx > 0) {
          handleContainerChange(containerOrder[currentIdx - 1]);
        } else if (e.key === 'ArrowRight' && currentIdx < containerOrder.length - 1) {
          handleContainerChange(containerOrder[currentIdx + 1]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateTaskOpen, isEditTaskOpen, selectedContainer, handleContainerChange]);

  // Browser back button navigation
  useEffect(() => {
    const handlePopState = () => {
      // Si hay sidebars abiertos, cerrarlos y volver a la vista principal
      if (memoizedOpenSidebars.length > 0) {
        console.log('[TasksPage] Browser back detected, closing sidebars');
        // Cerrar todos los sidebars abiertos
        setOpenSidebars([]);
        
        // Si estamos en una vista específica, mantenerla
        // Si no, ir a tareas por defecto
        if (!['tareas', 'cuentas', 'miembros', 'config'].includes(selectedContainer)) {
          handleContainerChange('tareas');
        }
      }
      
      // Si ArchiveTable está abierto, cerrarlo y volver a TasksTable
      if (isArchiveTableOpen) {
        console.log('[TasksPage] Browser back detected, closing ArchiveTable');
        setIsArchiveTableOpen(false);
        setTaskView('table');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [memoizedOpenSidebars.length, selectedContainer, handleContainerChange, isArchiveTableOpen]);

  // Alert handlers
  const handleCloseSuccessAlert = useCallback(() => {
    setShowSuccessAlert(false);
    setSuccessMessage('');
  }, []);

  const handleCloseFailAlert = useCallback(() => {
    setShowFailAlert(false);
    setFailMessage('');
    setFailErrorMessage('');
  }, []);

  const handleArchiveTableOpen = useCallback(() => {
    setIsArchiveTableOpen(true);
    console.log('[TasksPage] Opening Archive Table');
    
    // Agregar entrada al historial para el botón atrás
    const currentState = { archiveTable: true, container: selectedContainer };
    window.history.pushState(currentState, '', window.location.pathname);
  }, [selectedContainer]);

  const handleArchiveTableClose = useCallback(() => {
    setIsArchiveTableOpen(false);
    console.log('[TasksPage] Closing Archive Table');
  }, []);

  // Handler para abrir EditTask desde ArchiveTable
  const handleArchiveTableEditTask = useCallback((taskId: string) => {
    setEditSource('archive');
    setEditTaskId(taskId);
    setIsEditTaskOpen(true);
  }, []);

  // Handler para abrir EditTask desde TasksTable
  const handleTasksTableEditTask = useCallback((taskId: string) => {
    setEditSource('tasks');
    setEditTaskId(taskId);
    setIsEditTaskOpen(true);
  }, []);

  // Efecto para manejar la navegación del navegador
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Si hay cambios sin guardar
      if (hasUnsavedChanges && isEditTaskOpen) {
        event.preventDefault();
        setIsConfirmExitOpen(true);
        return;
      }

      // Si no hay cambios sin guardar, manejar la navegación
      if (isEditTaskOpen) {
        if (editSource === 'archive') {
          setIsArchiveTableOpen(true);
        }
        setIsEditTaskOpen(false);
        setEditTaskId(null);
        setEditSource(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [hasUnsavedChanges, isEditTaskOpen, editSource]);

  const handleArchiveTableDeleteTask = useCallback((taskId: string) => {
    setDeleteTarget({ type: 'task', id: taskId });
    setIsDeletePopupOpen(true);
  }, []);

  const handleArchiveTableViewChange = useCallback((view: TaskView) => {
    setTaskView(view);
  }, []);

  const handleArchiveTableTaskUpdate = useCallback((task: Task) => {
    console.log('[TasksPage] Received task update from ArchiveTable:', {
      taskId: task.id,
      taskName: task.name,
      archived: task.archived,
      archivedAt: task.archivedAt,
      archivedBy: task.archivedBy
    });
    
    // CRÍTICO: Actualizar estado global inmediatamente
    setTasks(prevTasks => {
      const updatedTasks = prevTasks.map(t => t.id === task.id ? task : t);
      
      // Log para debugging
      const archivedCount = updatedTasks.filter(t => Boolean(t.archived)).length;
      const nonArchivedCount = updatedTasks.filter(t => !Boolean(t.archived)).length;
      
      console.log('[TasksPage] Tasks state updated after ArchiveTable change:', {
        totalTasks: updatedTasks.length,
        archivedTasks: archivedCount,
        nonArchivedTasks: nonArchivedCount,
        updatedTask: {
          id: task.id,
          archived: task.archived
        }
      });
      
      return updatedTasks;
    });
    
    // Update refs inmediatamente
    tasksRef.current = tasksRef.current.map(t => t.id === task.id ? task : t);
    
    // Update global cache inmediatamente
    globalAppCache.tasks.set(getCacheKey('tasks', user?.id || ''), {
      data: tasksRef.current,
      timestamp: Date.now(),
    });
    
    globalAppCache.persistentCache.tasks.set(getCacheKey('tasks', user?.id || ''), {
      data: tasksRef.current,
      timestamp: Date.now(),
    });
    
    // Save to persistent cache inmediatamente
    savePersistentCache();
  }, [user?.id]);

  const handleDataRefresh = useCallback(async () => {
    console.log('[TasksPage] Data refresh requested from ArchiveTable');
    
    if (!user?.id) return;
    
    try {
      // Force re-fetch from Firestore to get latest data
      const tasksQuery = query(collection(db, 'tasks'));
      const tasksSnapshot = await getDocs(tasksQuery);
      
      const freshTasks: Task[] = tasksSnapshot.docs.map((doc) => ({
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
        lastActivity: safeTimestampToISO(doc.data().lastActivity) || safeTimestampToISO(doc.data().createdAt) || new Date().toISOString(),
        hasUnreadUpdates: doc.data().hasUnreadUpdates || false,
        lastViewedBy: doc.data().lastViewedBy || {},
        archived: doc.data().archived || false,
        archivedAt: safeTimestampToISOOrNull(doc.data().archivedAt),
        archivedBy: doc.data().archivedBy || '',
      }));
      
      console.log('[TasksPage] Fresh data fetched:', {
        totalTasks: freshTasks.length,
        archivedTasks: freshTasks.filter(t => t.archived).length,
        nonArchivedTasks: freshTasks.filter(t => !t.archived).length
      });
      
      // Update all state and refs
      setTasks(freshTasks);
      tasksRef.current = freshTasks;
      
      // Update global cache
      globalAppCache.tasks.set(getCacheKey('tasks', user.id), {
        data: freshTasks,
        timestamp: Date.now(),
      });
      
      // Save to persistent cache
      savePersistentCache();
      
    } catch (error) {
      console.error('[TasksPage] Error refreshing data:', error);
      // Fallback to current data
      setTasks([...tasksRef.current]);
      setClients([...clientsRef.current]);
      setUsers([...usersRef.current]);
    }
  }, [user?.id]);

  // Cache update handlers from child components
  const handleMembersTableCacheUpdate = useCallback((users: User[], tasks: Task[]) => {
    console.log('[TasksPage] Received cache update from MembersTable:', { 
      usersCount: users.length, 
      tasksCount: tasks.length 
    });
    
    // Update global cache with data from MembersTable
    if (users.length > 0) {
      setUsers(users);
      usersRef.current = users;
      
      // Update global app cache
      globalAppCache.users.set(getCacheKey('users', user?.id || ''), {
        data: users,
        timestamp: Date.now(),
      });
    }
    
    if (tasks.length > 0) {
      setTasks(tasks);
      tasksRef.current = tasks;
      
      // Update global app cache
      globalAppCache.tasks.set(getCacheKey('tasks', user?.id || ''), {
        data: tasks,
        timestamp: Date.now(),
      });
    }
  }, [user?.id]);

  const handleClientsTableCacheUpdate = useCallback((clients: Client[]) => {
    console.log('[TasksPage] Received cache update from ClientsTable:', { 
      clientsCount: clients.length 
    });
    
    // Update global cache with data from ClientsTable
    if (clients.length > 0) {
      setClients(clients);
      clientsRef.current = clients;
      
      // Update global app cache
      globalAppCache.clients.set(getCacheKey('clients', user?.id || ''), {
        data: clients,
        timestamp: Date.now(),
      });
    }
  }, [user?.id]);

  // FUNCIÓN PARA INVALIDAR CACHE DE TAREAS


  // NUEVA FUNCIÓN CENTRALIZADA PARA ARCHIVADO - MEJORADA
  const handleTaskArchive = useCallback(async (task: Task, action: 'archive' | 'unarchive') => {
    if (!user?.id) {
      console.error('[TasksPage] No user ID available for archive action');
      return false;
    }

    try {
      console.log(`[TasksPage] ${action === 'archive' ? 'Archiving' : 'Unarchiving'} task:`, {
        taskId: task.id,
        taskName: task.name,
        currentArchived: task.archived,
        beforeUpdate_tasksState: tasks.map(t => ({ id: t.id, archived: t.archived, name: t.name }))
      });

      // 1. Actualizar estado local INMEDIATAMENTE (optimistic update)
      const updatedTask = {
        ...task,
        archived: action === 'archive',
        archivedAt: action === 'archive' ? new Date().toISOString() : undefined,
        archivedBy: action === 'archive' ? user.id : undefined
      };

      console.log('[TasksPage:handleTaskArchive] Before setTasks - Task ID:', task.id, 'Current archived:', task.archived);
      
      // Actualizar estado global inmediatamente
      setTasks(prevTasks => {
        const newTasks = prevTasks.map(t => {
          if (t.id === task.id) {
            console.log('[TasksPage:handleTaskArchive] Applying optimistic update to state:', updatedTask);
            return updatedTask;
          }
          return t;
        });
        console.log('[TasksPage:handleTaskArchive] New tasks state (optimistic):', newTasks.map(t => ({ id: t.id, archived: t.archived, name: t.name })));
        return newTasks;
      });
      
      // Actualizar ref para mantener consistencia
      tasksRef.current = tasksRef.current.map(t => 
        t.id === task.id ? updatedTask : t
      );
      console.log('[TasksPage:handleTaskArchive] tasksRef.current after optimistic update:', tasksRef.current.map(t => ({ id: t.id, archived: t.archived, name: t.name })));

      // Actualizar timestamp de la última actualización local
      localTaskUpdateTimestamp.current = Date.now();
      
      // Actualizar cache global
      const cacheKey = getCacheKey('tasks', user.id);
      globalAppCache.tasks.set(cacheKey, {
        data: tasksRef.current,
        timestamp: Date.now(),
      });

      // Actualizar cache persistente
      globalAppCache.persistentCache.tasks.set(cacheKey, {
        data: tasksRef.current,
        timestamp: Date.now(),
      });

      // 2. Actualizar Firestore en background
      if (action === 'archive') {
        await archiveTask(task.id, user.id, isAdmin, task);
      } else {
        await unarchiveTask(task.id, user.id, isAdmin, task);
      }

      console.log(`[TasksPage] Task ${action}d successfully in Firestore:`, {
        taskId: task.id,
        newArchived: updatedTask.archived,
        globalCacheUpdated: true,
        firestoreUpdated: true,
        finalTasksStateRef: tasksRef.current.map(t => ({ id: t.id, archived: t.archived, name: t.name }))
      });

      // No es necesario llamar a handleDataRefresh() o invalidateTasksCache() aquí
      // porque el onSnapshot se encargará de la sincronización final con la BD.
      // La actualización optimista ya hizo que la UI refleje el cambio.

      return true;
    } catch (error) {
      console.error(`[TasksPage] Error ${action}ing task:`, error);
      
      // Revertir cambios optimísticos en caso de error
      setTasks(prevTasks => 
        prevTasks.map(t => t.id === task.id ? task : t)
      );
      
      tasksRef.current = tasksRef.current.map(t => 
        t.id === task.id ? task : t
      );

      // Revertir cache también
      const cacheKey = getCacheKey('tasks', user.id);
      globalAppCache.tasks.set(cacheKey, {
        data: tasksRef.current,
        timestamp: Date.now(),
      });

      return false;
    } finally {
      // Guardar cache persistente siempre al final de una acción importante
      const cacheKey = getCacheKey('tasks', user.id);
      globalAppCache.tasks.set(cacheKey, { data: tasksRef.current, timestamp: Date.now() });
      globalAppCache.persistentCache.tasks.set(cacheKey, { data: tasksRef.current, timestamp: Date.now() });
      savePersistentCache();
    }
  }, [user?.id, isAdmin, tasks]); // Se añade `tasks` a las dependencias para logs precisos

  // Handle loading and error states
  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <Marquee />
      {showLoader && <Loader />}
      <SyncUserToFirestore />
      
      <div ref={headerRef}>
        <Header
          selectedContainer={selectedContainer}
          isArchiveTableOpen={isArchiveTableOpen}
          users={memoizedUsers}
          notifications={notifications}
          onNotificationClick={handleNotificationClick}
          onLimitNotifications={() => {}}
          onChangeContainer={handleContainerChange}
        />
      </div>
      <OnboardingStepper onComplete={handleOnboardingComplete} />
      <div ref={selectorRef} className={styles.selector}>
        <Selector
          selectedContainer={selectedContainer as SelectorContainer}
          setSelectedContainer={(c: SelectorContainer) => handleContainerChange(c)}
          options={[
            { value: 'tareas', label: 'Inicio' },
            { value: 'cuentas', label: 'Cuentas' },
            { value: 'miembros', label: 'Miembros' },
          ]}
        />
      </div>
      <CursorProvider>
        <div ref={contentRef} className={styles.content}>
          {selectedContainer === 'tareas' && !isCreateTaskOpen && !isEditTaskOpen && !isArchiveTableOpen && (
            <>
              {taskView === 'table' && (
                <TasksTable
                  onNewTaskOpen={() => setIsCreateTaskOpen(true)}
                  onEditTaskOpen={handleTasksTableEditTask}
                  onChatSidebarOpen={handleChatSidebarOpen}
                  onMessageSidebarOpen={handleMessageSidebarOpen}
                  onOpenProfile={handleOpenProfile}
                  onViewChange={setTaskView}
                  onDeleteTaskOpen={(taskId) => {
                    setDeleteTarget({ type: 'task', id: taskId });
                    setIsDeletePopupOpen(true);
                  }}
                  onArchiveTableOpen={handleArchiveTableOpen}
                  externalTasks={tasks.filter(task => !task.archived)}
                  externalClients={clients}
                  externalUsers={users}
                />
              )}
              
              {taskView === 'kanban' && (
                <TasksKanban
                  onNewTaskOpen={() => setIsCreateTaskOpen(true)}
                  onEditTaskOpen={handleTasksTableEditTask}
                  onChatSidebarOpen={handleChatSidebarOpen}
                  onMessageSidebarOpen={handleMessageSidebarOpen}
                  onOpenProfile={handleOpenProfile}
                  onViewChange={setTaskView}
                  onDeleteTaskOpen={(taskId) => {
                    setDeleteTarget({ type: 'task', id: taskId });
                    setIsDeletePopupOpen(true);
                  }}
                  onArchiveTableOpen={handleArchiveTableOpen}
                  externalTasks={tasks.filter(task => !task.archived)}
                  externalClients={clients}
                  externalUsers={users}
                />
              )}
            </>
          )}

          {selectedContainer === 'tareas' && !isCreateTaskOpen && !isEditTaskOpen && isArchiveTableOpen && (
            <ArchiveTable
              onEditTaskOpen={handleArchiveTableEditTask}
              onViewChange={handleArchiveTableViewChange}
              onDeleteTaskOpen={handleArchiveTableDeleteTask}
              onClose={handleArchiveTableClose}
              onChatSidebarOpen={handleChatSidebarOpen}
              onTaskArchive={handleTaskArchive}
              externalTasks={tasks.filter(task => task.archived)}
              externalClients={clients}
              externalUsers={usersRef.current}
              onTaskUpdate={handleArchiveTableTaskUpdate}
              onDataRefresh={handleDataRefresh}
            />
          )}

          {selectedContainer === 'cuentas' && !isCreateTaskOpen && !isEditTaskOpen && (
            <ClientsTable
              onCreateOpen={handleCreateClientOpen}
              onEditOpen={handleEditClientOpen}
              onDeleteOpen={handleDeleteClientOpen}
              externalClients={clients.length > 0 ? clients : undefined}
              onCacheUpdate={handleClientsTableCacheUpdate}
            />
          )}

          {selectedContainer === 'miembros' && !isCreateTaskOpen && !isEditTaskOpen && (
            <MembersTable
              onMessageSidebarOpen={handleMessageSidebarOpen}
              onCacheUpdate={handleMembersTableCacheUpdate}
            />
          )}

          {selectedContainer === 'config' && !isCreateTaskOpen && !isEditTaskOpen && (
            <ConfigPage userId={user?.id || ''} onClose={() => handleContainerChange('tareas')}
              onShowSuccessAlert={handleShowSuccessAlert}
              onShowFailAlert={handleShowFailAlert}
            />
          )}

          {/* Mover EditTask y CreateTask fuera de las condiciones de contenedor para que siempre se muestren como overlay */}
          {isEditTaskOpen && editTaskId && (
            <EditTask
              isOpen={isEditTaskOpen}
              onToggle={() => {
                setIsEditTaskOpen(false);
                setEditTaskId(null);
              }}
              taskId={editTaskId}
              onHasUnsavedChanges={setHasUnsavedChanges}
              onCreateClientOpen={handleCreateClientOpen}
              onEditClientOpen={handleEditClientOpen}
              onClientAlertChange={handleClientAlertChange}
              onShowSuccessAlert={handleShowSuccessAlert}
              onShowFailAlert={handleShowFailAlert}
            />
          )}

          {isCreateTaskOpen && (
            <CreateTask
              isOpen={isCreateTaskOpen}
              onToggle={handleCreateTaskToggle}
              onHasUnsavedChanges={setHasUnsavedChanges}
              onCreateClientOpen={handleCreateClientOpen}
              onEditClientOpen={handleEditClientOpen}
              onTaskCreated={() => setIsCreateTaskOpen(false)}
              onShowSuccessAlert={handleShowSuccessAlert}
              onShowFailAlert={handleShowFailAlert}
            />
          )}
        </div>
        <Cursor>
          <svg
            className={styles.cursorIcon}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 40 40"
          >
            <path
              fill="currentColor"
              d="M1.8 4.4 7 36.2c.3 1.8 2.6 2.3 3.6.8l3.9-5.7c1.7-2.5 4.5-4.1 7.5-4.3l6.9-.5c1.8-.1 2.5-2.4 1.1-3.5L5 2.5c-1.4-1.1-3.5 0-3.3 1.9Z"
            />
          </svg>
        </Cursor>
        <CursorFollow>
          <div className={styles.cursorFollowContent}>{user?.fullName || 'Usuario'}</div>
        </CursorFollow>
      </CursorProvider>
      {isDeleteClientOpen && isAdmin && (
        <div className={clientStyles.popupOverlay}>
          <div className={clientStyles.deletePopup} ref={deletePopupRef}>
            <h2>Confirmar Eliminación</h2>
            <p>Escribe &apos;Eliminar&apos; para confirmar:</p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className={clientStyles.deleteConfirmInput}
              placeholder="Escribe 'Eliminar'"
            />
            <button
              onClick={async () => {
                if (deleteConfirm.toLowerCase() === 'eliminar') {
                  try {
                    await deleteDoc(doc(db, 'clients', isDeleteClientOpen));
                    setClients((prev) => prev.filter((c) => c.id !== isDeleteClientOpen));
                    
                    // Invalidar cache después de eliminar cliente
                    invalidateClientsCache();
                    
                    setIsDeleteClientOpen(null);
                    setDeleteConfirm('');
                    
                    handleShowSuccessAlert('Cliente eliminado exitosamente.');
                  } catch (error) {
                    console.error('Error deleting client:', error);
                    handleShowFailAlert('Error al eliminar la cuenta', error.message);
                  }
                }
              }}
              disabled={deleteConfirm.toLowerCase() !== 'eliminar'}
              className={clientStyles.deleteConfirmButton}
            >
              Sí, eliminar
            </button>
            <button
              onClick={() => {
                setIsDeleteClientOpen(null);
                setDeleteConfirm('');
              }}
              className={clientStyles.cancelButton}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      {isConfirmExitOpen && (
        <div className={clientStyles.popupOverlay}>
          <div className={clientStyles.deletePopup} ref={confirmExitPopupRef}>
            <h2>¿Salir sin guardar?</h2>
            <p>¿Estás seguro de que quieres salir sin guardar los cambios? Perderás todo el progreso no guardado.</p>
            <div className={clientStyles.popupActions}>
              <button
                onClick={handleConfirmExit}
                className={clientStyles.deleteConfirmButton}
              >
                Salir
              </button>
              <button
                onClick={handleCancelExit}
                className={clientStyles.cancelButton}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {selectedProfileUser && (
        <ProfileCard
          userId={selectedProfileUser.id}
          imageUrl={selectedProfileUser.imageUrl}
          onClose={handleCloseProfile}
        />
      )}
      <AISidebar isOpen={false} onClose={() => {}} />
      {memoizedOpenSidebars.map((sidebar) => {
        if (sidebar.type === 'message' && user?.id && sidebar.data) {
          return (
            <MessageSidebar
              key={sidebar.id}
              isOpen={true}
              onClose={() => handleCloseSidebar(sidebar.id)}
              senderId={user.id}
              receiver={sidebar.data as User}
              conversationId={[user.id, (sidebar.data as User).id].sort().join('_')}
            />
          );
        }
        if (sidebar.type === 'chat' && sidebar.data && (sidebar.data as Task).id) {
          return (
            <ChatSidebar
              key={sidebar.id}
              isOpen={true}
              onClose={() => handleCloseSidebar(sidebar.id)}
              task={sidebar.data as Task}
              clientName={clients.find((c) => c.id === (sidebar.data as Task).clientId)?.name || 'Sin cuenta'}
              users={memoizedUsers}
            />
          );
        }
        return null;
      })}
      <div className={styles.vignetteTop} />
      <div className={styles.vignetteBottom} />
      <Dock />
      <ToDoDynamic/>
      <Footer />
      {memoizedDeletePopup}
      
      {/* ClientSidebar */}
      {isClientSidebarOpen && clientSidebarData && (
        <ClientOverlay
          isOpen={isClientSidebarOpen}
          isEdit={clientSidebarData.isEdit}
          initialForm={
            clientSidebarData.isEdit && clientSidebarData.client
              ? {
                  id: clientSidebarData.client.id,
                  name: clientSidebarData.client.name,
                  imageFile: null,
                  imagePreview: clientSidebarData.client.imageUrl,
                  projects: clientSidebarData.client.projects.length
                    ? clientSidebarData.client.projects
                    : [''],
                  deleteProjectIndex: null,
                  deleteConfirm: '',
                }
              : {
                  name: '',
                  imageFile: null,
                  imagePreview: '',
                  projects: [''],
                  deleteProjectIndex: null,
                  deleteConfirm: '',
                }
          }
          onFormSubmit={handleClientSubmit}
          onClose={handleClientSidebarClose}
          isClientLoading={isClientLoading}
        />
      )}
      
      {/* Alert Components */}
      {showSuccessAlert && (
        <SuccessAlert
          message={successMessage}
          onClose={handleCloseSuccessAlert}
        />
      )}
      {showFailAlert && (
        <FailAlert
          message={failMessage}
          error={failErrorMessage}
          onClose={handleCloseFailAlert}
        />
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <AuthProvider>
      <TasksPageContent />
    </AuthProvider>
  );
}