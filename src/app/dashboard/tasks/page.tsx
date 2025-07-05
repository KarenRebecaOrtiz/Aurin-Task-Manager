'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  collection,
  doc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  addDoc,
  Timestamp,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import Header from '@/components/ui/Header';
import Marquee from '@/components/ui/Marquee';
import SyncUserToFirestore from '@/components/SyncUserToFirestore';
import OnboardingStepper from '@/components/OnboardingStepper';
import Selector from '@/components/Selector';
import MembersTable from '@/components/MembersTable';
import ClientsTable from '@/components/ClientsTable';
import TasksTable from '@/components/TasksTable';
import TasksKanban from '@/components/TasksKanban';
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
import { archiveTask, unarchiveTask } from '@/lib/taskUtils';
import styles from '@/components/TasksPage.module.scss';
import clientStyles from '@/components/ClientsTable.module.scss';
import { v4 as uuidv4 } from 'uuid';
import Dock from '@/components/Dock';
import Footer from '@/components/ui/Footer';
import Loader from '@/components/Loader';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import ToDoDynamic from '@/components/ToDoDynamic';
import DeletePopup from '@/components/DeletePopup';
import FailAlert from '@/components/FailAlert';
import SuccessAlert from '@/components/SuccessAlert';
import ClientOverlay from '@/components/ClientOverlay';
import { useSharedTasksState } from '@/hooks/useSharedTasksState';

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






  
// Eliminar funciones de caché
function TasksPageContent() {
  const { user } = useUser();
  const { isAdmin } = useAuth();
  
  // Usar el hook compartido
  const {
    tasks,
    clients,
    users,
    isLoadingTasks,
    isLoadingClients,
    isLoadingUsers
  } = useSharedTasksState(user?.id);
  
  // Estados locales que no necesitan caché
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [container, setContainer] = useState<Container>('tareas');
  const [taskView, setTaskView] = useState<TaskView>('table');
  const [isEditTaskOpen, setIsEditTaskOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isArchiveTableOpen, setIsArchiveTableOpen] = useState(false);
  const [sidebars, setSidebars] = useState<Sidebar[]>([]);
  const [showLoader, setShowLoader] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string } | null>(null);
  const [isDeletePopupOpen, setIsDeletePopupOpen] = useState(false);
  const [isDeleteClientOpen, setIsDeleteClientOpen] = useState<string | false>(false);
  const [isConfirmExitOpen, setIsConfirmExitOpen] = useState(false);
  const [isClientSidebarOpen, setIsClientSidebarOpen] = useState(false);
  const [clientSidebarData, setClientSidebarData] = useState<{ client?: Client; isEdit?: boolean } | null>(null);
  const [isClientLoading, setIsClientLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showFailAlert, setShowFailAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [failMessage, setFailMessage] = useState('');
  const [selectedProfileUser] = useState<User | null>(null);

  // Refs
  const headerRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const confirmExitPopupRef = useRef<HTMLDivElement>(null);

  // Memoized values
  const memoizedUsers = useMemo(() => users, [users]);
  const selectedContainer = container;
  const memoizedOpenSidebars = useMemo(() => sidebars, [sidebars]);

  // Event handlers
  const handleNotificationClick = useCallback(() => {
    // Handle notification click
  }, []);

  const handleContainerChange = useCallback((newContainer: Container) => {
    setContainer(newContainer);
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    // Handle onboarding complete
  }, []);

  const handleTasksTableEditTask = useCallback((taskId: string) => {
    setEditTaskId(taskId);
    setIsEditTaskOpen(true);
  }, []);

  const handleArchiveTableEditTask = useCallback((taskId: string) => {
    setEditTaskId(taskId);
    setIsEditTaskOpen(true);
  }, []);

  const handleArchiveTableViewChange = useCallback((view: TaskView) => {
    setTaskView(view);
    setIsArchiveTableOpen(false);
  }, []);

  const handleArchiveTableDeleteTask = useCallback((taskId: string) => {
    setDeleteTarget({ type: 'task', id: taskId });
    setIsDeletePopupOpen(true);
  }, []);

  const handleArchiveTableClose = useCallback(() => {
    setIsArchiveTableOpen(false);
  }, []);

  const handleTaskArchive = useCallback(async (task: Task, action: 'archive' | 'unarchive'): Promise<boolean> => {
    if (!user?.id || !isAdmin) return false;

    try {
      if (action === 'unarchive') {
        await unarchiveTask(task.id, user.id, isAdmin, task);
      } else {
        await archiveTask(task.id, user.id, isAdmin, task);
      }
      return true;
      } catch (error) {
      console.error('[TasksPage] Error archiving/unarchiving task:', error);
      return false;
    }
  }, [user?.id, isAdmin]);

  const handleArchiveTableTaskUpdate = useCallback((task: Task) => {
    if (!user?.id) return;

    try {
      const taskRef = doc(db, 'tasks', task.id);
      updateDoc(taskRef, {
        ...task,
        lastActivity: new Date().toISOString(),
      });
      } catch (error) {
      console.error('[TasksPage] Error updating task:', error);
      }
  }, [user?.id]);

  const handleClientsTableCacheUpdate = useCallback((updatedClients: Client[]) => {
    // No need to update clients state directly as it will be handled by onSnapshot
    console.log('[TasksPage] Clients table cache updated:', updatedClients.length);
  }, []);

  const handleMembersTableCacheUpdate = useCallback((updatedUsers: User[]) => {
    // No need to update users state directly as it will be handled by onSnapshot
    console.log('[TasksPage] Members table cache updated:', updatedUsers.length);
  }, []);

  const handleDataRefresh = useCallback(async () => {
    if (!user?.id) return;

    try {
      const tasksQuery = query(collection(db, 'tasks'));
      const snapshot = await getDocs(tasksQuery);
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];

      // No need to update tasks state directly as it will be handled by onSnapshot
      console.log('[TasksPage] Data refreshed:', tasksData.length);
          } catch (error) {
      console.error('[TasksPage] Error refreshing data:', error);
    }
  }, [user?.id]);

  const handleShowSuccessAlert = useCallback((message: string) => {
    setSuccessMessage(message);
    setShowSuccessAlert(true);
    setTimeout(() => setShowSuccessAlert(false), 3000);
  }, []);

  const handleShowFailAlert = useCallback((message: string) => {
    setFailMessage(message);
    setShowFailAlert(true);
    setTimeout(() => setShowFailAlert(false), 3000);
  }, []);

  const handleCreateTaskToggle = useCallback(() => {
    if (hasUnsavedChanges) {
      // Show confirmation dialog
      if (window.confirm('Hay cambios sin guardar. ¿Deseas continuar?')) {
        setIsCreateTaskOpen(false);
        setHasUnsavedChanges(false);
      }
      } else {
      setIsCreateTaskOpen(false);
    }
  }, [hasUnsavedChanges]);

  const handleChatSidebarOpen = useCallback((task: Task) => {
    const existingSidebarIndex = sidebars.findIndex(
      (s) => s.type === 'chat' && (s.data as Task)?.id === task.id
    );

    if (existingSidebarIndex !== -1) {
      // Move existing sidebar to end
      const newSidebars = [...sidebars];
      const [sidebar] = newSidebars.splice(existingSidebarIndex, 1);
      newSidebars.push(sidebar);
      setSidebars(newSidebars);
      } else {
      // Add new sidebar
      setSidebars([...sidebars, { id: uuidv4(), type: 'chat', data: task }]);
      }
  }, [sidebars]);

  const handleMessageSidebarOpen = useCallback((user: User) => {
    const existingSidebarIndex = sidebars.findIndex(
      (s) => s.type === 'message' && (s.data as User)?.id === user.id
    );

    if (existingSidebarIndex !== -1) {
      // Move existing sidebar to end
      const newSidebars = [...sidebars];
      const [sidebar] = newSidebars.splice(existingSidebarIndex, 1);
      newSidebars.push(sidebar);
      setSidebars(newSidebars);
          } else {
      // Add new sidebar
      setSidebars([...sidebars, { id: uuidv4(), type: 'message', data: user }]);
    }
  }, [sidebars]);

  const handleOpenProfile = useCallback(() => {
    // Profile functionality removed
  }, []);

  const handleCloseProfile = useCallback(() => {
    // Profile functionality removed
  }, []);



  const handleArchiveTableOpen = useCallback(() => {
    setIsArchiveTableOpen(true);
  }, []);

  const handleCreateClientOpen = useCallback(() => {
    setClientSidebarData({ isEdit: false });
    setIsClientSidebarOpen(true);
  }, []);

  const handleEditClientOpen = useCallback((client: Client) => {
    setClientSidebarData({ client, isEdit: true });
    setIsClientSidebarOpen(true);
  }, []);

  const handleDeleteClientOpen = useCallback((clientId: string) => {
    setIsDeleteClientOpen(clientId);
  }, []);

  const handleClientAlertChange = useCallback(() => {
    // Handle client alert change
  }, []);

  const handleConfirmExit = useCallback(() => {
    setIsConfirmExitOpen(false);
    // Handle confirm exit
  }, []);

  const handleCancelExit = useCallback(() => {
    setIsConfirmExitOpen(false);
  }, []);

  const handleCloseSidebar = useCallback((sidebarId: string) => {
    setSidebars(prev => prev.filter(s => s.id !== sidebarId));
  }, []);

  const handleClientSidebarClose = useCallback(() => {
    setIsClientSidebarOpen(false);
    setClientSidebarData(null);
  }, []);

  const handleClientSubmit = useCallback(async (form: { id?: string; name: string; imageFile: File; imagePreview: string; projects: string[] }) => {
    if (!user?.id) return;
    
    setIsClientLoading(true);

    try {
      // Upload image to storage
      const imageUrl = form.imagePreview; // TODO: Implement image upload

      const clientData: Client = {
        id: form.id || '',
        name: form.name,
        imageUrl,
        projectCount: form.projects.length,
        projects: form.projects,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
      };

      if (clientSidebarData?.isEdit && form.id) {
        // Update client
        const clientRef = doc(db, 'clients', form.id);
        await updateDoc(clientRef, {
          ...clientData,
          lastActivity: new Date().toISOString(),
        });
      } else {
        // Create client
        const clientRef = collection(db, 'clients');
        await addDoc(clientRef, clientData);
      }

      handleClientSidebarClose();
      handleShowSuccessAlert('Cliente guardado exitosamente');
    } catch (error) {
      console.error('[TasksPage] Error saving client:', error);
      handleShowFailAlert('Error al guardar el cliente');
    } finally {
      setIsClientLoading(false);
    }
  }, [user?.id, clientSidebarData?.isEdit, handleClientSidebarClose, handleShowSuccessAlert, handleShowFailAlert]);

  // Setup de notificaciones con actualizaciones en tiempo real
  useEffect(() => {
    if (!user?.id) return;

    console.log('[TasksPage] Setting up notifications listener');

    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.id),
      orderBy('timestamp', 'desc'),
      limit(50)
      );
      
    const unsubscribeNotifications = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notificationsData: Notification[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          userId: doc.data().userId || '',
          message: doc.data().message || null,
          timestamp: doc.data().timestamp || null,
          read: doc.data().read || false,
          recipientId: doc.data().recipientId || '',
          conversationId: doc.data().conversationId,
          taskId: doc.data().taskId,
          type: doc.data().type || 'default',
        }));

        console.log('[TasksPage] Notifications onSnapshot update:', notificationsData.length);
        
        setNotifications(notificationsData);
      },
      (error) => {
        console.error('[TasksPage] Error in notifications onSnapshot:', error);
        setNotifications([]);
      }
    );

    return () => {
      unsubscribeNotifications();
    };
  }, [user?.id]);

  // Mostrar loader mientras cargan los datos iniciales
  useEffect(() => {
    if (!isLoadingTasks && !isLoadingClients && !isLoadingUsers) {
      setShowLoader(false);
  }
  }, [isLoadingTasks, isLoadingClients, isLoadingUsers]);

  // Agregar logging para debuggear cambios de estado
  useEffect(() => {
    console.log('[TasksPage] Tasks from shared state updated:', {
      count: tasks.length,
      taskIds: tasks.map(t => t.id),
      statuses: tasks.map(t => ({ id: t.id, status: t.status, name: t.name })),
      timestamp: new Date().toISOString()
    });
  }, [tasks]);

  // Forzar refresco cuando cambie el estado de cualquier tarea
  const taskStatusChanges = useMemo(() => tasks.map(t => t.status).join(','), [tasks]);
  
  useEffect(() => {
    const statusChanges = tasks.map(t => `${t.id}-${t.status}`).join(',');
    console.log('[TasksPage] Status changes detected:', statusChanges);
    
    // Forzar re-render de componentes hijos
    // Los componentes hijos ya reciben externalTasks, así que se actualizarán automáticamente
    
    // Forzar re-render adicional para cambios de estado
    if (tasks.length > 0) {
      const hasStatusChanges = tasks.some(task => 
        task.status && task.status !== 'Por Iniciar'
      );
      
      if (hasStatusChanges) {
        console.log('[TasksPage] Forcing immediate re-render due to status changes');
        // Los componentes hijos ya reciben externalTasks, así que se actualizarán automáticamente
      }
    }
  }, [taskStatusChanges, tasks]);

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
              externalUsers={users}
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
          <div className={clientStyles.deletePopup}>
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
                if (deleteConfirm.toLowerCase() === 'eliminar' && typeof isDeleteClientOpen === 'string') {
                  try {
                    await deleteDoc(doc(db, 'clients', isDeleteClientOpen));
                    setIsDeleteClientOpen(false);
                    setDeleteConfirm('');
                    handleShowSuccessAlert('Cliente eliminado exitosamente');
                  } catch (error) {
                    console.error('Error deleting client:', error);
                    handleShowFailAlert('Error al eliminar la cuenta');
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
                setIsDeleteClientOpen(false);
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
      {isDeletePopupOpen && deleteTarget && (
        <DeletePopup
          isOpen={isDeletePopupOpen}
          title={`Eliminar ${deleteTarget.type === 'task' ? 'Tarea' : 'Cuenta'}`}
          description={`¿Estás seguro de que quieres eliminar esta ${deleteTarget.type === 'task' ? 'tarea' : 'cuenta'}?`}
          onConfirm={async () => {
            if (deleteTarget.type === 'task') {
              try {
                await deleteDoc(doc(db, 'tasks', deleteTarget.id));
                setIsDeletePopupOpen(false);
                handleShowSuccessAlert('Tarea eliminada exitosamente');
              } catch (error) {
                console.error('Error deleting task:', error);
                handleShowFailAlert('Error al eliminar la tarea');
              }
            }
          }}
          onCancel={() => setIsDeletePopupOpen(false)}
        />
      )}
      
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
          onClose={() => setShowSuccessAlert(false)}
        />
      )}
      {showFailAlert && (
        <FailAlert
          message={failMessage}
          error="Se produjo un error al realizar la operación"
          onClose={() => setShowFailAlert(false)}
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