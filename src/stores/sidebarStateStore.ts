import { create } from 'zustand';

interface SidebarState {
  isOpen: boolean;
  sidebarType: 'chat' | 'message' | 'team' | null;
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
  // Estado específico para ChatSidebar (tareas)
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
      // Time tracking - New structured approach
      timeTracking?: {
        totalHours: number;
        totalMinutes: number;
        lastLogDate: string | null;
        memberHours?: { [userId: string]: number };
      };
      // Legacy time tracking fields (kept for backward compatibility)
      totalHours?: number;
      memberHours?: { [userId: string]: number };
    } | null;
    clientName: string | null;
  };
  // Estado específico para TeamChatSidebar (equipos)
  teamSidebar: {
    teamId: string | null;
    team: {
      id: string;
      name: string;
      description?: string;
      memberIds: string[];
      isPublic: boolean;
      gradientId: string;
      createdBy: string;
      createdAt: string;
      clientId: string;
    } | null;
    clientName: string | null;
  };
}

interface SidebarActions {
  // Acciones generales
  openSidebar: (type: 'chat' | 'message' | 'team', id: string) => void;
  closeSidebar: () => void;

  // Acciones específicas para MessageSidebar
  openMessageSidebar: (senderId: string, receiver: SidebarState['messageSidebar']['receiver'], conversationId: string) => void;
  closeMessageSidebar: () => void;

  // Acciones específicas para ChatSidebar (tareas)
  openChatSidebar: (task: SidebarState['chatSidebar']['task'], clientName: string) => void;
  closeChatSidebar: () => void;

  // Acciones específicas para TeamChatSidebar (equipos)
  openTeamSidebar: (team: SidebarState['teamSidebar']['team'], clientName: string) => void;
  closeTeamSidebar: () => void;

  // Getters
  getSidebarState: () => { isOpen: boolean; type: 'chat' | 'message' | 'team' | null; id: string | null };
  getMessageSidebarState: () => SidebarState['messageSidebar'];
  getChatSidebarState: () => SidebarState['chatSidebar'];
  getTeamSidebarState: () => SidebarState['teamSidebar'];
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
  teamSidebar: {
    teamId: null,
    team: null,
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
      set({
        isOpen: true,
        sidebarType: 'message',
        sidebarId: conversationId,
        messageSidebar: newMessageState,
      });
    } else {
      
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

  // Acciones específicas para TeamChatSidebar (equipos)
  openTeamSidebar: (team, clientName) => {
    const current = get();

    const shouldUpdate =
      current.sidebarType !== 'team' ||
      current.sidebarId !== team?.id ||
      !current.isOpen ||
      current.teamSidebar.teamId !== team?.id ||
      current.teamSidebar.clientName !== clientName;

    if (shouldUpdate) {
      set({
        isOpen: true,
        sidebarType: 'team',
        sidebarId: team?.id || null,
        teamSidebar: {
          teamId: team?.id || null,
          team,
          clientName,
        },
      });
    }
  },

  closeTeamSidebar: () => {
    const current = get();
    if (current.isOpen && current.sidebarType === 'team') {
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
        teamSidebar: {
          teamId: null,
          team: null,
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

  getTeamSidebarState: () => {
    return get().teamSidebar;
  },
})); 