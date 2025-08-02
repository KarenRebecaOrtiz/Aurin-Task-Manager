import { create } from 'zustand';

// Types
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

interface TasksPageState {
  // Container and view state
  container: 'tareas' | 'cuentas' | 'miembros' | 'config';
  taskView: 'table' | 'kanban';
  
  // Modal states
  isEditTaskOpen: boolean;
  isCreateTaskOpen: boolean;
  isArchiveTableOpen: boolean;
  isDeletePopupOpen: boolean;
  isDeleteClientOpen: string | false;
  isConfirmExitOpen: boolean;
  isClientSidebarOpen: boolean;
  isClientLoading: boolean;
  
  // Data states
  editTaskId: string | null;
  deleteTarget: { type: string; id: string } | null;
  clientSidebarData: { client?: Client; isEdit?: boolean } | null;
  selectedProfileUser: User | null;
  
  // Form states
  hasUnsavedChanges: boolean;
  deleteConfirm: string;
  pendingContainer: 'tareas' | 'cuentas' | 'miembros' | 'config' | null;
  
  // Alert states
  showSuccessAlert: boolean;
  showFailAlert: boolean;
  successMessage: string;
  failMessage: string;
  
  // Loader states
  showLoader: boolean;
  contentReady: boolean;
  
  // ProfileCard Modal
  isProfileCardOpen: boolean;
  profileCardData: {
    userId: string;
    imageUrl: string;
  } | null;
  
  // Actions
  setContainer: (container: 'tareas' | 'cuentas' | 'miembros' | 'config') => void;
  setTaskView: (view: 'table' | 'kanban') => void;
  
  // Modal actions
  setIsEditTaskOpen: (open: boolean) => void;
  setIsCreateTaskOpen: (open: boolean) => void;
  setIsArchiveTableOpen: (open: boolean) => void;
  setIsDeletePopupOpen: (open: boolean) => void;
  setIsDeleteClientOpen: (open: string | false) => void;
  setIsConfirmExitOpen: (open: boolean) => void;
  setIsClientSidebarOpen: (open: boolean) => void;
  setIsClientLoading: (loading: boolean) => void;
  
  // Data actions
  setEditTaskId: (id: string | null) => void;
  setDeleteTarget: (target: { type: string; id: string } | null) => void;
  setClientSidebarData: (data: { client?: Client; isEdit?: boolean } | null) => void;
  setSelectedProfileUser: (user: User | null) => void;
  
  // Form actions
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setDeleteConfirm: (confirm: string) => void;
  setPendingContainer: (container: 'tareas' | 'cuentas' | 'miembros' | 'config' | null) => void;
  
  // Alert actions
  setShowSuccessAlert: (show: boolean) => void;
  setShowFailAlert: (show: boolean) => void;
  setSuccessMessage: (message: string) => void;
  setFailMessage: (message: string) => void;
  
  // Loader actions
  setShowLoader: (show: boolean) => void;
  setContentReady: (ready: boolean) => void;
  
  // ProfileCard Modal Actions
  openProfileCard: (userId: string, imageUrl: string) => void;
  closeProfileCard: () => void;
  
  // Convenience actions
  openEditTask: (taskId: string) => void;
  closeEditTask: () => void;
  openCreateTask: () => void;
  closeCreateTask: () => void;
  openArchiveTable: () => void;
  closeArchiveTable: () => void;
  openDeletePopup: (type: string, id: string) => void;
  closeDeletePopup: () => void;
  showSuccess: (message: string) => void;
  showFail: (message: string) => void;
  resetAlerts: () => void;
  openConfirmExitPopup: () => void;
  closeConfirmExitPopup: () => void;
}

