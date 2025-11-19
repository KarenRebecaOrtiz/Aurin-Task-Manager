'use client';

import { useRef, useCallback, useEffect, memo } from 'react';
import { useUser } from '@clerk/nextjs';

import { Header } from '@/modules/header';
import { OptimizedMarquee } from '@/modules/advices';
import TasksTableIsolated from '@/modules/data-views/tasks/components/tables/TasksTableIsolated';
import TasksKanban from '@/modules/data-views/tasks/components/tables/KanbanBoard';
import { ChatSidebar } from '@/modules/chat';
import { ConfigPage } from '@/modules/config';
import { ProfileCard } from '@/modules/profile-card';
import PlatformCompatibility from '@/shared/components/system/PlatformCompatibility';

// Safari debug components removed for production

import { archiveTask, unarchiveTask } from '@/lib/taskUtils';
import styles from './styles/TasksPage.module.scss';

import { Footer } from '@/modules/footer';
import Loader from '@/modules/loader';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { useSharedTasksState } from '@/hooks/useSharedTasksState';
import { useSidebarStateStore } from '@/stores/sidebarStateStore';
// useChatSidebarStore removed as it's not being used
import GoBackButton from '@/components/ui/GoBackButton';


import { useTasksPageStore } from '@/stores/tasksPageStore';
import { useDataStore } from '@/stores/dataStore';
import { useShallow } from 'zustand/react/shallow';
import ArchiveTable from '@/modules/data-views/tasks/components/tables/ArchiveTable';
import EditTask from '@/modules/task-crud/components/EditTask';
import { SimplifiedCreateTaskForm } from '@/modules/task-crud/components/forms/SimplifiedCreateTaskForm';
// import CreateTask from '@/modules/task-crud/components/CreateTask';
import TasksPageModals from '@/modules/data-views/tasks/components/modals/TasksPageModals';

// Helper functions for conditional logging (only in development)
const debugLog = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(message, ...args);
  }
};

const debugError = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error(message, ...args);
  }
};

// Componente completamente aislado para TasksTable
const TasksTableRenderer = memo(() => {
  // Debug logging disabled to reduce console spam
  return <TasksTableIsolated />;
});

TasksTableRenderer.displayName = 'TasksTableRenderer';

// Define types
type SelectorContainer = 'tareas';
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

