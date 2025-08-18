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
    // ✅ OPTIMIZACIÓN: Evitar actualizaciones si los datos no cambiaron realmente
    const currentState = get();
    const currentNotifsString = JSON.stringify(currentState.notifications);
    const newNotifsString = JSON.stringify(notifs);
    
    if (currentNotifsString === newNotifsString) {
      return; // No actualizar si las notificaciones son idénticas
    }
    
    const unreadMap: { [taskId: string]: number } = {};
    notifs.forEach(n => {
      if (!n.read && n.taskId) {
        unreadMap[n.taskId] = (unreadMap[n.taskId] || 0) + 1;
      }
    });
    
    // ✅ OPTIMIZACIÓN: Solo actualizar si el mapa de no leídos cambió
    const currentUnreadString = JSON.stringify(currentState.unreadByTask);
    const newUnreadString = JSON.stringify(unreadMap);
    
    if (currentUnreadString === newUnreadString) {
      // Solo actualizar notificaciones si no leídos no cambiaron
      set({ notifications: notifs });
    } else {
      set({ notifications: notifs, unreadByTask: unreadMap });
    }
  },
  
  updateUnreadCount: (taskId, count) => set(state => {
    // ✅ OPTIMIZACIÓN: Solo actualizar si el conteo realmente cambió
    if (state.unreadByTask[taskId] === count) {
      return state; // No actualizar si el conteo es el mismo
    }
    
    return {
      unreadByTask: { ...state.unreadByTask, [taskId]: count }
    };
  }),
  
  markTaskAsRead: (taskId) => set(state => {
    // ✅ OPTIMIZACIÓN: Solo actualizar si la tarea no estaba ya marcada como leída
    if (state.unreadByTask[taskId] === 0) {
      return state; // No actualizar si ya estaba marcada como leída
    }
    
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