export const useTasksPageStore = create<TasksPageState>((set, get) => ({
  // Initial state
  container: 'tareas',
  taskView: 'table',
  
  isEditTaskOpen: false,
  isCreateTaskOpen: false,
  isArchiveTableOpen: false,
  isDeletePopupOpen: false,
  isDeleteClientOpen: false,
  isConfirmExitOpen: false,
  isClientSidebarOpen: false,
  isClientLoading: false,
  
  editTaskId: null,
  deleteTarget: null,
  clientSidebarData: null,
  selectedProfileUser: null,
  
  hasUnsavedChanges: false,
  deleteConfirm: '',
  pendingContainer: null,
  
  showSuccessAlert: false,
  showFailAlert: false,
  successMessage: '',
  failMessage: '',
  
  showLoader: true,
  contentReady: false,
  
  // ProfileCard Modal
  isProfileCardOpen: false,
  profileCardData: null,
  
  // Actions
  setContainer: (container) => set({ container }),
  setTaskView: (view) => set({ taskView: view }),
  
  setIsEditTaskOpen: (open) => set({ isEditTaskOpen: open }),
  setIsCreateTaskOpen: (open) => set({ isCreateTaskOpen: open }),
  setIsArchiveTableOpen: (open) => set({ isArchiveTableOpen: open }),
  setIsDeletePopupOpen: (open) => set({ isDeletePopupOpen: open }),
  setIsDeleteClientOpen: (open) => set({ isDeleteClientOpen: open }),
  setIsConfirmExitOpen: (open) => set({ isConfirmExitOpen: open }),
  setIsClientSidebarOpen: (open) => set({ isClientSidebarOpen: open }),
  setIsClientLoading: (loading) => set({ isClientLoading: loading }),
  
  setEditTaskId: (id) => set({ editTaskId: id }),
  setDeleteTarget: (target) => set({ deleteTarget: target }),
  setClientSidebarData: (data) => set({ clientSidebarData: data }),
  setSelectedProfileUser: (user) => set({ selectedProfileUser: user }),
  
  setHasUnsavedChanges: (hasChanges) => set({ hasUnsavedChanges: hasChanges }),
  setDeleteConfirm: (confirm) => set({ deleteConfirm: confirm }),
  setPendingContainer: (container) => set({ pendingContainer: container }),
  
  setShowSuccessAlert: (show) => set({ showSuccessAlert: show }),
  setShowFailAlert: (show) => set({ showFailAlert: show }),
  setSuccessMessage: (message) => set({ successMessage: message }),
  setFailMessage: (message) => set({ failMessage: message }),
  
  setShowLoader: (show) => set({ showLoader: show }),
  setContentReady: (ready) => set({ contentReady: ready }),
  
  // ProfileCard Modal Actions
  openProfileCard: (userId, imageUrl) => {
    set({
      isProfileCardOpen: true,
      profileCardData: { userId, imageUrl }
    });
  },

  closeProfileCard: () => {
    set({
      isProfileCardOpen: false,
      profileCardData: null
    });
  },
  
  // Convenience actions
  openEditTask: (taskId) => set({ 
    editTaskId: taskId, 
    isEditTaskOpen: true 
  }),
  
  closeEditTask: () => set({ 
    editTaskId: null, 
    isEditTaskOpen: false 
  }),
  
  openCreateTask: () => set({ isCreateTaskOpen: true }),
  closeCreateTask: () => set({ isCreateTaskOpen: false }),
  
  openArchiveTable: () => set({ isArchiveTableOpen: true }),
  closeArchiveTable: () => set({ isArchiveTableOpen: false }),
  
  openDeletePopup: (type, id) => set({ 
    deleteTarget: { type, id }, 
    isDeletePopupOpen: true 
  }),
  
  closeDeletePopup: () => set({ 
    deleteTarget: null, 
    isDeletePopupOpen: false 
  }),
  
  showSuccess: (message) => {
    set({ 
      successMessage: message, 
      showSuccessAlert: true 
    });
    setTimeout(() => set({ showSuccessAlert: false }), 3000);
  },
  
  showFail: (message) => {
    set({ 
      failMessage: message, 
      showFailAlert: true 
    });
    setTimeout(() => set({ showFailAlert: false }), 3000);
  },
  
  resetAlerts: () => set({
    showSuccessAlert: false,
    showFailAlert: false,
    successMessage: '',
    failMessage: ''
  }),
  
  openConfirmExitPopup: () => set({ isConfirmExitOpen: true }),
  closeConfirmExitPopup: () => set({ isConfirmExitOpen: false })
}));

// Selectors for specific state slices
export const useTasksPageContainer = () => useTasksPageStore(
  (state) => ({ 
    container: state.container, 
    taskView: state.taskView 
  })
);

export const useTasksPageModals = () => useTasksPageStore(
  (state) => ({
    isEditTaskOpen: state.isEditTaskOpen,
    isCreateTaskOpen: state.isCreateTaskOpen,
    isArchiveTableOpen: state.isArchiveTableOpen,
    isDeletePopupOpen: state.isDeletePopupOpen,
    isDeleteClientOpen: state.isDeleteClientOpen,
    isConfirmExitOpen: state.isConfirmExitOpen,
    isClientSidebarOpen: state.isClientSidebarOpen,
    isClientLoading: state.isClientLoading
  })
);

export const useTasksPageData = () => useTasksPageStore(
  (state) => ({
    editTaskId: state.editTaskId,
    deleteTarget: state.deleteTarget,
    clientSidebarData: state.clientSidebarData,
    selectedProfileUser: state.selectedProfileUser
  })
);

export const useTasksPageForms = () => useTasksPageStore(
  (state) => ({
    hasUnsavedChanges: state.hasUnsavedChanges,
    deleteConfirm: state.deleteConfirm
  })
);

export const useTasksPageAlerts = () => useTasksPageStore(
  (state) => ({
    showSuccessAlert: state.showSuccessAlert,
    showFailAlert: state.showFailAlert,
    successMessage: state.successMessage,
    failMessage: state.failMessage
  })
);

export const useTasksPageLoader = () => useTasksPageStore(
  (state) => ({
    showLoader: state.showLoader,
    contentReady: state.contentReady
  })
); 