function TasksPageContent() {
  // Solo log cuando realmente cambia algo importante
  // Debug logging disabled to reduce console spam
  const { user } = useUser();
  const { isAdmin } = useAuth();
  
  // Usar el hook compartido que maneja Zustand
  const {
    tasks,
    clients,
    users,
    isInitialLoadComplete,
    loadingProgress
  } = useSharedTasksState(user?.id);

  // Solo suscribirse a los valores que realmente necesitamos para renderizar
  const container = useTasksPageStore(useShallow(state => state.container));
  const taskView = useTasksPageStore(useShallow(state => state.taskView));
  const showLoader = useTasksPageStore(useShallow(state => state.showLoader));
  const contentReady = useTasksPageStore(useShallow(state => state.contentReady));
  


  // Refs
  const headerRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Nuevo: obtener isArchiveTableOpen del store
  const isArchiveTableOpen = useTasksPageStore(useShallow(state => state.isArchiveTableOpen));
  const isEditTaskOpen = useTasksPageStore(useShallow(state => state.isEditTaskOpen));
  const editTaskId = useTasksPageStore(useShallow(state => state.editTaskId));
  const isCreateTaskOpen = useTasksPageStore(useShallow(state => state.isCreateTaskOpen));
  const hasUnsavedChanges = useTasksPageStore(useShallow(state => state.hasUnsavedChanges));

  // Si estamos en CreateTask o EditTask, no mostrar ningún elemento activo en el selector
  const selectedContainer = (isCreateTaskOpen || isEditTaskOpen) ? null : container;

  // ProfileCard Modal state - Comentado temporalmente hasta que se implemente
  // const isProfileCardOpen = useTasksPageStore(useShallow(state => state.isProfileCardOpen));
  // const profileCardData = useTasksPageStore(useShallow(state => state.profileCardData));
  // const closeProfileCard = useTasksPageStore(useShallow(state => state.closeProfileCard));

  // TasksTable aislado - no memoizar aquí para evitar re-renders del padre

  // Efecto para manejar el loader y el contenido
  useEffect(() => {
    if (isInitialLoadComplete && !contentReady) {
      // Marcar el contenido como listo
      const { setContentReady, setShowLoader } = useTasksPageStore.getState();
      setContentReady(true);
      
      // Pequeño delay para asegurar que el contenido se renderice
      setTimeout(() => {
        setShowLoader(false);
      }, 100);
    }
  }, [isInitialLoadComplete, contentReady]);

  // ✅ SOLUCIÓN: Sincronizar datos de useSharedTasksState con useDataStore
  useEffect(() => {
    // Sincronizar datos cuando estén disponibles, incluso si isInitialLoadComplete es false
    if (tasks.length > 0 || clients.length > 0 || users.length > 0) {
      const { setTasks, setClients, setUsers, setIsInitialLoadComplete } = useDataStore.getState();
      
      // Sincronizar datos con el store
      if (tasks.length > 0) setTasks(tasks);
      if (clients.length > 0) setClients(clients);
      if (users.length > 0) setUsers(users);
      
      // Solo marcar como inicializado si realmente tenemos datos
      if (tasks.length > 0 && clients.length > 0 && users.length > 0) {
        setIsInitialLoadComplete(true);
      }
      
      // console.log('[TasksPage] Data synchronized with useDataStore:', {
      //   tasksCount: tasks.length,
      //   clientsCount: clients.length,
      //   usersCount: users.length,
      //   isInitialLoadComplete
      // });
    }
  }, [tasks, clients, users, isInitialLoadComplete]);

  // Event handlers - TODOS MEMOIZADOS
  // Nota: handleNotificationClick está comentado ya que no se usa actualmente
  // const handleNotificationClick = useCallback((notification: Notification & { action?: string }) => {
  //   // ... implementación comentada
  // }, [tasks, clients, users]);

  const handleContainerChange = useCallback((newContainer: Container) => {
    
    // Si estamos en CreateTask o EditTask, verificar cambios no guardados
    if (isCreateTaskOpen || isEditTaskOpen) {
      if (hasUnsavedChanges) {
        // Si hay cambios no guardados, almacenar el container pendiente y abrir el popup de confirmación
        const { openConfirmExitPopup, setPendingContainer } = useTasksPageStore.getState();
        setPendingContainer(newContainer);
        openConfirmExitPopup();
      } else {
        // Si no hay cambios no guardados, cerrar el modal y cambiar container
        const { closeCreateTask, closeEditTask, setContainer } = useTasksPageStore.getState();
        
        // Cerrar el modal correspondiente
        if (isCreateTaskOpen) {
          closeCreateTask();
        } else if (isEditTaskOpen) {
          closeEditTask();
        }
        
        // Cambiar el container después de cerrar el modal
        setContainer(newContainer);
      }
    } else {
      // Comportamiento normal cuando no estamos en modales
      const { setContainer } = useTasksPageStore.getState();
      setContainer(newContainer);
    }
  }, [isCreateTaskOpen, isEditTaskOpen, hasUnsavedChanges]);

  const handleSelectorContainerChange = useCallback((c: SelectorContainer) => {
    handleContainerChange(c);
  }, [handleContainerChange]);

  const handleCreateTaskToggle = useCallback(() => {
    if (hasUnsavedChanges) {
      const { openConfirmExitPopup } = useTasksPageStore.getState();
      openConfirmExitPopup();
    } else {
      const { closeCreateTask } = useTasksPageStore.getState();
      closeCreateTask();
    }
  }, [hasUnsavedChanges]);

  const handleCreateTaskHasUnsavedChanges = useCallback((hasChanges: boolean) => {
    const { setHasUnsavedChanges } = useTasksPageStore.getState();
    setHasUnsavedChanges(hasChanges);
  }, []);

  const handleCreateTaskCreateClientOpen = useCallback(() => {
    const { setClientSidebarData, setIsClientSidebarOpen } = useTasksPageStore.getState();
    setClientSidebarData({ isEdit: false });
    setIsClientSidebarOpen(true);
  }, []);

  const handleCreateTaskEditClientOpen = useCallback((client: Client) => {
    const { setClientSidebarData, setIsClientSidebarOpen } = useTasksPageStore.getState();
    setClientSidebarData({
      client: {
        ...client,
        projectCount: client.projects?.length || 0,
        createdAt: 'createdAt' in client ? (client as { createdAt?: string }).createdAt || new Date().toISOString() : new Date().toISOString(),
      },
      isEdit: true,
    });
    setIsClientSidebarOpen(true);
  }, []);

  const handleCreateTaskCreated = useCallback(() => {
    const { closeCreateTask } = useTasksPageStore.getState();
    closeCreateTask();
  }, []);

  const handleEditTaskToggle = useCallback(() => {
    if (hasUnsavedChanges) {
      const { openConfirmExitPopup } = useTasksPageStore.getState();
      openConfirmExitPopup();
    } else {
      const { closeEditTask } = useTasksPageStore.getState();
      closeEditTask();
    }
  }, [hasUnsavedChanges]);

  const handleEditTaskHasUnsavedChanges = useCallback((hasChanges: boolean) => {
    const { setHasUnsavedChanges } = useTasksPageStore.getState();
    setHasUnsavedChanges(hasChanges);
  }, []);

  const handleEditTaskCreateClientOpen = useCallback(() => {
    const { setClientSidebarData, setIsClientSidebarOpen } = useTasksPageStore.getState();
    setClientSidebarData({ isEdit: false });
    setIsClientSidebarOpen(true);
  }, []);

  const handleEditTaskEditClientOpen = useCallback((client: Client) => {
    const { setClientSidebarData, setIsClientSidebarOpen } = useTasksPageStore.getState();
    setClientSidebarData({
      client: {
        ...client,
        projectCount: client.projects?.length || 0,
        createdAt: 'createdAt' in client ? (client as { createdAt?: string }).createdAt || new Date().toISOString() : new Date().toISOString(),
      },
      isEdit: true,
    });
    setIsClientSidebarOpen(true);
  }, []);


  // Callbacks para TasksTable - MEMOIZADOS SIN DEPENDENCIAS
  const handleNewTaskOpen = useCallback(() => {
    const { openCreateTask } = useTasksPageStore.getState();
    openCreateTask();
  }, []);

  const handleNewClientOpen = useCallback(() => {
    // Abrir el modal de crear cliente
    const { setClientSidebarData, setIsClientSidebarOpen } = useTasksPageStore.getState();
    setClientSidebarData({ isEdit: false });
    setIsClientSidebarOpen(true);
  }, []);

  // Callbacks para TasksKanban - MEMOIZADOS SIN DEPENDENCIAS
  const handleTasksKanbanEditTask = useCallback((taskId: string) => {
    const { openEditTask } = useTasksPageStore.getState();
    openEditTask(taskId);
  }, []);

  const handleTasksKanbanDeleteTask = useCallback((taskId: string) => {
    const { openDeletePopup } = useTasksPageStore.getState();
    openDeletePopup('task', taskId);
  }, []);

  const handleTasksKanbanArchiveTableOpen = useCallback(() => {
    const { openArchiveTable } = useTasksPageStore.getState();
    openArchiveTable();
  }, []);

  const handleTasksKanbanViewChange = useCallback((view: TaskView) => {
    const { setTaskView } = useTasksPageStore.getState();
    setTaskView(view);
  }, []);

  // Callbacks para ArchiveTable - MEMOIZADOS SIN DEPENDENCIAS
  const handleArchiveTableEditTaskOpen = useCallback((taskId: string) => {
    const { openEditTask } = useTasksPageStore.getState();
    openEditTask(taskId);
  }, []);

  const handleArchiveTableViewChange = useCallback((view: TaskView) => {
    const { setTaskView, closeArchiveTable } = useTasksPageStore.getState();
    setTaskView(view);
    closeArchiveTable();
  }, []);

  const handleArchiveTableDeleteTaskOpen = useCallback((taskId: string) => {
    const { openDeletePopup } = useTasksPageStore.getState();
    openDeletePopup('task', taskId);
  }, []);

  const handleArchiveTableClose = useCallback(() => {
    const { closeArchiveTable } = useTasksPageStore.getState();
    closeArchiveTable();
  }, []);

  const handleArchiveTableTaskArchive = useCallback(async (task: unknown, action: 'archive' | 'unarchive') => {
    if (!user?.id) {
      debugError('[TasksPage] User not authenticated');
      return false;
    }
    
    // ✅ CORREGIDO: Permitir archivar/desarchivar a admins Y creadores de la tarea
    const taskData = task as Task;
    const isTaskCreator = taskData.CreatedBy === user.id;
    if (!isAdmin && !isTaskCreator) {
      debugError('[TasksPage] User not authorized to archive/unarchive this task:', {
        isAdmin,
        taskCreatedBy: taskData.CreatedBy,
        currentUserId: user.id
      });
      return false;
    }

    try {
      const taskData = task as Task;
      if (action === 'unarchive') {
        await unarchiveTask(taskData.id, user.id, isAdmin, taskData);
        debugLog('[TasksPage] Task unarchived successfully:', taskData.id);
      } else {
        await archiveTask(taskData.id, user.id, isAdmin, taskData);
        debugLog('[TasksPage] Task archived successfully:', taskData.id);
      }
      return true;
    } catch (error) {
      debugError('[TasksPage] Error archiving/unarchiving task:', error);
      return false;
    }
  }, [user?.id, isAdmin]);

  const handleArchiveTableDataRefresh = useCallback(() => {
    // TODO: Implement data refresh functionality
  }, []);

  const handleConfigPageClose = useCallback(() => {
    handleContainerChange('tareas');
  }, [handleContainerChange]);

  const handleLoaderAnimationComplete = useCallback(() => {
    // Loader animation completed
  }, []);

  const handleShowSuccessAlert = useCallback((message: string) => {
    const { showSuccess } = useTasksPageStore.getState();
    showSuccess(message);
  }, []);

  const handleShowFailAlert = useCallback((message: string) => {
    const { showFail } = useTasksPageStore.getState();
    showFail(message);
  }, []);

  const handleEditTaskClientAlertChange = useCallback((alert: { type: 'success' | 'fail'; message?: string; error?: string }) => {
    if (alert && alert.type === 'success') {
      handleShowSuccessAlert(alert.message || '');
    } else if (alert && alert.type === 'fail') {
      handleShowFailAlert(alert.error || alert.message || '');
    }
  }, [handleShowSuccessAlert, handleShowFailAlert]);

  // Get hasUnsavedChanges from store to use in useCallback
  // const hasUnsavedChanges = useTasksPageStore(state => state.hasUnsavedChanges);
  
  // const handleCreateTaskToggle = useCallback(() => {
  //   console.log('[TasksPage] handleCreateTaskToggle called');
  //   if (hasUnsavedChanges) {
  //     // Show confirmation dialog
  //     if (window.confirm('Hay cambios sin guardar. ¿Deseas continuar?')) {
  //       const { closeCreateTask, setHasUnsavedChanges } = useTasksPageStore.getState();
  //       closeCreateTask();
  //       setHasUnsavedChanges(false);
  //     }
  //   } else {
  //     const { closeCreateTask } = useTasksPageStore.getState();
  //     closeCreateTask();
  //   }
  // }, [hasUnsavedChanges]);



  // const handleClientAlertChange = useCallback((alert: { type: 'success' | 'fail'; message?: string; error?: string; }) => {
  //   console.log('[TasksPage] handleClientAlertChange called', alert);
  //   if (alert.type === 'success') {
  //     handleShowSuccessAlert(alert.message || '');
  //   } else {
  //     handleShowFailAlert(alert.error || alert.message || '');
  //   }
  // }, [handleShowSuccessAlert, handleShowFailAlert]);

  // const handleConfirmExit = useCallback(() => {
  //   console.log('[TasksPage] handleConfirmExit called');
  //   const { setIsConfirmExitOpen, closeCreateTask, setHasUnsavedChanges } = useTasksPageStore.getState();
  //   setIsConfirmExitOpen(false);
  //   closeCreateTask();
  //   setHasUnsavedChanges(false);
  // }, []);

  // const handleCancelExit = useCallback(() => {
  //   console.log('[TasksPage] handleCancelExit called');
  //   const { setIsConfirmExitOpen } = useTasksPageStore.getState();
  //   setIsConfirmExitOpen(false);
  // }, []);

  // const handleClientSidebarClose = useCallback(() => {
  //   console.log('[TasksPage] handleClientSidebarClose called');
  //   const { setIsClientSidebarOpen, setClientSidebarData } = useTasksPageStore.getState();
  //   setIsClientSidebarOpen(false);
  //   setClientSidebarData(null);
  // }, []);

  // const handleClientSubmit = useCallback(async (form: { id?: string; name: string; imageFile: File; imagePreview: string; projects: string[] }) => {
  //   console.log('[TasksPage] handleClientSubmit called', form);
  //   if (!user?.id) return;
    
  //   const { setIsClientLoading, clientSidebarData } = useTasksPageStore.getState();
  //   setIsClientLoading(true);

  //   try {
  //     // Upload image to storage
  //     const imageUrl = form.imagePreview; // TODO: Implement image upload

  //     const clientData: Client = {
  //       id: form.id || '',
  //       name: form.name,
  //       imageUrl,
  //       projectCount: form.projects.length,
  //       projects: form.projects,
  //       createdBy: user.id,
  //       createdAt: new Date().toISOString(),
  //     };

  //     if (clientSidebarData?.isEdit && form.id) {
  //       // Update client
  //       const clientRef = doc(db, 'clients', form.id);
  //       await updateDoc(clientRef, {
  //         ...clientData,
  //         lastActivity: new Date().toISOString(),
  //       });
  //     } else {
  //       // Create client
  //       const clientRef = collection(db, 'clients');
  //       await addDoc(clientRef, clientData);
  //     }

  //     handleClientSidebarClose();
  //     handleShowSuccessAlert('Cliente guardado exitosamente');
  //   } catch (error) {
  //     console.error('[TasksPage] Error saving client:', error);
  //     handleShowFailAlert('Error al guardar el cliente');
  //   } finally {
  //     setIsClientLoading(false);
  //   }
  // }, [user?.id, handleClientSidebarClose, handleShowSuccessAlert, handleShowFailAlert]);

  // Renderizar el contenido principal
  const mainContent = (
    <div className={styles.container}>
      <OptimizedMarquee />

      <div ref={headerRef}>
        <Header
          selectedContainer={selectedContainer}
          isArchiveTableOpen={isArchiveTableOpen}
          onChangeContainer={handleContainerChange}
          isCreateTaskOpen={isCreateTaskOpen}
          isEditTaskOpen={isEditTaskOpen}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      </div>
    
      <div ref={contentRef} className={styles.content} style={{ position: 'relative' }}>
          {container !== 'tareas' && (
            <GoBackButton onClick={() => handleContainerChange('tareas')} />
          )}
          {/* Renderizar CreateTask, EditTask, y ArchiveTable como contenedores principales */}
          {isCreateTaskOpen ? (
            <SimplifiedCreateTaskForm
              isOpen={isCreateTaskOpen}
              onOpenChange={handleCreateTaskToggle}
              onTaskCreated={handleCreateTaskCreated}
            />
            // <CreateTask
            //   isOpen={isCreateTaskOpen}
            //   onToggle={handleCreateTaskToggle}
            //   onHasUnsavedChanges={handleCreateTaskHasUnsavedChanges}
            //   onCreateClientOpen={handleCreateTaskCreateClientOpen}
            //   onEditClientOpen={handleCreateTaskEditClientOpen}
            //   onTaskCreated={handleCreateTaskCreated}
            //   onShowSuccessAlert={handleShowSuccessAlert}
            //   onShowFailAlert={handleShowFailAlert}
            // />
          ) : isEditTaskOpen && editTaskId ? (
            <EditTask
              isOpen={isEditTaskOpen}
              onToggle={handleEditTaskToggle}
              taskId={editTaskId}
              onHasUnsavedChanges={handleEditTaskHasUnsavedChanges}
              onCreateClientOpen={handleEditTaskCreateClientOpen}
              onEditClientOpen={handleEditTaskEditClientOpen}
              onClientAlertChange={handleEditTaskClientAlertChange}
              onShowSuccessAlert={handleShowSuccessAlert}
              onShowFailAlert={handleShowFailAlert}
            />
          ) : isArchiveTableOpen ? (
            <ArchiveTable
              // Pasa los handlers necesarios conectados al store
              onEditTaskOpen={handleArchiveTableEditTaskOpen}
              onViewChange={handleArchiveTableViewChange}
              onDeleteTaskOpen={handleArchiveTableDeleteTaskOpen}
              onClose={handleArchiveTableClose}
              onTaskArchive={handleArchiveTableTaskArchive}
              onDataRefresh={handleArchiveTableDataRefresh}
            />
          ) : selectedContainer === 'tareas' ? (
            <>
              {taskView === 'table' ? (
                <TasksTableRenderer />
              ) : (
                <TasksKanban
                  onNewTaskOpen={handleNewTaskOpen}
                  onNewClientOpen={handleNewClientOpen}
                  onEditTaskOpen={handleTasksKanbanEditTask}
                  onViewChange={handleTasksKanbanViewChange}
                  onDeleteTaskOpen={handleTasksKanbanDeleteTask}
                  onArchiveTableOpen={handleTasksKanbanArchiveTableOpen}
                />
              )}
            </>
          ) : null}

          {selectedContainer === 'config' && (
            <ConfigPage userId={user?.id || ''} onClose={handleConfigPageClose}
              onShowSuccessAlert={handleShowSuccessAlert}
              onShowFailAlert={handleShowFailAlert}
            />
          )}
        </div>
      <Footer />
      
    </div>
  );

  return (
    <>
      {/*
        LOADER DESACTIVADO - Nueva arquitectura con cache hace la app instantánea
        Se mantiene el código para poder reactivarlo si es necesario
        Para reactivar: cambiar isVisible={false} por isVisible={showLoader}
      */}
      <Loader
        isFullPage={true}
        message="Cargando datos de la aplicación..."
        loadingProgress={loadingProgress}
        isVisible={false}  // ← DESACTIVADO: Cache hace la app instantánea
        onAnimationComplete={handleLoaderAnimationComplete}
      />

      {/* Contenido principal - Ahora se muestra siempre (skeleton loaders manejan la carga) */}
      {mainContent}

      {/* Modales y popups */}
      <TasksPageModals />
    </>
  );
}

