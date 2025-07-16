import { create } from 'zustand';

interface TasksTableActionsState {
  // Actions that TasksTable needs to trigger
  openNewTask: () => void;
  openEditTask: (taskId: string) => void;
  openDeleteTask: (taskId: string) => void;
  openArchiveTable: () => void;
  changeView: (view: 'table' | 'kanban') => void;
  openProfile: (user: { id: string; imageUrl: string }) => void;
  openMessageSidebar: (user: { id: string; imageUrl: string; fullName: string; role: string }) => void;
  openChatSidebar: (task: { id: string; clientId: string; project: string; name: string; description: string; status: string; priority: string; startDate: string | null; endDate: string | null; LeadedBy: string[]; AssignedTo: string[]; createdAt: string; CreatedBy?: string; lastActivity?: string; hasUnreadUpdates?: boolean; lastViewedBy?: { [userId: string]: string }; archived?: boolean; archivedAt?: string; archivedBy?: string }, clientName: string) => void;
  
  // Setter for the actual action handlers
  setActionHandlers: (handlers: {
    openNewTask: () => void;
    openEditTask: (taskId: string) => void;
    openDeleteTask: (taskId: string) => void;
    openArchiveTable: () => void;
    changeView: (view: 'table' | 'kanban') => void;
    openProfile: (user: { id: string; imageUrl: string }) => void;
    openMessageSidebar: (user: { id: string; imageUrl: string; fullName: string; role: string }) => void;
    openChatSidebar: (task: { id: string; clientId: string; project: string; name: string; description: string; status: string; priority: string; startDate: string | null; endDate: string | null; LeadedBy: string[]; AssignedTo: string[]; createdAt: string; CreatedBy?: string; lastActivity?: string; hasUnreadUpdates?: boolean; lastViewedBy?: { [userId: string]: string }; archived?: boolean; archivedAt?: string; archivedBy?: string }, clientName: string) => void;
  }) => void;
}

export const useTasksTableActionsStore = create<TasksTableActionsState>((set) => ({
  // Default no-op actions
  openNewTask: () => {},
  openEditTask: () => {},
  openDeleteTask: () => {},
  openArchiveTable: () => {},
  changeView: () => {},
  openProfile: () => {},
  openMessageSidebar: () => {},
  openChatSidebar: () => {},
  
  // Setter for action handlers
  setActionHandlers: (handlers) => {
    set(handlers);
  },
})); 