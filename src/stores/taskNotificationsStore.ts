import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { TaskNotification } from '@/hooks/useTaskNotificationsSingleton';

interface TaskNotificationsState {
  notifications: TaskNotification[];
  unreadByTask: { [taskId: string]: number };
  setNotifications: (notifs: TaskNotification[]) => void;
  updateUnreadCount: (taskId: string, count: number) => void;
  markTaskAsRead: (taskId: string) => void;
  getUnreadCount: (taskId: string) => number;
}

export const useTaskNotificationsStore = create<TaskNotificationsState>()((set, get) => ({
  notifications: [],
  unreadByTask: {},
  
  setNotifications: (notifs) => {
    const unreadMap: { [taskId: string]: number } = {};
    notifs.forEach(n => {
      if (!n.read && n.taskId) {
        unreadMap[n.taskId] = (unreadMap[n.taskId] || 0) + 1;
      }
    });
    set({ notifications: notifs, unreadByTask: unreadMap });
  },
  
  updateUnreadCount: (taskId, count) => set(state => ({
    unreadByTask: { ...state.unreadByTask, [taskId]: count }
  })),
  
  markTaskAsRead: (taskId) => set(state => {
    // Optimistic: Set count 0 local
    const updatedUnread = { ...state.unreadByTask, [taskId]: 0 };
    const updatedNotifs = state.notifications.map(n => 
      n.taskId === taskId ? { ...n, read: true } : n
    );
    return { unreadByTask: updatedUnread, notifications: updatedNotifs };
  }),
  
  getUnreadCount: (taskId) => {
    return get().unreadByTask[taskId] || 0;
  },
}));

// Hook para usar el store con selectores optimizados
export const useTaskNotificationsStoreOptimized = () => {
  return useTaskNotificationsStore(useShallow(state => ({
    notifications: state.notifications,
    unreadByTask: state.unreadByTask,
    setNotifications: state.setNotifications,
    updateUnreadCount: state.updateUnreadCount,
    markTaskAsRead: state.markTaskAsRead,
    getUnreadCount: state.getUnreadCount,
  })));
}; 