// Componente independiente para ChatSidebar

const IndependentChatSidebarRenderer = () => {
  const { isOpen, sidebarType, chatSidebar, closeChatSidebar } = useSidebarStateStore();
  const users = useDataStore.getState().users;
  
  if (!isOpen || sidebarType !== 'chat' || !chatSidebar.task) {
    return null;
  }

          return (
            <ChatSidebar
      key="chat-sidebar"
              isOpen={true}
      onClose={closeChatSidebar}
      users={users}
    />
  );
};

export default function TasksPage() {
  return (
    <AuthProvider>
      <TasksPageContent />
      {/* Chat Sidebar independiente */}
      <IndependentChatSidebarRenderer />
      {/* Safari Firebase Auth Fix - Solo se ejecuta en Safari */}
      <PlatformCompatibility />
      {/* ProfileCard Modal - Renderizado a nivel de página */}
      <ProfileCardRenderer />
      
      {/* Safari Firebase Auth Fix - Solo se ejecuta en Safari */}
      <PlatformCompatibility />
    </AuthProvider>
  );
}

// Componente independiente para ProfileCard
const ProfileCardRenderer = () => {
  const isProfileCardOpen = useTasksPageStore(useShallow(state => state.isProfileCardOpen));
  const profileCardData = useTasksPageStore(useShallow(state => state.profileCardData));
  const closeProfileCard = useTasksPageStore(useShallow(state => state.closeProfileCard));
  
  // Función para cambiar contenedor usando el store
  const handleContainerChange = useCallback((newContainer: Container) => {
    const { setContainer } = useTasksPageStore.getState();
    setContainer(newContainer);
  }, []);

  const handleProfileCardContainerChange = useCallback((newContainer: Container) => {
    handleContainerChange(newContainer);
  }, [handleContainerChange]);

  if (!isProfileCardOpen || !profileCardData) {
    return null;
  }

  return (
    <ProfileCard
      isOpen={true}
      userId={profileCardData.userId}
      onClose={closeProfileCard}
      onChangeContainer={handleProfileCardContainerChange}
    />
  );
};