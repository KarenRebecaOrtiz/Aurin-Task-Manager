import { create } from 'zustand';

interface SidebarState {
  isOpen: boolean;
  sidebarType: 'chat' | 'message' | null;
  sidebarId: string | null;
  // Estado específico para MessageSidebar
  messageSidebar: {
senderId: string | null;
    receiver: {
      id: string;
      imageUrl: string;
      fullName: string;
      role: string;
    } | null;
    conversationId: string | null;
  };
  // Estado específico para ChatSidebar
  chatSidebar: {
    taskId: string | null;
    task: {
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
      CreatedBy?: string;
    } | null;
    clientName: string | null;
  };
}

interface SidebarActions {
  // Acciones generales
  openSidebar: (type: 'chat' | 'message', id: string) => void;
  closeSidebar: () => void;
  
  // Acciones específicas para MessageSidebar
  openMessageSidebar: (senderId: string, receiver: SidebarState['messageSidebar']['receiver'], conversationId: string) => void;
  closeMessageSidebar: () => void;
  
  // Acciones específicas para ChatSidebar
  openChatSidebar: (task: SidebarState['chatSidebar']['task'], clientName: string) => void;
  closeChatSidebar: () => void;
  
  // Getters
  getSidebarState: () => { isOpen: boolean; type: 'chat' | 'message' | null; id: string | null };
  getMessageSidebarState: () => SidebarState['messageSidebar'];
  getChatSidebarState: () => SidebarState['chatSidebar'];
}

type SidebarStateStore = SidebarState & SidebarActions;

export const useSidebarStateStore = create<SidebarStateStore>()((set, get) => ({
  // Estado inicial
  isOpen: false,
  sidebarType: null,
  sidebarId: null,
  messageSidebar: {
    senderId: null,
    receiver: null,
    conversationId: null,
  },
  chatSidebar: {
    taskId: null,
    task: null,
    clientName: null,
  },

  // Acciones generales
  openSidebar: (type, id) => {
    const current = get();
    // Solo actualizar si realmente cambió
    if (current.sidebarType !== type || current.sidebarId !== id || !current.isOpen) {
      set({
        isOpen: true,
        sidebarType: type,
        sidebarId: id,
      });
    }
  },

  closeSidebar: () => {
    const current = get();
    if (current.isOpen) {
      set({
        isOpen: false,
        sidebarType: null,
        sidebarId: null,
        messageSidebar: {
          senderId: null,
          receiver: null,
          conversationId: null,
        },
      });
    }
  },

  // Acciones específicas para MessageSidebar
  openMessageSidebar: (senderId, receiver, conversationId) => {
    const current = get();
    const newMessageState = { senderId, receiver, conversationId };
    
    // Solo actualizar si realmente cambió
    const messageStateChanged = 
      current.messageSidebar.senderId !== senderId ||
      current.messageSidebar.conversationId !== conversationId ||
      JSON.stringify(current.messageSidebar.receiver) !== JSON.stringify(receiver);

    if (current.sidebarType !== 'message' || current.sidebarId !== conversationId || !current.isOpen || messageStateChanged) {
      console.log('[SidebarStore] Updating MessageSidebar state', { senderId, conversationId, messageStateChanged });
      set({
        isOpen: true,
        sidebarType: 'message',
        sidebarId: conversationId,
        messageSidebar: newMessageState,
      });
    } else {
      console.log('[SidebarStore] MessageSidebar state unchanged, skipping update');
    }
  },

  closeMessageSidebar: () => {
    const current = get();
    if (current.isOpen && current.sidebarType === 'message') {
      set({
        isOpen: false,
        sidebarType: null,
        sidebarId: null,
        messageSidebar: {
          senderId: null,
          receiver: null,
          conversationId: null,
        },
        chatSidebar: {
          taskId: null,
          task: null,
          clientName: null,
        },
      });
    }
  },

  // Acciones específicas para ChatSidebar
  openChatSidebar: (task, clientName) => {
    // Debug logging disabled to reduce console spam
    const current = get();
    
    // Solo actualizar si realmente cambió
    const shouldUpdate = 
      current.sidebarType !== 'chat' || 
      current.sidebarId !== task?.id || 
      !current.isOpen ||
      current.chatSidebar.taskId !== task?.id ||
      current.chatSidebar.clientName !== clientName;

    if (shouldUpdate) {
      // Debug logging disabled to reduce console spam
      set({
        isOpen: true,
        sidebarType: 'chat',
        sidebarId: task?.id || null,
        chatSidebar: { 
          taskId: task?.id || null, 
          task, 
          clientName 
        },
      });
    } else {
      // Debug logging disabled to reduce console spam
    }
  },

  closeChatSidebar: () => {
    const current = get();
    if (current.isOpen && current.sidebarType === 'chat') {
      set({
        isOpen: false,
        sidebarType: null,
        sidebarId: null,
        messageSidebar: {
          senderId: null,
          receiver: null,
          conversationId: null,
        },
        chatSidebar: {
          taskId: null,
          task: null,
          clientName: null,
        },
      });
    }
  },

  // Getters
  getSidebarState: () => {
    const state = get();
    return {
      isOpen: state.isOpen,
      type: state.sidebarType,
      id: state.sidebarId,
    };
  },

  getMessageSidebarState: () => {
    return get().messageSidebar;
  },

  getChatSidebarState: () => {
    return get().chatSidebar;
  },
})); 